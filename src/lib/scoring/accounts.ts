import type { GitHubUserDetail } from "../types";

// ─── Helpers ────────────────────────────────────────────────────────────────

function isNewAccount(user: GitHubUserDetail): boolean {
  const createdAt = new Date(user.created_at).getTime();
  const starredAt = new Date(user.starred_at).getTime();
  const diffDays = (starredAt - createdAt) / (1000 * 60 * 60 * 24);
  return diffDays < 30;
}

function hasNoRepos(user: GitHubUserDetail): boolean {
  return user.public_repos === 0;
}

function hasNoSocialPresence(user: GitHubUserDetail): boolean {
  return user.followers === 0 && user.following === 0;
}

// TODO V2: implement avatar detection via GitHub GraphQL API (hasCustomAvatar field)
// REST API cannot distinguish custom photos from auto-generated identicons — same URL format.

// ─── Lockstep Score ─────────────────────────────────────────────────────────
// Detects accounts that starred exactly the same repos
// High score = many accounts share an identical star profile

export function calculateLockstepScore(
  starredMap: Map<string, string[]>
): number {
  if (starredMap.size < 2) return 0;

  const users = Array.from(starredMap.entries());
  let lockstepPairs = 0;
  let totalPairs = 0;

  for (let i = 0; i < users.length; i++) {
    for (let j = i + 1; j < users.length; j++) {
      totalPairs++;
      const [, reposA] = users[i];
      const [, reposB] = users[j];

      if (reposA.length === 0 && reposB.length === 0) continue;

      const setA = new Set(reposA);
      const intersection = reposB.filter((r) => setA.has(r));

      const minLen = Math.min(reposA.length, reposB.length);
      if (minLen === 0) continue;

      const similarity = intersection.length / minLen;

      // Threshold: 80% repos in common = lockstep
      if (similarity >= 0.8) {
        lockstepPairs++;
      }
    }
  }

  if (totalPairs === 0) return 0;
  return lockstepPairs / totalPairs; // 0-1
}

// ─── Account dimension score ────────────────────────────────────────────────

export type AccountSignals = {
  newAccountsRatio: number;
  noRepoRatio: number;
  noFollowersRatio: number;
  noAvatarRatio: number;
  lockstepScore: number;
  ghostAccountsRatio: number;
};

export function scoreAccounts(
  users: GitHubUserDetail[],
  starredMap: Map<string, string[]>
): { score: number; signals: AccountSignals } {
  if (users.length === 0) {
    return {
      score: 50,
      signals: {
        newAccountsRatio: 0,
        noRepoRatio: 0,
        noFollowersRatio: 0,
        noAvatarRatio: 0,
        lockstepScore: 0,
        ghostAccountsRatio: 0,
      },
    };
  }

  const total = users.length;

  const newAccountsRatio =
    users.filter(isNewAccount).length / total;

  const noRepoRatio =
    users.filter(hasNoRepos).length / total;

  const noFollowersRatio =
    users.filter(hasNoSocialPresence).length / total;

  // Disabled: cannot distinguish custom avatars from identicons via REST API
  const noAvatarRatio = 0;

  // Accounts with zero repos, followers, and following — likely bot/throwaway
  const ghostAccountsRatio =
    users.filter((u) => u.public_repos === 0 && u.followers === 0 && u.following === 0).length / total;

  const lockstepScore = calculateLockstepScore(starredMap);

  const weights = {
    newAccounts: 0.35,
    noRepo: 0.30,
    noFollowers: 0.20,
    lockstep: 0.15,
  };

  const suspicionScore =
    newAccountsRatio * weights.newAccounts +
    noRepoRatio * weights.noRepo +
    noFollowersRatio * weights.noFollowers +
    lockstepScore * weights.lockstep;

  // Invert: 0 suspicion = 100 (SAFE), 1 suspicion = 0 (DANGEROUS)
  const score = Math.round(Math.max(0, Math.min(100, (1 - suspicionScore) * 100)));

  return {
    score,
    signals: {
      newAccountsRatio,
      noRepoRatio,
      noFollowersRatio,
      noAvatarRatio,
      lockstepScore,
      ghostAccountsRatio,
    },
  };
}
