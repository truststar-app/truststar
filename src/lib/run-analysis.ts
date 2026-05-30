import { fetchRepoInfo, fetchRecentCommitData } from "@/lib/github/commits";
import { fetchStargazersWithDetails, fetchLockstepData, fetchAuthenticityData } from "@/lib/github/stargazers";
import { fetchIssueStats } from "@/lib/github/issues";
import { estimateLowActivityRatio } from "@/lib/scoring/authenticity";
import { scoreTemporal } from "@/lib/scoring/temporal";
import { computeTrustScore } from "@/lib/scoring/engine";
import { getCached, setCached } from "@/lib/trust-score-cache";
import { addAudit } from "@/lib/recent-audits";
import type { TrustScore } from "@/lib/types";

export type DimensionWeights = {
  accounts?: number;
  temporal?: number;
  health?: number;
  authenticity?: number;
};

export async function runAnalysis(
  owner: string,
  repo: string,
  options: { force?: boolean; weights?: DimensionWeights } = {}
): Promise<TrustScore> {
  if (!options.force) {
    const cached = getCached(owner, repo);
    if (cached) return cached;
  }

  const [repoInfo, recentCommitData, issueStats] = await Promise.all([
    fetchRepoInfo(owner, repo),
    fetchRecentCommitData(owner, repo),
    fetchIssueStats(owner, repo),
  ]);

  const { users, meta: samplingMeta } = await fetchStargazersWithDetails(
    owner,
    repo,
    repoInfo.stargazers_count
  );

  const starredMap = await fetchLockstepData(users, owner, repo);

  const simpleActivityRatio = estimateLowActivityRatio(users);
  const noPublicRepoEstimate =
    users.filter((u) => u.public_repos === 0).length / Math.max(users.length, 1);
  const prelimTemporal = scoreTemporal(users, {
    totalStars: repoInfo.stargazers_count,
    createdAt: repoInfo.created_at,
  });
  const shouldFetchEvents =
    simpleActivityRatio > 0.10 ||
    noPublicRepoEstimate > 0.25 ||
    prelimTemporal.signals.velocityScore > 0.3;

  const authenticitySignals = await fetchAuthenticityData(
    users,
    starredMap,
    shouldFetchEvents
  );

  const trustScore = computeTrustScore({
    owner,
    repo,
    users,
    starredMap,
    repoInfo,
    recentCommitData,
    issueStats,
    burstMonth: samplingMeta.burstMonth,
    samplingMethod: samplingMeta.method,
    burstGroupSize: samplingMeta.burstGroupSize,
    baselineGroupSize: samplingMeta.baselineGroupSize,
    authenticitySignals,
    weights: options.weights,
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

  return trustScore;
}
