import { fetchStargazers, githubFetch } from "./client";
import type { GitHubUser, GitHubUserDetail } from "../types";

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
  console.log("[stargazers] Starting fetch for", owner, repo, "| totalStars:", totalStars);

  if (totalStars === 0) {
    console.log("[stargazers] Skipping — 0 stars");
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

  console.log("[stargazers] Pages to fetch:", pagesToFetch);
  const raw: RawStargazer[] = await fetchStargazers(owner, repo, pagesToFetch);

  console.log("[stargazers] Fetched count:", raw.length, "| sample[0]:", JSON.stringify(raw[0]));

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

export async function fetchLockstepData(
  users: GitHubUserDetail[],
  owner: string,
  repo: string
): Promise<Map<string, string[]>> {
  const LOCKSTEP_SAMPLE = 15;
  const sample = users.slice(0, LOCKSTEP_SAMPLE);

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
