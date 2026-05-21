import type {
  RepoInfo,
  CommitActivity,
  ContributorStat,
  IssueStats,
} from "../types";
import {
  calculateCommitFrequency,
  calculateActiveContributors,
} from "../github/commits";

export type HealthSignals = {
  forkStarRatio: number;
  activeContributorsRatio: number;
  commitFrequency: number;
  issueResolutionRatio: number;
};

// ─── Ratio fork/star ─────────────────────────────────────────────────────────

export function calculateForkStarRatio(repo: RepoInfo): number {
  if (repo.stargazers_count === 0) return 0;
  const ratio = repo.forks_count / repo.stargazers_count;
  // Normalise : ratio de 0.1 (10%) = score parfait de 1
  return Math.min(1, ratio / 0.1);
}

// ─── Contributeurs actifs ────────────────────────────────────────────────────

export function calculateActiveContributorsRatio(
  stats: ContributorStat[]
): { ratio: number; active: number; total: number } {
  const { active, total } = calculateActiveContributors(stats);

  if (total === 0) return { ratio: 0, active: 0, total: 0 };

  return {
    ratio: active / total,
    active,
    total,
  };
}

// ─── Issue resolution ────────────────────────────────────────────────────────

export function calculateIssueResolutionRatio(issues: IssueStats): number {
  const total = issues.open + issues.closed;
  if (total === 0) return 1; // Pas d'issues = neutre, on ne pénalise pas

  return issues.closed / total;
}

// ─── Score dimension santé ───────────────────────────────────────────────────

export function scoreHealth(
  repo: RepoInfo,
  commitActivity: CommitActivity[],
  contributorStats: ContributorStat[],
  issueStats: IssueStats
): { score: number; signals: HealthSignals } {
  const forkStarRatio = calculateForkStarRatio(repo);

  const { ratio: activeContributorsRatio } =
    calculateActiveContributorsRatio(contributorStats);

  const commitFrequency = calculateCommitFrequency(commitActivity);

  const issueResolutionRatio = calculateIssueResolutionRatio(issueStats);

  // Normalisation commitFrequency : 10 commits/semaine = score max
  const commitFrequencyNormalized = Math.min(1, commitFrequency / 10);

  // Poids — tous les signaux contribuent positivement à la santé
  const weights = {
    forkStar: 0.25,
    activeContributors: 0.25,
    commitFrequency: 0.30,
    issueResolution: 0.20,
  };

  const healthScore =
    forkStarRatio * weights.forkStar +
    activeContributorsRatio * weights.activeContributors +
    commitFrequencyNormalized * weights.commitFrequency +
    issueResolutionRatio * weights.issueResolution;

  const score = Math.round(Math.max(0, Math.min(100, healthScore * 100)));

  return {
    score,
    signals: {
      forkStarRatio,
      activeContributorsRatio,
      commitFrequency,
      issueResolutionRatio,
    },
  };
}
