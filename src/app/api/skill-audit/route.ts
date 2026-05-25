import { NextRequest, NextResponse } from "next/server";
import { fetchSkillData } from "@/lib/skill-audit/fetcher";
import { parseSkillMdOptional } from "@/lib/skill-audit/parser";
import { analyzeNetwork } from "@/lib/skill-audit/analyzers/network";
import { analyzeFilesystem } from "@/lib/skill-audit/analyzers/filesystem";
import { analyzeExecution } from "@/lib/skill-audit/analyzers/execution";
import { analyzeObfuscation } from "@/lib/skill-audit/analyzers/obfuscation";
import { analyzeDependencies } from "@/lib/skill-audit/analyzers/dependencies";
import { computeSkillSafetyScore } from "@/lib/skill-audit/engine";
import type { SkillSafetyScore } from "@/lib/skill-audit/types";
import type { TrustScore } from "@/lib/types";
import { addAudit } from "@/lib/recent-audits";

const cache = new Map<string, { data: SkillSafetyScore; cachedAt: number }>();
const CACHE_TTL = 10 * 60 * 1000;

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

async function fetchPopularityScore(
  owner: string,
  repo: string
): Promise<number> {
  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
    const response = await fetch(`${baseUrl}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ owner, repo }),
    });
    if (!response.ok) return 50;
    const data = (await response.json()) as TrustScore;
    return data.score ?? 50;
  } catch {
    return 50;
  }
}

async function runPipeline(
  owner: string,
  repo: string
): Promise<SkillSafetyScore> {
  const input = `${owner}/${repo}`;
  const fetchedData = await fetchSkillData(input);

  const skillMdFile = fetchedData.files.find(
    (f) =>
      f.path.toUpperCase() === "SKILL.MD" ||
      f.path.toUpperCase().endsWith("/SKILL.MD")
  );

  const parsedSkillMd = parseSkillMdOptional(skillMdFile?.content ?? null);

  const [
    networkFindings,
    filesystemFindings,
    executionFindings,
    obfuscationFindings,
    dependencyFindings,
  ] = await Promise.all([
    Promise.resolve(analyzeNetwork(fetchedData.files)),
    Promise.resolve(analyzeFilesystem(fetchedData.files)),
    Promise.resolve(analyzeExecution(fetchedData.files)),
    Promise.resolve(analyzeObfuscation(fetchedData.files)),
    Promise.resolve(analyzeDependencies(fetchedData.files)),
  ]);

  const allFindings = [
    ...networkFindings,
    ...filesystemFindings,
    ...executionFindings,
    ...obfuscationFindings,
    ...dependencyFindings,
  ];

  const popularityScore = await fetchPopularityScore(owner, repo);

  const slug = `${owner}/${repo}`;
  return computeSkillSafetyScore({
    slug,
    repoUrl: `https://github.com/${owner}/${repo}`,
    fetchedData,
    parsedSkillMd,
    allFindings,
    popularityScore,
  });
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<SkillSafetyScore | { error: string; details?: string }>> {
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
    const cacheKey = `${owner}/${repo}`.toLowerCase();

    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL) {
      return NextResponse.json(cached.data);
    }

    const result = await Promise.race([
      runPipeline(owner, repo),
      timeout(24000),
    ]);

    cache.set(cacheKey, { data: result, cachedAt: Date.now() });

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
    console.error("Skill audit error:", error);

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
