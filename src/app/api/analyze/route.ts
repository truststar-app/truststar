import { NextRequest, NextResponse } from "next/server";
import { runAnalysis } from "@/lib/run-analysis";
import { getCached } from "@/lib/trust-score-cache";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import type { TrustScore, ApiError } from "@/lib/types";

export const maxDuration = 60;

function parseGitHubUrl(input: string): { owner: string; repo: string } | null {
  const urlPattern = /github\.com\/([^/]+)\/([^/\s?#]+)/;
  const shortPattern = /^([^/]+)\/([^/\s]+)$/;

  const urlMatch = input.match(urlPattern);
  if (urlMatch) {
    return {
      owner: urlMatch[1],
      repo: urlMatch[2].replace(/\.git$/, ""),
    };
  }

  const shortMatch = input.trim().match(shortPattern);
  if (shortMatch) {
    return {
      owner: shortMatch[1],
      repo: shortMatch[2].replace(/\.git$/, ""),
    };
  }

  return null;
}

export async function POST(request: NextRequest): Promise<NextResponse<TrustScore | ApiError>> {
  if (!rateLimit(getClientIp(request), 30, 60_000)) {
    return NextResponse.json(
      { error: "Too many requests. Please try again in a minute." } as ApiError,
      { status: 429 }
    );
  }

  try {
    const body = await request.json() as { url?: string; repoUrl?: string; owner?: string; repo?: string; force?: boolean; weights?: { accounts?: number; temporal?: number; health?: number; authenticity?: number } };

    const rawCheck = body.url ?? body.repoUrl ?? "";
    if (rawCheck.length > 500) {
      return NextResponse.json({ error: "Input too long" } as ApiError, { status: 400 });
    }

    let owner: string;
    let repo: string;

    const rawUrl = body.url ?? body.repoUrl;
    if (rawUrl) {
      const parsed = parseGitHubUrl(rawUrl);
      if (!parsed) {
        return NextResponse.json(
          { error: "Invalid GitHub URL", details: "Expected format: https://github.com/owner/repo" },
          { status: 400 }
        );
      }
      owner = parsed.owner;
      repo = parsed.repo;
    } else if (body.owner && body.repo) {
      owner = body.owner;
      repo = body.repo;
    } else {
      return NextResponse.json(
        { error: "Missing parameters", details: "Provide a GitHub URL or owner + repo" },
        { status: 400 }
      );
    }

    const trustScore = await runAnalysis(owner, repo, { force: body.force, weights: body.weights });
    return NextResponse.json(trustScore);

  } catch (error) {
    console.error("Analysis error:", error);

    if (error instanceof Error) {
      if (error.name === "GitHubNotFoundError") {
        return NextResponse.json(
          { error: "Repository not found", details: "Check the GitHub URL" },
          { status: 404 }
        );
      }
      if (error.name === "GitHubRateLimitError") {
        return NextResponse.json(
          { error: "GitHub rate limit reached", details: "Please try again in a few minutes" },
          { status: 429 }
        );
      }
    }

    return NextResponse.json(
      { error: "Internal error", details: "Analysis failed" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest): Promise<NextResponse<TrustScore | ApiError>> {
  const { searchParams } = new URL(request.url);
  const owner = searchParams.get("owner");
  const repo = searchParams.get("repo");

  if (!owner || !repo) {
    return NextResponse.json(
      { error: "Parameters owner and repo are required" },
      { status: 400 }
    );
  }

  const cached = getCached(owner, repo);
  if (cached) return NextResponse.json(cached);

  return NextResponse.json(
    { error: "No cached result", details: "Run an analysis via POST first" },
    { status: 404 }
  );
}
