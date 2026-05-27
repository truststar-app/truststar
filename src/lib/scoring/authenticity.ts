import type { GitHubUserDetail } from "../types";

export type AuthenticitySignals = {
  lowActivityRatio: number;
  coordLockstepScore: number;
  burstLowActivityRatio: number;
};

// ─── Low Activity ──────────────────────────────────────────────────────────────

// Quick proxy (no API calls) — classify based on existing user data
export function estimateLowActivityRatio(users: GitHubUserDetail[]): number {
  if (users.length === 0) return 0;
  const count = users.filter(
    (u) => u.public_repos <= 1 && u.followers === 0 && u.following === 0
  ).length;
  return count / users.length;
}

// Confirmed classification using fetched event data
export function computeLowActivityRatio(
  users: GitHubUserDetail[],
  userEventTypes: Map<string, string[]>
): number {
  if (users.length === 0) return 0;
  let count = 0;
  for (const user of users) {
    if (user.public_repos > 1) continue;
    const events = userEventTypes.get(user.login) ?? [];
    const nonStarEvents = events.filter(
      (t) => t !== "WatchEvent" && t !== "ForkEvent"
    );
    if (nonStarEvents.length === 0) count++;
  }
  return count / users.length;
}

// ─── Coordinated Lockstep ─────────────────────────────────────────────────────
// Simplified CopyCatch: detect clusters of accounts that starred the same repos
// within a 7-day window. Returns fraction of sample in clusters.

export function computeCoordLockstepScore(
  userRecentStars: Map<string, { repo: string; starredAt: number }[]>
): number {
  if (userRecentStars.size < 5) return 0;

  const WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
  const MIN_SHARED = 3;
  const MIN_CLUSTER = 5;

  const users = Array.from(userRecentStars.entries());
  const inCluster = new Set<string>();

  for (let i = 0; i < users.length; i++) {
    for (let j = i + 1; j < users.length; j++) {
      const [loginA, starsA] = users[i];
      const [loginB, starsB] = users[j];
      if (starsA.length === 0 || starsB.length === 0) continue;

      let shared = 0;
      for (const a of starsA) {
        if (starsB.some(
          (b) => b.repo === a.repo && Math.abs(b.starredAt - a.starredAt) <= WINDOW_MS
        )) {
          shared++;
        }
      }
      if (shared >= MIN_SHARED) {
        inCluster.add(loginA);
        inCluster.add(loginB);
      }
    }
  }

  if (inCluster.size < MIN_CLUSTER) return 0;
  return inCluster.size / users.length;
}

// ─── Burst Low-Activity Ratio ────────────────────────────────────────────────
// Among star burst months (>3x median), what fraction comes from low-activity accounts?

export function computeBurstLowActivityRatio(
  users: GitHubUserDetail[],
  lowActivityLogins: Set<string>
): number {
  if (users.length === 0) return 0;

  const monthly = new Map<string, { total: number; lowActivity: number }>();
  for (const u of users) {
    const month = u.starred_at.substring(0, 7);
    const e = monthly.get(month) ?? { total: 0, lowActivity: 0 };
    e.total++;
    if (lowActivityLogins.has(u.login)) e.lowActivity++;
    monthly.set(month, e);
  }

  if (monthly.size < 2) return 0;

  const counts = Array.from(monthly.values())
    .map((e) => e.total)
    .sort((a, b) => a - b);
  const median = counts[Math.floor(counts.length / 2)];
  if (median === 0) return 0;

  const burstMonths = Array.from(monthly.values()).filter(
    (e) => e.total > median * 3
  );
  if (burstMonths.length === 0) return 0;

  const totalBurst = burstMonths.reduce((s, e) => s + e.total, 0);
  const lowActivityBurst = burstMonths.reduce((s, e) => s + e.lowActivity, 0);
  if (totalBurst === 0) return 0;

  return lowActivityBurst / totalBurst;
}

// ─── Authenticity score ────────────────────────────────────────────────────────

export function scoreAuthenticity(signals: AuthenticitySignals): number {
  const score =
    (1 - signals.lowActivityRatio) * 40 +
    (1 - signals.coordLockstepScore) * 35 +
    (1 - signals.burstLowActivityRatio) * 25;
  return Math.round(Math.max(0, Math.min(100, score)));
}
