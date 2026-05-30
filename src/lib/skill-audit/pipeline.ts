import { runAnalysis } from "@/lib/run-analysis";
import { fetchSkillData } from "@/lib/skill-audit/fetcher";
import { parseSkillMdOptional } from "@/lib/skill-audit/parser";
import { analyzeNetwork } from "@/lib/skill-audit/analyzers/network";
import { analyzeFilesystem } from "@/lib/skill-audit/analyzers/filesystem";
import { analyzeExecution } from "@/lib/skill-audit/analyzers/execution";
import { analyzeObfuscation } from "@/lib/skill-audit/analyzers/obfuscation";
import { analyzeDependencies } from "@/lib/skill-audit/analyzers/dependencies";
import { computeSkillSafetyScore } from "@/lib/skill-audit/engine";
import type { SkillSafetyScore } from "@/lib/skill-audit/types";

const MAX_CACHE_SIZE = 500;
export const skillCache = new Map<string, { data: SkillSafetyScore; cachedAt: number }>();
export const SKILL_CACHE_TTL = 10 * 60 * 1000;

async function fetchPopularityScore(owner: string, repo: string): Promise<number> {
  try {
    const result = await runAnalysis(owner, repo);
    return result.score ?? 50;
  } catch {
    return 50;
  }
}

export async function runSkillPipeline(owner: string, repo: string): Promise<SkillSafetyScore> {
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

  return computeSkillSafetyScore({
    slug: input,
    repoUrl: `https://github.com/${owner}/${repo}`,
    fetchedData,
    parsedSkillMd,
    allFindings,
    popularityScore,
  });
}

export async function getSkillResultCached(owner: string, repo: string): Promise<SkillSafetyScore> {
  const cacheKey = `${owner}/${repo}`.toLowerCase();
  const cached = skillCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < SKILL_CACHE_TTL) {
    return cached.data;
  }

  const result = await runSkillPipeline(owner, repo);

  if (skillCache.size >= MAX_CACHE_SIZE) {
    const oldest = skillCache.keys().next().value;
    if (oldest) skillCache.delete(oldest);
  }
  skillCache.set(cacheKey, { data: result, cachedAt: Date.now() });

  return result;
}
