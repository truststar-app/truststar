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

// Contribution events = real GitHub activity (commits, PRs, issues, etc.)
const CONTRIBUTION_EVENTS = new Set([
  "PushEvent",
  "PullRequestEvent",
  "IssuesEvent",
  "IssueCommentEvent",
  "CreateEvent",
  "CommitCommentEvent",
  "PullRequestReviewEvent",
  "PullRequestReviewCommentEvent",
]);

// Confirmed classification using fetched event data.
// Catches two patterns:
//   1. Classic bot: ≤1 repo + events only WatchEvent/ForkEvent
//   2. Shallow-activity (premium fake): has repos/events but zero real contributions
export function computeLowActivityRatio(
  users: GitHubUserDetail[],
  userEventTypes: Map<string, string[]>
): number {
  if (users.length === 0) return 0;
  let count = 0;
  for (const user of users) {
    const events = userEventTypes.get(user.login) ?? [];

    // Classic bot: single-repo account with only passive events
    if (user.public_repos <= 1) {
      const nonPassive = events.filter(
        (t) => t !== "WatchEvent" && t !== "ForkEvent"
      );
      if (nonPassive.length === 0) { count++; continue; }
    }

    // Shallow-activity: has repos and events, but zero real contributions
    if (events.length >= 5 && !events.some((t) => CONTRIBUTION_EVENTS.has(t))) {
      count++;
    }
  }
  return count / users.length;
}

// ─── Coordinated Lockstep ─────────────────────────────────────────────────────
// Simplified CopyCatch: detect clusters of accounts that:
//   a) starred the target repo within the same 14-day window
//   b) share ≥ 2 other repos in common (from their starred-repos list)
//
// Uses the starredMap (other repos each user has starred) + timestamps of when
// they starred the TARGET repo. No extra API calls needed.

export function computeCoordLockstepScore(
  starredMap: Map<string, string[]>,
  userTimestamps: Map<string, number>
): number {
  if (starredMap.size < 3) return 0;

  const WINDOW_MS = 14 * 24 * 60 * 60 * 1000;
  const MIN_SHARED = 3;   // ≥3 obscure repos in common (popular repos pre-filtered)
  const MIN_CLUSTER = 4;  // ≥4 accounts in the cluster

  const entries = Array.from(starredMap.entries());
  const inCluster = new Set<string>();

  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const [loginA, reposA] = entries[i];
      const [loginB, reposB] = entries[j];

      // Both need at least some other starred repos for meaningful overlap
      if (reposA.length === 0 || reposB.length === 0) continue;

      // Temporal gate: only compare accounts that starred the target close together
      const tsA = userTimestamps.get(loginA);
      const tsB = userTimestamps.get(loginB);
      if (tsA !== undefined && tsB !== undefined) {
        if (Math.abs(tsA - tsB) > WINDOW_MS) continue;
      }

      // Count shared repos
      const setA = new Set(reposA);
      let shared = 0;
      for (const r of reposB) {
        if (setA.has(r)) { shared++; }
      }

      if (shared >= MIN_SHARED) {
        inCluster.add(loginA);
        inCluster.add(loginB);
      }
    }
  }

  if (inCluster.size < MIN_CLUSTER) return 0;
  return inCluster.size / starredMap.size;
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
