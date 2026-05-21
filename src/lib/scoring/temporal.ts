import type { GitHubUserDetail } from "../types";

// ─── Z-score sur la courbe de stars ─────────────────────────────────────────

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

  return Math.max(0, maxZ); // Retourne le Z-score max positif
}

// ─── Vélocité anormale ───────────────────────────────────────────────────────
// Détecte si beaucoup de stars ont été données en moins de 24h

export function calculateVelocityScore(users: GitHubUserDetail[]): number {
  if (users.length === 0) return 0;

  const curve = buildDailyStarCurve(users);
  const counts = Array.from(curve.values());

  if (counts.length === 0) return 0;

  const maxDayCount = Math.max(...counts);
  const totalInSample = users.length;

  // Ratio du jour le plus chargé vs total de l'échantillon
  const velocityRatio = maxDayCount / totalInSample;

  // Si 50%+ des stars arrivent en 1 jour → très suspect
  return Math.min(1, velocityRatio);
}

// ─── Ratio stars récentes ────────────────────────────────────────────────────
// Stars des 30 derniers jours vs total de l'échantillon

export function calculateRecentStarsRatio(
  users: GitHubUserDetail[]
): number {
  if (users.length === 0) return 0;

  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

  const recentCount = users.filter(
    (u) => new Date(u.starred_at).getTime() >= thirtyDaysAgo
  ).length;

  return recentCount / users.length;
}

// ─── Score dimension temporelle ──────────────────────────────────────────────

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

  // Normalisation du Z-score : Z > 3 = très suspect, cap à 10
  const zScoreNormalized = Math.min(1, Math.max(0, (zScorePeak - 1) / 9));

  // Poids
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
