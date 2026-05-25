import type { GitHubUserDetail } from "../types";

// ─── Z-score on the star curve ───────────────────────────────────────────────

function buildDailyStarCurve(
  users: GitHubUserDetail[]
): Map<string, number> {
  const curve = new Map<string, number>();

  for (const user of users) {
    const day = user.starred_at.split("T")[0]; // "YYYY-MM-DD"
    curve.set(day, (curve.get(day) ?? 0) + 1);
  }

  return curve;
}

function calculateZScores(values: number[]): number[] {
  if (values.length === 0) return [];

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) return values.map(() => 0);

  return values.map((v) => (v - mean) / stdDev);
}

export function detectZScorePeak(users: GitHubUserDetail[]): number {
  const curve = buildDailyStarCurve(users);
  const counts = Array.from(curve.values());

  if (counts.length < 3) return 0;

  const zScores = calculateZScores(counts);
  const maxZ = Math.max(...zScores);

  return Math.max(0, maxZ);
}

// ─── Velocity anomaly ─────────────────────────────────────────────────────────
// Detects whether any day in the sample received 10x+ the repo's average rate.
// Returns 0 (normal) to 1 (peak is 10x the average).

export function calculateVelocityScore(
  users: GitHubUserDetail[],
  totalStars: number,
  createdAt: string
): number {
  if (users.length === 0) return 0;

  const ageInDays =
    (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24);
  if (ageInDays <= 0) return 0;

  const avgStarsPerDay = totalStars / ageInDays;
  if (avgStarsPerDay <= 0) return 0;

  const curve = buildDailyStarCurve(users);
  const counts = Array.from(curve.values());
  if (counts.length === 0) return 0;

  const maxDayCount = Math.max(...counts);
  // Normalize: 0 = at or below average, 1 = 10x the average or more
  return Math.min(1, Math.max(0, maxDayCount / (avgStarsPerDay * 10)));
}

// ─── Concentration in densest 48h window ─────────────────────────────────────
// Returns the fraction of the sample that falls within any 48-hour window.
// A repo with stars spread over years will have near-zero concentration.

export function calculateRecentStarsRatio(users: GitHubUserDetail[]): number {
  if (users.length < 2) return 0;

  const timestamps = users
    .map((u) => new Date(u.starred_at).getTime())
    .sort((a, b) => a - b);

  const windowMs = 48 * 60 * 60 * 1000;
  let maxInWindow = 0;

  for (let i = 0; i < timestamps.length; i++) {
    const windowEnd = timestamps[i] + windowMs;
    let j = i;
    while (j < timestamps.length && timestamps[j] <= windowEnd) j++;
    maxInWindow = Math.max(maxInWindow, j - i);
  }

  return maxInWindow / users.length;
}

// ─── Temporal dimension score ────────────────────────────────────────────────

export type TemporalSignals = {
  zScorePeak: number;
  velocityScore: number;
  recentStarsRatio: number;
};

export type RepoContext = {
  totalStars: number;
  createdAt: string;
};

export function scoreTemporal(
  users: GitHubUserDetail[],
  repoContext: RepoContext
): {
  score: number;
  signals: TemporalSignals;
} {
  if (users.length === 0) {
    return {
      score: 50,
      signals: { zScorePeak: 0, velocityScore: 0, recentStarsRatio: 0 },
    };
  }

  const zScorePeak = detectZScorePeak(users);
  const velocityScore = calculateVelocityScore(
    users,
    repoContext.totalStars,
    repoContext.createdAt
  );
  const recentStarsRatio = calculateRecentStarsRatio(users);

  // Each factor penalizes from 100 downward
  let score = 100;
  score -= velocityScore * 40;                      // max -40 if peak is 10x+ avg
  score -= recentStarsRatio * 35;                   // max -35 if all stars in 48h
  score -= Math.min(zScorePeak / 10, 1) * 25;      // max -25 if z-score > 10

  return {
    score: Math.max(0, Math.round(score)),
    signals: { zScorePeak, velocityScore, recentStarsRatio },
  };
}
