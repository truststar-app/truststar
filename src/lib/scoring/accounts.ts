import type { GitHubUserDetail } from "../types";

const DEFAULT_AVATAR_PATTERN =
  /avatars\.githubusercontent\.com\/u\/\d+\?v=\d+$/;

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

function hasDefaultAvatar(user: GitHubUserDetail): boolean {
  return DEFAULT_AVATAR_PATTERN.test(user.avatar_url);
}

// ─── Lockstep Score ─────────────────────────────────────────────────────────
// Détecte les comptes ayant starred exactement les mêmes repos
// Score élevé = beaucoup de comptes partagent un profil de stars identique

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

      // Seuil : 80% de repos en commun = lockstep
      if (similarity >= 0.8) {
        lockstepPairs++;
      }
    }
  }

  if (totalPairs === 0) return 0;
  return lockstepPairs / totalPairs; // 0-1
}

// ─── Score dimension comptes ─────────────────────────────────────────────────

export type AccountSignals = {
  newAccountsRatio: number;
  noRepoRatio: number;
  noFollowersRatio: number;
  noAvatarRatio: number;
  lockstepScore: number;
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

  const noAvatarRatio =
    users.filter(hasDefaultAvatar).length / total;

  const lockstepScore = calculateLockstepScore(starredMap);

  // Chaque signal contribue à la suspicion
  // On convertit chaque ratio en pénalité (0 = clean, 1 = suspect)
  const weights = {
    newAccounts: 0.30,
    noRepo: 0.25,
    noFollowers: 0.20,
    noAvatar: 0.10,
    lockstep: 0.15,
  };

  const suspicionScore =
    newAccountsRatio * weights.newAccounts +
    noRepoRatio * weights.noRepo +
    noFollowersRatio * weights.noFollowers +
    noAvatarRatio * weights.noAvatar +
    lockstepScore * weights.lockstep;

  // Inverser : 0 suspicion = 100 (SAFE), 1 suspicion = 0 (DANGEROUS)
  const score = Math.round(Math.max(0, Math.min(100, (1 - suspicionScore) * 100)));

  return {
    score,
    signals: {
      newAccountsRatio,
      noRepoRatio,
      noFollowersRatio,
      noAvatarRatio,
      lockstepScore,
    },
  };
}
