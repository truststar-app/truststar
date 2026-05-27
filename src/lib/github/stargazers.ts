import { fetchStargazers, githubFetch } from "./client";
import type { GitHubUser, GitHubUserDetail } from "../types";
import { fetchUserEventData } from "./events";
import {
  estimateLowActivityRatio,
  computeLowActivityRatio,
  computeCoordLockstepScore,
  computeBurstLowActivityRatio,
  type AuthenticitySignals,
} from "../scoring/authenticity";

const MAX_SAMPLE_SIZE = 150;
const PER_PAGE = 100;

type RawStargazer = {
  starred_at: string;
  user: {
    login: string;
    id: number;
    avatar_url: string;
  };
};

type RawUserDetail = {
  login: string;
  id: number;
  avatar_url: string;
  created_at: string;
  public_repos: number;
  followers: number;
  following: number;
};

export async function fetchStargazersSample(
  owner: string,
  repo: string,
  totalStars: number
): Promise<GitHubUser[]> {
  if (totalStars === 0) {
    return [];
  }

  const totalPages = Math.ceil(totalStars / PER_PAGE);
  let pagesToFetch: number[];

  if (totalPages <= 5) {
    pagesToFetch = Array.from({ length: totalPages }, (_, i) => i + 1);
  } else {
    // Fetch pages distributed across the full history to avoid temporal bias
    const p25 = Math.max(2, Math.floor(totalPages * 0.25));
    const p50 = Math.max(3, Math.floor(totalPages * 0.5));
    const p75 = Math.max(4, Math.floor(totalPages * 0.75));
    pagesToFetch = [...new Set([1, p25, p50, p75, totalPages])];
  }

  const raw: RawStargazer[] = await fetchStargazers(owner, repo, pagesToFetch);

  // Evenly subsample across all fetched pages to preserve temporal distribution
  const step = Math.max(1, Math.floor(raw.length / MAX_SAMPLE_SIZE));
  const distributed = raw.filter((_, i) => i % step === 0).slice(0, MAX_SAMPLE_SIZE);

  return distributed.map((item) => ({
    login: item.user.login,
    id: item.user.id,
    avatar_url: item.user.avatar_url,
    starred_at: item.starred_at,
  }));
}

export async function fetchUserDetails(
  login: string,
  starredAt: string
): Promise<GitHubUserDetail | null> {
  try {
    const user = await githubFetch<RawUserDetail>(`/users/${login}`);
    return {
      login: user.login,
      id: user.id,
      avatar_url: user.avatar_url,
      created_at: user.created_at,
      public_repos: user.public_repos,
      followers: user.followers,
      following: user.following,
      starred_at: starredAt,
    };
  } catch (error) {
    console.error(`Failed to fetch user details for ${login}:`, error);
    return null;
  }
}

export async function fetchUserStarredRepos(
  login: string
): Promise<string[]> {
  try {
    const starred = await githubFetch<{ full_name: string }[]>(
      `/users/${login}/starred?per_page=100`
    );
    return starred.map((r) => r.full_name);
  } catch {
    return [];
  }
}

export async function fetchStargazersWithDetails(
  owner: string,
  repo: string,
  totalStars: number
): Promise<GitHubUserDetail[]> {
  const sample = await fetchStargazersSample(owner, repo, totalStars);

  const BATCH_SIZE = 50;
  const details: GitHubUserDetail[] = [];

  for (let i = 0; i < sample.length; i += BATCH_SIZE) {
    const batch = sample.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map((user) => fetchUserDetails(user.login, user.starred_at))
    );
    details.push(
      ...batchResults.filter((d): d is GitHubUserDetail => d !== null)
    );
  }

  return details;
}

// Builds a filtered starredMap that keeps only "obscure" repos (< 5 000 stars).
// Popular repos (React, Vue, Next.js…) are starred by everyone and must not count
// as lockstep evidence — their presence in common is normal developer behaviour.
// Only checks repos that appear in ≥ 2 users' lists (the only ones that can cluster).
async function buildObscureStarredMap(
  starredMap: Map<string, string[]>
): Promise<Map<string, string[]>> {
  // Count how many users starred each repo
  const freq = new Map<string, number>();
  for (const repos of starredMap.values()) {
    for (const r of repos) {
      freq.set(r, (freq.get(r) ?? 0) + 1);
    }
  }

  // Keep only repos shared by ≥ 2 users — those are the only candidates for clusters
  const candidates = Array.from(freq.entries())
    .filter(([, n]) => n >= 2)
    .sort(([, a], [, b]) => b - a) // most frequent first
    .slice(0, 40)                  // cap at 40 to limit API calls
    .map(([repo]) => repo);

  if (candidates.length === 0) return starredMap;

  // Fetch star counts for candidates (batch of 10) to identify popular repos
  const popularRepos = new Set<string>();
  const POPULAR_THRESHOLD = 5_000;
  const BATCH = 10;
  for (let i = 0; i < candidates.length; i += BATCH) {
    const batch = candidates.slice(i, i + BATCH);
    await Promise.all(
      batch.map(async (fullName) => {
        try {
          const info = await githubFetch<{ stargazers_count: number }>(
            `/repos/${fullName}`
          );
          if (info.stargazers_count >= POPULAR_THRESHOLD) {
            popularRepos.add(fullName);
          }
        } catch { /* ignore — leave in map, threshold conservative */ }
      })
    );
  }

  if (popularRepos.size === 0) return starredMap;

  // Return a filtered copy — popular repos stripped out
  const filtered = new Map<string, string[]>();
  for (const [login, repos] of starredMap.entries()) {
    filtered.set(login, repos.filter((r) => !popularRepos.has(r)));
  }
  return filtered;
}

// fetchAuthenticityData:
//   - coordLockstepScore: always computed (filters popular repos, a few extra API calls)
//   - lowActivityRatio + burstLowActivityRatio: only fetched when fetchEvents=true
export async function fetchAuthenticityData(
  users: GitHubUserDetail[],
  starredMap: Map<string, string[]>,
  fetchEvents: boolean
): Promise<AuthenticitySignals> {
  // Build starredMap with popular repos removed before computing lockstep
  const obscureStarredMap = await buildObscureStarredMap(starredMap);

  const userTimestamps = new Map(
    users.map((u) => [u.login, new Date(u.starred_at).getTime()])
  );
  const coordLockstepScore = computeCoordLockstepScore(obscureStarredMap, userTimestamps);

  if (!fetchEvents) {
    return {
      lowActivityRatio: estimateLowActivityRatio(users),
      coordLockstepScore,
      burstLowActivityRatio: 0,
    };
  }

  // Events API — detects low-activity and shallow-activity accounts
  const SAMPLE_SIZE = 50;
  const BATCH_SIZE = 10;
  const sample = users.slice(0, SAMPLE_SIZE);

  const userEventTypes = new Map<string, string[]>();

  for (let i = 0; i < sample.length; i += BATCH_SIZE) {
    const batch = sample.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (user) => {
        const data = await fetchUserEventData(user.login);
        userEventTypes.set(user.login, data.eventTypes);
      })
    );
  }

  const lowActivityRatio = computeLowActivityRatio(sample, userEventTypes);

  const lowActivityLogins = new Set(
    sample
      .filter((u) => {
        const events = userEventTypes.get(u.login) ?? [];
        const nonPassive = events.filter(
          (t) => t !== "WatchEvent" && t !== "ForkEvent"
        );
        return u.public_repos <= 1 && nonPassive.length === 0;
      })
      .map((u) => u.login)
  );
  const burstLowActivityRatio = computeBurstLowActivityRatio(users, lowActivityLogins);

  return { lowActivityRatio, coordLockstepScore, burstLowActivityRatio };
}

export async function fetchLockstepData(
  users: GitHubUserDetail[],
  owner: string,
  repo: string
): Promise<Map<string, string[]>> {
  const HALF = 15;
  // Bias toward the burst period: take first 15 (oldest) + last 15 (most recent)
  // Fake stars concentrate in recent bursts, so recent users are more suspicious
  const first = users.slice(0, HALF);
  const last = users.slice(-HALF);
  const seen = new Set<string>();
  const sample: GitHubUserDetail[] = [];
  for (const u of [...first, ...last]) {
    if (!seen.has(u.login)) { seen.add(u.login); sample.push(u); }
  }

  const starredMap = new Map<string, string[]>();

  const BATCH_SIZE = 5;
  for (let i = 0; i < sample.length; i += BATCH_SIZE) {
    const batch = sample.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (user) => {
        const repos = await fetchUserStarredRepos(user.login);
        const filtered = repos.filter((r) => r !== `${owner}/${repo}`);
        starredMap.set(user.login, filtered);
      })
    );
  }

  return starredMap;
}
