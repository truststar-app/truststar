import { NextRequest, NextResponse } from "next/server";
import { runAnalysis } from "@/lib/run-analysis";
import { getCached } from "@/lib/trust-score-cache";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import type { TrustScore, ApiError } from "@/lib/types";

export const maxDuration = 60;

// H-4: Only allow valid GitHub slug characters
const SLUG_RE = /^[a-zA-Z0-9._-]{1,100}$/;

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

// C-3: Validate weights — each dimension must be in [0, 1], sum must be > 0
function parseWeights(raw: unknown): { accounts?: number; temporal?: number; health?: number; authenticity?: number } | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const dims = ["accounts", "temporal", "health", "authenticity"] as const;
  const result: Record<string, number> = {};
  for (const dim of dims) {
    const val = (raw as Record<string, unknown>)[dim];
    if (val === undefined) continue;
    const n = Number(val);
    if (!isFinite(n) || n < 0 || n > 1) return undefined;
    result[dim] = n;
  }
  const sum = Object.values(result).reduce((a, b) => a + b, 0);
  if (Object.keys(result).length > 0 && sum === 0) return undefined;
  return result as { accounts?: number; temporal?: number; health?: number; authenticity?: number };
}

export async function POST(request: NextRequest): Promise<NextResponse<TrustScore | ApiError>> {
  const ip = getClientIp(request);

  // C-2: force:true gets a stricter limit (3/5min) to prevent cache-busting abuse
  const body = await request.json().catch(() => null) as {
    url?: string;
    repoUrl?: string;
    owner?: string;
    repo?: string;
    force?: boolean;
    weights?: unknown;
  } | null;

  if (!body) {
    return NextResponse.json({ error: "Invalid request body" } as ApiError, { status: 400 });
  }

  const isForce = body.force === true;
  const rateLimitKey = isForce ? `${ip}:force` : ip;
  const rateLimitMax = isForce ? 3 : 30;
  const rateLimitWindow = isForce ? 5 * 60_000 : 60_000;

  if (!(await rateLimit(rateLimitKey, rateLimitMax, rateLimitWindow))) {
    return NextResponse.json(
      { error: "Too many requests. Please try again in a minute." } as ApiError,
      { status: 429 }
    );
  }

  try {
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

    // H-4: Validate slug format
    if (!SLUG_RE.test(owner) || !SLUG_RE.test(repo)) {
      return NextResponse.json(
        { error: "Invalid owner or repo name" },
        { status: 400 }
      );
    }

    // C-3: Validate weights
    const weights = parseWeights(body.weights);
    if (body.weights !== undefined && body.weights !== null && weights === undefined) {
      return NextResponse.json(
        { error: "Invalid weights", details: "Each weight must be a number between 0 and 1, with sum > 0" },
        { status: 400 }
      );
    }

    const trustScore = await runAnalysis(owner, repo, { force: isForce, weights });
    return NextResponse.json(trustScore);

  } catch (error) {
    console.error("Analysis error:", error instanceof Error ? error.message : "unknown");

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
  // L-1: Rate-limit read endpoint too (probing defence)
  if (!(await rateLimit(getClientIp(request), 60, 60_000))) {
    return NextResponse.json({ error: "Too many requests" } as ApiError, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const owner = searchParams.get("owner");
  const repo = searchParams.get("repo");

  if (!owner || !repo) {
    return NextResponse.json(
      { error: "Parameters owner and repo are required" },
      { status: 400 }
    );
  }

  if (!SLUG_RE.test(owner) || !SLUG_RE.test(repo)) {
    return NextResponse.json({ error: "Invalid owner or repo name" }, { status: 400 });
  }

  const cached = getCached(owner, repo);
  if (cached) return NextResponse.json(cached);

  return NextResponse.json(
    { error: "No cached result", details: "Run an analysis via POST first" },
    { status: 404 }
  );
}
