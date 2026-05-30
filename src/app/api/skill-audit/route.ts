import { NextRequest, NextResponse } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { skillCache, SKILL_CACHE_TTL, getSkillResultCached } from "@/lib/skill-audit/pipeline";
import type { SkillSafetyScore } from "@/lib/skill-audit/types";
import { addAudit } from "@/lib/recent-audits";

// H-4: Only allow valid GitHub slug characters
const SLUG_RE = /^[a-zA-Z0-9._-]{1,100}$/;

function parseSlug(input: string): { owner: string; repo: string } | null {
  const urlMatch = input.match(/github\.com\/([^/]+)\/([^/\s?#]+)/);
  if (urlMatch) {
    return { owner: urlMatch[1], repo: urlMatch[2].replace(/\.git$/, "") };
  }
  const slugMatch = input.trim().match(/^([^/\s]+)\/([^/\s]+)$/);
  if (slugMatch) {
    return { owner: slugMatch[1], repo: slugMatch[2].replace(/\.git$/, "") };
  }
  return null;
}

function timeout(ms: number): Promise<never> {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Analysis timed out after ${ms}ms`)), ms)
  );
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<SkillSafetyScore | { error: string; details?: string }>> {
  if (!(await rateLimit(getClientIp(request), 30, 60_000))) {
    return NextResponse.json(
      { error: "Too many requests. Please try again in a minute." },
      { status: 429 }
    );
  }

  try {
    const body = (await request.json()) as {
      repoUrl?: string;
      slug?: string;
    };

    const rawInput = body.repoUrl ?? body.slug;
    if (!rawInput) {
      return NextResponse.json(
        { error: "Missing parameters", details: "Provide repoUrl or slug" },
        { status: 400 }
      );
    }

    // M-1: Guard input length before regex matching
    if (rawInput.length > 500) {
      return NextResponse.json({ error: "Input too long" }, { status: 400 });
    }

    const parsed = parseSlug(rawInput);
    if (!parsed) {
      return NextResponse.json(
        {
          error: "Invalid slug",
          details: "Expected format: owner/repo or https://github.com/owner/repo",
        },
        { status: 400 }
      );
    }

    const { owner, repo } = parsed;

    // H-4: Validate slug format
    if (!SLUG_RE.test(owner) || !SLUG_RE.test(repo)) {
      return NextResponse.json(
        { error: "Invalid owner or repo name" },
        { status: 400 }
      );
    }

    const cacheKey = `${owner}/${repo}`.toLowerCase();
    const cached = skillCache.get(cacheKey);
    if (cached && Date.now() - cached.cachedAt < SKILL_CACHE_TTL) {
      return NextResponse.json(cached.data);
    }

    const result = await Promise.race([
      getSkillResultCached(owner, repo),
      timeout(24000),
    ]);

    addAudit({
      id: crypto.randomUUID(),
      type: "skill-audit",
      slug: `${owner}/${repo}`,
      score: result.score,
      label: result.label,
      analyzedAt: new Date().toISOString(),
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Skill audit error:", error instanceof Error ? error.message : "unknown");

    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        return NextResponse.json(
          {
            error: "Repository not found",
            details: "Check the slug or GitHub URL",
          },
          { status: 404 }
        );
      }
      if (error.message.includes("rate limit")) {
        return NextResponse.json(
          {
            error: "GitHub rate limit reached",
            details: "Please try again in a few minutes",
          },
          { status: 429 }
        );
      }
      if (error.message.includes("timed out")) {
        return NextResponse.json(
          {
            error: "Timeout",
            details: "Analysis took too long. Please retry.",
          },
          { status: 504 }
        );
      }
    }

    return NextResponse.json(
      { error: "Internal error", details: "Analysis failed" },
      { status: 500 }
    );
  }
}
