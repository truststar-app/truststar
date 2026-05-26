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

// ─── Scoring helpers (return 0–100) ─────────────────────────────────────────

function forkRatioScore(forks: number, stars: number): number {
  if (stars === 0) return 50;
  const ratio = forks / stars;
  if (ratio >= 0.2) return 95;   // 1:5 or better — excellent
  if (ratio >= 0.1) return 85;   // 1:10 — very good
  if (ratio >= 0.05) return 70;  // 1:20 — good
  if (ratio >= 0.03) return 55;  // 1:33 — acceptable
  // < 3% forks: tiered by star count (utility libs have inherently low fork ratios)
  if (stars > 50000) return 30;  // large repo — suspect
  if (stars > 10000) return 40;  // mid-large — mildly suspect
  if (stars > 1000) return 50;   // utility lib range — neutral
  return 55;
}

function commitScore(commitsPerWeek: number, repoAgeDays: number): number {
  if (repoAgeDays < 30) return 50;
  if (commitsPerWeek >= 10) return 100;
  if (commitsPerWeek >= 3) return 85;
  if (commitsPerWeek >= 1) return 70;
  if (commitsPerWeek >= 0.5) return 55;
  if (commitsPerWeek >= 0.1) return 35;
  // Very low activity: raise floor — stable "done" libraries shouldn't score 10
  return 25;
}

// activeContributorsRatio comes in as Math.min(1, authorCount / 10)
// Map it back to a proper score per CLAUDE.md spec instead of using it raw (0-1)
function contributorScore(ratio: number): number {
  if (ratio >= 1.0) return 100; // 10+ contributors
  const count = Math.round(ratio * 10);
  if (count === 0) return 15;
  if (count === 1) return 40;
  if (count <= 4) return 65;
  return 85; // 5-9
}

function issueResolutionScore(closedIssues: number, totalIssues: number): number {
  if (totalIssues === 0) return 60;
  const rate = closedIssues / totalIssues;
  if (rate >= 0.8) return 95;
  if (rate >= 0.6) return 75;
  if (rate >= 0.4) return 55;
  if (rate >= 0.2) return 35;
  return 15;
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

  const repoAgeDays =
    (Date.now() - new Date(repo.created_at).getTime()) / (1000 * 60 * 60 * 24);

  const forkScore = forkRatioScore(repo.forks_count, repo.stargazers_count);
  const commitScoreVal = commitScore(commitsPerWeek, repoAgeDays);
  const issueScore = issueResolutionScore(
    issueStats.closed,
    issueStats.open + issueStats.closed
  );

  const weights = {
    forkStar: 0.25,
    activeContributors: 0.25,
    commitFrequency: 0.30,
    issueResolution: 0.20,
  };

  const healthScore =
    (forkScore / 100) * weights.forkStar +
    (contributorScore(activeContributorsRatio) / 100) * weights.activeContributors +
    (commitScoreVal / 100) * weights.commitFrequency +
    (issueScore / 100) * weights.issueResolution;

  const score = Math.round(Math.max(0, Math.min(100, healthScore * 100)));

  return {
    score,
    signals: {
      forkStarRatio,
      activeContributorsRatio,
      commitFrequency: commitsPerWeek,
      issueResolutionRatio,
    },
  };
}
