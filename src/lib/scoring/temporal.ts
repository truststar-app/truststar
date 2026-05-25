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

  return Math.max(0, maxZ); // Returns the max positive Z-score
}

// ─── Abnormal velocity ───────────────────────────────────────────────────────
// Detects whether many stars were given within less than 24h

export function calculateVelocityScore(users: GitHubUserDetail[]): number {
  if (users.length === 0) return 0;

  const curve = buildDailyStarCurve(users);
  const counts = Array.from(curve.values());

  if (counts.length === 0) return 0;

  const maxDayCount = Math.max(...counts);
  const totalInSample = users.length;

  // Ratio of the busiest day vs total sample
  const velocityRatio = maxDayCount / totalInSample;

  // If 50%+ of stars arrive in 1 day → very suspicious
  return Math.min(1, velocityRatio);
}

// ─── Recent stars ratio ───────────────────────────────────────────────────────
// Concentration of stars in the last quarter of the sample time window.
// Avoids false positives from comparing against Date.now() when we always
// sample the most recent stars.

export function calculateRecentStarsRatio(
  users: GitHubUserDetail[]
): number {
  if (users.length < 2) return 0;

  const timestamps = users
    .map((u) => new Date(u.starred_at).getTime())
    .sort((a, b) => a - b);

  const oldest = timestamps[0];
  const newest = timestamps[timestamps.length - 1];
  const spanMs = newest - oldest;

  // All stars within less than one hour = maximum concentration, suspicious
  if (spanMs < 60 * 60 * 1000) return 1;

  // Fraction of stars in the last quarter of the time window
  const lastQuarterStart = newest - spanMs * 0.25;
  const recentCount = timestamps.filter((t) => t >= lastQuarterStart).length;

  return recentCount / users.length;
}

// ─── Temporal dimension score ────────────────────────────────────────────────

export type TemporalSignals = {
  zScorePeak: number;
  velocityScore: number;
  recentStarsRatio: number;
};

export function scoreTemporal(users: GitHubUserDetail[]): {
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
  const velocityScore = calculateVelocityScore(users);
  const recentStarsRatio = calculateRecentStarsRatio(users);

  // Z-score normalization: Z > 3 = very suspicious, capped at 10
  const zScoreNormalized = Math.min(1, Math.max(0, (zScorePeak - 1) / 9));

  // Weights
  const weights = {
    zScore: 0.40,
    velocity: 0.35,
    recentStars: 0.25,
  };

  const suspicionScore =
    zScoreNormalized * weights.zScore +
    velocityScore * weights.velocity +
    recentStarsRatio * weights.recentStars;

  const score = Math.round(
    Math.max(0, Math.min(100, (1 - suspicionScore) * 100))
  );

  return {
    score,
    signals: { zScorePeak, velocityScore, recentStarsRatio },
  };
}
