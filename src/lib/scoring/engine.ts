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

// ─── Label overrides (post-processing) ───────────────────────────────────────
// Apply threshold-based overrides after weighted scoring.
// Rules can only increase severity (SAFE → CAUTION → SUSPICIOUS → DANGEROUS).
// NEW label is never overridden.

const LABEL_SEVERITY: Record<TrustLabel, number> = {
  NEW: -1,
  SAFE: 0,
  CAUTION: 1,
  SUSPICIOUS: 2,
  DANGEROUS: 3,
};

function pct(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

type OverrideSignals = {
  noFollowersRatio: number;
  lowActivityRatio: number;
  noRepoRatio: number;
  lockstepScore: number;
  ghostAccountsRatio: number;
  burstLowActivityRatio: number;
  forkStarRatio: number;
  stars: number;
};

function applyLabelOverrides(
  baseLabel: TrustLabel,
  score: number,
  s: OverrideSignals
): { label: TrustLabel; reason?: string } {
  if (baseLabel === "NEW") return { label: "NEW" };

  let label: TrustLabel = baseLabel;
  let reason: string | undefined;

  function escalate(target: TrustLabel, msg: string) {
    if (LABEL_SEVERITY[target] > LABEL_SEVERITY[label]) {
      label = target;
      reason = msg;
    }
  }

  // Rule 4: SAFE protection — score >= 70 is not enough without clean metrics
  if (label === "SAFE") {
    const failures: string[] = [];
    if (s.noFollowersRatio >= 0.35) failures.push(`${pct(s.noFollowersRatio)} of stargazers have no followers (threshold: 35%)`);
    if (s.lowActivityRatio >= 0.25) failures.push(`${pct(s.lowActivityRatio)} show low activity (threshold: 25%)`);
    if (s.noRepoRatio >= 0.20) failures.push(`${pct(s.noRepoRatio)} have no public repos (threshold: 20%)`);
    if (failures.length > 0) {
      label = "CAUTION";
      reason = `Label adjusted to CAUTION: ${failures[0]}`;
    }
  }

  // Rule 2: CAUTION minimum (at least 2 of 5 conditions)
  const r2Hits: string[] = [];
  if (s.noFollowersRatio > 0.40) r2Hits.push(`${pct(s.noFollowersRatio)} of stargazers have no followers (threshold: 40%)`);
  if (s.lowActivityRatio > 0.30) r2Hits.push(`${pct(s.lowActivityRatio)} show low activity (threshold: 30%)`);
  if (s.noRepoRatio > 0.20) r2Hits.push(`${pct(s.noRepoRatio)} have no public repos (threshold: 20%)`);
  if (s.burstLowActivityRatio > 0.15) r2Hits.push(`${pct(s.burstLowActivityRatio)} burst stars from low-activity accounts (threshold: 15%)`);
  if (s.forkStarRatio < 0.03 && s.stars > 10000) r2Hits.push(`fork/star ratio is ${s.forkStarRatio.toFixed(3)} with ${s.stars.toLocaleString()} stars`);
  if (r2Hits.length >= 2) {
    escalate("CAUTION", `Label adjusted to CAUTION: ${r2Hits[0]}`);
  }

  // Rule 1: SUSPICIOUS minimum (at least 2 of 4 conditions)
  const r1Hits: string[] = [];
  if (s.noFollowersRatio > 0.60) r1Hits.push(`${pct(s.noFollowersRatio)} of stargazers have no followers (threshold: 60%)`);
  if (s.lowActivityRatio > 0.45) r1Hits.push(`${pct(s.lowActivityRatio)} show low activity (threshold: 45%)`);
  if (s.noRepoRatio > 0.35) r1Hits.push(`${pct(s.noRepoRatio)} have no public repos (threshold: 35%)`);
  if (s.lockstepScore > 0.30) r1Hits.push(`lockstep score is ${pct(s.lockstepScore)} (threshold: 30%)`);
  if (r1Hits.length >= 2) {
    escalate("SUSPICIOUS", `Label adjusted to SUSPICIOUS: ${r1Hits[0]}`);
  }

  // Rule 3: DANGEROUS (at least 3 of 4 conditions — highest priority)
  const r3Hits: string[] = [];
  if (s.noFollowersRatio > 0.75) r3Hits.push(`${pct(s.noFollowersRatio)} of stargazers have no followers (threshold: 75%)`);
  if (s.lowActivityRatio > 0.55) r3Hits.push(`${pct(s.lowActivityRatio)} show low activity (threshold: 55%)`);
  if (s.noRepoRatio > 0.40) r3Hits.push(`${pct(s.noRepoRatio)} have no public repos (threshold: 40%)`);
  if (s.ghostAccountsRatio > 0.30) r3Hits.push(`${pct(s.ghostAccountsRatio)} are ghost accounts (threshold: 30%)`);
  if (r3Hits.length >= 3) {
    escalate("DANGEROUS", `Label adjusted to DANGEROUS: ${r3Hits[0]}`);
  }

  return { label, reason };
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
  weights?: { accounts?: number; temporal?: number; health?: number; authenticity?: number };
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

  const w = input.weights;
  const raw = {
    accounts:     (w?.accounts     ?? DIMENSION_WEIGHTS.accounts),
    temporal:     (w?.temporal     ?? DIMENSION_WEIGHTS.temporal),
    health:       (w?.health       ?? DIMENSION_WEIGHTS.health),
    authenticity: (w?.authenticity ?? DIMENSION_WEIGHTS.authenticity),
  };
  const total = raw.accounts + raw.temporal + raw.health + raw.authenticity;
  const wn = {
    accounts:     raw.accounts     / total,
    temporal:     raw.temporal     / total,
    health:       raw.health       / total,
    authenticity: raw.authenticity / total,
  };

  const rawScore =
    accountsResult.score * wn.accounts +
    temporalResult.score * wn.temporal +
    healthResult.score * wn.health +
    authenticityScore * wn.authenticity;

  const finalScore = Math.round(Math.max(0, Math.min(100, rawScore)));
  const baseLabel = resolveLabel(
    finalScore,
    authenticityScore,
    repoInfo.stargazers_count,
    repoInfo.created_at
  );
  const { label, reason: labelOverrideReason } = applyLabelOverrides(baseLabel, finalScore, {
    noFollowersRatio: accountsResult.signals.noFollowersRatio,
    lowActivityRatio: authSignals.lowActivityRatio,
    noRepoRatio: accountsResult.signals.noRepoRatio,
    lockstepScore: accountsResult.signals.lockstepScore,
    ghostAccountsRatio: accountsResult.signals.ghostAccountsRatio,
    burstLowActivityRatio: authSignals.burstLowActivityRatio,
    forkStarRatio: healthResult.signals.forkStarRatio,
    stars: repoInfo.stargazers_count,
  });

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
      ghostAccountsRatio: accountsResult.signals.ghostAccountsRatio,
    },
    labelOverrideReason,
    analyzedAt: new Date().toISOString(),
    sampleSize: users.length,
    samplingMethod: samplingMethod ?? "default",
    burstMonthDetected: burstMonth ?? undefined,
    burstGroupSize: burstGroupSize ?? 0,
    baselineGroupSize: baselineGroupSize ?? users.length,
  };

  return result;
}
