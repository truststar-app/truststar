import { githubFetch } from "./client";
import type { RepoInfo } from "../types";

const GITHUB_API_BASE = "https://api.github.com";

async function githubFetchPublic<T>(path: string): Promise<T> {
  const url = path.startsWith("http") ? path : `${GITHUB_API_BASE}${path}`;
  const res = await fetch(url, {
    headers: { Accept: "application/vnd.github+json" },
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`GitHub public fetch ${res.status} on ${path}`);
  return res.json() as Promise<T>;
}

export async function fetchRepoInfo(
  owner: string,
  repo: string
): Promise<RepoInfo> {
  return githubFetch<RepoInfo>(`/repos/${owner}/${repo}`);
}

type CommitListEntry = {
  sha: string;
  author: { login: string } | null;
};

export async function fetchRecentCommitData(
  owner: string,
  repo: string,
): Promise<{ commitsPerWeek: number; activeContributorsRatio: number }> {
  const DAYS = 90;
  const WEEKS = DAYS / 7;
  const windowStart = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000);
  const windowEnd = new Date();
  const since = windowStart.toISOString();

  console.log(`[commits] ${owner}/${repo} — window: ${windowStart.toISOString()} → ${windowEnd.toISOString()}`);

  const authors = new Set<string>();
  let totalCommits = 0;
  let page = 1;

  const fetchPage = async (p: number): Promise<CommitListEntry[]> => {
    const path = `/repos/${owner}/${repo}/commits?since=${since}&per_page=100&page=${p}`;
    try {
      return await githubFetch<CommitListEntry[]>(path);
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("GitHubAuthError")) {
        return githubFetchPublic<CommitListEntry[]>(path);
      }
      throw err;
    }
  };

  try {
    while (page <= 5) {
      const commits = await fetchPage(page);
      if (!Array.isArray(commits) || commits.length === 0) break;
      totalCommits += commits.length;
      for (const c of commits) {
        if (c.author?.login) authors.add(c.author.login);
      }
      if (commits.length < 100) break;
      page++;
    }
  } catch (err) {
    console.error(`[commits] fetch failed for ${owner}/${repo}:`, err);
  }

  console.log(`[commits] ${owner}/${repo} — ${totalCommits} commits found over ${WEEKS.toFixed(2)} weeks → ${(totalCommits / WEEKS).toFixed(2)} commits/week`);

  return {
    commitsPerWeek: totalCommits / WEEKS,
    activeContributorsRatio: Math.min(1, authors.size / 10),
  };
}
