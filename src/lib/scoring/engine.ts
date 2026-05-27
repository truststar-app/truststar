import type {
  TrustScore,
  TrustLabel,
  GitHubUserDetail,
  RepoInfo,
  IssueStats,
} from "../types";

import { scoreAccounts } from "./accounts";
import { scoreTemporal } from "./temporal";
import { scoreHealth } from "./health";
import { scoreAuthenticity, type AuthenticitySignals } from "./authenticity";

// ─── Weighting of the 4 dimensions ───────────────────────────────────────────

const DIMENSION_WEIGHTS = {
  accounts: 0.2625,
  temporal: 0.225,
  health: 0.2625,
  authenticity: 0.25,
};

// ─── Label thresholds ────────────────────────────────────────────────────────

function resolveLabel(
  score: number,
  authenticityScore: number,
  stars: number,
  repoCreatedAt: string
): TrustLabel {
  const ageInDays = (Date.now() - new Date(repoCreatedAt).getTime()) / (1000 * 60 * 60 * 24);
  if (stars < 50) return "NEW";
  if (stars < 200 && ageInDays < 90) return "NEW";
  if (score < 30) return "DANGEROUS";
  if (score < 50 && authenticityScore < 50) return "SUSPICIOUS";
  if (score >= 70 && authenticityScore >= 60) return "SAFE";
  return "CAUTION";
}

// ─── Main engine ─────────────────────────────────────────────────────────────

export type EngineInput = {
  owner: string;
  repo: string;
  users: GitHubUserDetail[];
  starredMap: Map<string, string[]>;
  repoInfo: RepoInfo;
  recentCommitData: { commitsPerWeek: number; activeContributorsRatio: number };
  issueStats: IssueStats;
  authenticitySignals?: AuthenticitySignals;
  burstMonth?: string | null;
  samplingMethod?: "stratified" | "default";
  burstGroupSize?: number;
  baselineGroupSize?: number;
};

export function computeTrustScore(input: EngineInput): TrustScore {
  const {
    owner,
    repo,
    users,
    starredMap,
    repoInfo,
    recentCommitData,
    issueStats,
    authenticitySignals,
    burstMonth,
    samplingMethod,
    burstGroupSize,
    baselineGroupSize,
  } = input;

  // ── Compute the 4 dimensions ─────────────────────────────────────────────

  // Account Quality: when a burst month is identified, score only the burst group.
  // Burst users are first in the array (stratified sampling output), so we
  // directly measure the suspicious period instead of averaging with clean baseline.
  let accountsResult = scoreAccounts(users, starredMap);
  if (burstMonth) {
    const burstUsers = users.filter((u) => u.starred_at.startsWith(burstMonth));
    if (burstUsers.length >= 10) {
      accountsResult = scoreAccounts(burstUsers, starredMap);
    }
  }
  const temporalResult = scoreTemporal(users, {
    totalStars: repoInfo.stargazers_count,
    createdAt: repoInfo.created_at,
  });
  const healthResult = scoreHealth(repoInfo, recentCommitData, issueStats);

  const authSignals: AuthenticitySignals = authenticitySignals ?? {
    lowActivityRatio: 0,
    coordLockstepScore: 0,
    burstLowActivityRatio: 0,
  };
  const authenticityScore = scoreAuthenticity(authSignals);

  // ── Weighted final score ─────────────────────────────────────────────────

  const rawScore =
    accountsResult.score * DIMENSION_WEIGHTS.accounts +
    temporalResult.score * DIMENSION_WEIGHTS.temporal +
    healthResult.score * DIMENSION_WEIGHTS.health +
    authenticityScore * DIMENSION_WEIGHTS.authenticity;

  const finalScore = Math.round(Math.max(0, Math.min(100, rawScore)));
  const label = resolveLabel(
    finalScore,
    authenticityScore,
    repoInfo.stargazers_count,
    repoInfo.created_at
  );

  // ── Assemble the report ──────────────────────────────────────────────────

  const result: TrustScore = {
    repo,
    owner,
    score: finalScore,
    label,
    dimensions: {
      accounts: accountsResult.score,
      temporal: temporalResult.score,
      health: healthResult.score,
      authenticity: authenticityScore,
    },
    signals: {
      // Dimension 1
      newAccountsRatio: accountsResult.signals.newAccountsRatio,
      noRepoRatio: accountsResult.signals.noRepoRatio,
      noFollowersRatio: accountsResult.signals.noFollowersRatio,
      noAvatarRatio: accountsResult.signals.noAvatarRatio,
      lockstepScore: accountsResult.signals.lockstepScore,
      // Dimension 2
      zScorePeak: temporalResult.signals.zScorePeak,
      velocityScore: temporalResult.signals.velocityScore,
      recentStarsRatio: temporalResult.signals.recentStarsRatio,
      // Dimension 3
      forkStarRatio: healthResult.signals.forkStarRatio,
      activeContributorsRatio: healthResult.signals.activeContributorsRatio,
      commitFrequency: healthResult.signals.commitFrequency,
      issueResolutionRatio: healthResult.signals.issueResolutionRatio,
      // Dimension 4
      lowActivityRatio: authSignals.lowActivityRatio,
      coordLockstepScore: authSignals.coordLockstepScore,
      burstLowActivityRatio: authSignals.burstLowActivityRatio,
    },
    analyzedAt: new Date().toISOString(),
    sampleSize: users.length,
    samplingMethod: samplingMethod ?? "default",
    burstMonthDetected: burstMonth ?? undefined,
    burstGroupSize: burstGroupSize ?? 0,
    baselineGroupSize: baselineGroupSize ?? users.length,
  };

  return result;
}
