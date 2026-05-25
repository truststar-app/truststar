import { githubFetchWithStarredAt, githubFetch } from "./client";
import type { GitHubUser, GitHubUserDetail } from "../types";

const MAX_SAMPLE_SIZE = 200;
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
  const pagesToFetch = Math.ceil(
    Math.min(MAX_SAMPLE_SIZE, totalStars) / PER_PAGE
  );
  const totalPages = Math.ceil(totalStars / PER_PAGE);

  const pageNumbers: number[] = [];

  if (totalPages <= pagesToFetch) {
    for (let i = 1; i <= totalPages; i++) {
      pageNumbers.push(i);
    }
  } else {
    // Take the last pages (most recent stars)
    for (let i = 0; i < pagesToFetch; i++) {
      pageNumbers.push(totalPages - i);
    }
    pageNumbers.reverse();
  }

  const allUsers: GitHubUser[] = [];

  for (const page of pageNumbers) {
    try {
      const raw = await githubFetchWithStarredAt<RawStargazer[]>(
        `/repos/${owner}/${repo}/stargazers?per_page=${PER_PAGE}&page=${page}`
      );

      const users: GitHubUser[] = raw.map((item) => ({
        login: item.user.login,
        id: item.user.id,
        avatar_url: item.user.avatar_url,
        starred_at: item.starred_at,
      }));

      allUsers.push(...users);
    } catch (error) {
      console.error(`Failed to fetch stargazers page ${page}:`, error);
      break;
    }
  }

  return allUsers.slice(0, MAX_SAMPLE_SIZE);
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

  const BATCH_SIZE = 10;
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
  const LOCKSTEP_SAMPLE = 30;
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
