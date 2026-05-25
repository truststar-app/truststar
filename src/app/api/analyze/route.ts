import { NextRequest, NextResponse } from "next/server";
import { fetchRepoInfo, fetchRecentCommitData } from "@/lib/github/commits";
import { fetchStargazersWithDetails, fetchLockstepData } from "@/lib/github/stargazers";
import { fetchIssueStats } from "@/lib/github/issues";
import { computeTrustScore } from "@/lib/scoring/engine";
import { getCached, setCached, trustScoreCache, CACHE_TTL_MS, cacheKey } from "@/lib/trust-score-cache";
import { addAudit } from "@/lib/recent-audits";
import type { TrustScore, ApiError } from "@/lib/types";

export const maxDuration = 30;

function parseGitHubUrl(input: string): { owner: string; repo: string } | null {
  // Accepts: https://github.com/owner/repo or owner/repo
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
  try {
    const body = await request.json() as { url?: string; owner?: string; repo?: string };

    let owner: string;
    let repo: string;

    // Resolve owner/repo from URL or direct fields
    if (body.url) {
      const parsed = parseGitHubUrl(body.url);
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

    // Cache check
    const cached = getCached(owner, repo);
    if (cached) return NextResponse.json(cached);

    // ── Parallel fetch of GitHub data ─────────────────────────────────────────

    const [repoInfo, recentCommitData, issueStats] =
      await Promise.all([
        fetchRepoInfo(owner, repo),
        fetchRecentCommitData(owner, repo),
        fetchIssueStats(owner, repo),
      ]);

    // ── Fetch stargazers (sequential, depends on total) ───────────────────────

    const users = await fetchStargazersWithDetails(
      owner,
      repo,
      repoInfo.stargazers_count
    );

    // ── Lockstep (reduced sample) ─────────────────────────────────────────────

    const starredMap = await fetchLockstepData(users, owner, repo);

    // ── Score calculation ─────────────────────────────────────────────────────

    const trustScore = computeTrustScore({
      owner,
      repo,
      users,
      starredMap,
      repoInfo,
      recentCommitData,
      issueStats,
    });

    setCached(owner, repo, trustScore);

    addAudit({
      id: crypto.randomUUID(),
      type: "trust-score",
      slug: `${owner}/${repo}`,
      score: trustScore.score,
      label: trustScore.label,
      analyzedAt: new Date().toISOString(),
    });

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

  // Cache check only for GET
  const cached = getCached(owner, repo);
  if (cached) return NextResponse.json(cached);

  return NextResponse.json(
    { error: "No cached result", details: "Run an analysis via POST first" },
    { status: 404 }
  );
}
