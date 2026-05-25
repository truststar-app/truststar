import type { RepoInfo, IssueStats } from "../types";

export type HealthSignals = {
  forkStarRatio: number;
  activeContributorsRatio: number;
  commitFrequency: number;
  issueResolutionRatio: number;
};

// ─── Fork/star ratio (raw value) ─────────────────────────────────────────────

export function calculateForkStarRatio(repo: RepoInfo): number {
  if (repo.stargazers_count === 0) return 0;
  return repo.forks_count / repo.stargazers_count;
}

// ─── Issue resolution ────────────────────────────────────────────────────────

export function calculateIssueResolutionRatio(issues: IssueStats): number {
  const total = issues.open + issues.closed;
  if (total === 0) return 1;
  return issues.closed / total;
}

// ─── Health dimension score ──────────────────────────────────────────────────

export function scoreHealth(
  repo: RepoInfo,
  recentCommitData: { commitsPerWeek: number; activeContributorsRatio: number },
  issueStats: IssueStats
): { score: number; signals: HealthSignals } {
  const forkStarRatio = calculateForkStarRatio(repo);
  const { commitsPerWeek, activeContributorsRatio } = recentCommitData;
  const issueResolutionRatio = calculateIssueResolutionRatio(issueStats);

  // Normalize the fork/star ratio: 10%+ forks = max score
  const forkStarNormalized = Math.min(1, forkStarRatio / 0.1);

  // Normalize commits: 10 commits/wk = max score
  const commitFrequencyNormalized = Math.min(1, commitsPerWeek / 10);

  const weights = {
    forkStar: 0.25,
    activeContributors: 0.25,
    commitFrequency: 0.30,
    issueResolution: 0.20,
  };

  const healthScore =
    forkStarNormalized * weights.forkStar +
    activeContributorsRatio * weights.activeContributors +
    commitFrequencyNormalized * weights.commitFrequency +
    issueResolutionRatio * weights.issueResolution;

  const score = Math.round(Math.max(0, Math.min(100, healthScore * 100)));

  return {
    score,
    signals: {
      forkStarRatio,             // raw forks/stars ratio (e.g. 0.30 = 30%)
      activeContributorsRatio,   // min(1, unique_authors / 10)
      commitFrequency: commitsPerWeek,
      issueResolutionRatio,
    },
  };
}
