import type {
  TrustScore,
  TrustLabel,
  GitHubUserDetail,
  RepoInfo,
  CommitActivity,
  ContributorStat,
  IssueStats,
} from "../types";

import { scoreAccounts } from "./accounts";
import { scoreTemporal } from "./temporal";
import { scoreHealth } from "./health";

// ─── Pondération des 3 dimensions ────────────────────────────────────────────

const DIMENSION_WEIGHTS = {
  accounts: 0.35,
  temporal: 0.30,
  health: 0.35,
};

// ─── Seuils labels ────────────────────────────────────────────────────────────

function resolveLabel(score: number): TrustLabel {
  if (score >= 70) return "SAFE";
  if (score >= 40) return "SUSPICIOUS";
  return "DANGEROUS";
}

// ─── Moteur principal ────────────────────────────────────────────────────────

export type EngineInput = {
  owner: string;
  repo: string;
  users: GitHubUserDetail[];
  starredMap: Map<string, string[]>;
  repoInfo: RepoInfo;
  commitActivity: CommitActivity[];
  contributorStats: ContributorStat[];
  issueStats: IssueStats;
};

export function computeTrustScore(input: EngineInput): TrustScore {
  const {
    owner,
    repo,
    users,
    starredMap,
    repoInfo,
    commitActivity,
    contributorStats,
    issueStats,
  } = input;

  // ── Calcul des 3 dimensions ──────────────────────────────────────────────

  const accountsResult = scoreAccounts(users, starredMap);
  const temporalResult = scoreTemporal(users);
  const healthResult = scoreHealth(
    repoInfo,
    commitActivity,
    contributorStats,
    issueStats
  );

  // ── Score final pondéré ──────────────────────────────────────────────────

  const rawScore =
    accountsResult.score * DIMENSION_WEIGHTS.accounts +
    temporalResult.score * DIMENSION_WEIGHTS.temporal +
    healthResult.score * DIMENSION_WEIGHTS.health;

  const finalScore = Math.round(Math.max(0, Math.min(100, rawScore)));
  const label = resolveLabel(finalScore);

  // ── Assemblage du rapport ────────────────────────────────────────────────

  const result: TrustScore = {
    repo,
    owner,
    score: finalScore,
    label,
    dimensions: {
      accounts: accountsResult.score,
      temporal: temporalResult.score,
      health: healthResult.score,
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
    },
    analyzedAt: new Date().toISOString(),
    sampleSize: users.length,
  };

  return result;
}
