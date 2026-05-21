import { githubFetch } from "./client";
import type { CommitActivity, RepoInfo, ContributorStat } from "../types";

export async function fetchRepoInfo(
  owner: string,
  repo: string
): Promise<RepoInfo> {
  return githubFetch<RepoInfo>(`/repos/${owner}/${repo}`);
}

export async function fetchCommitActivity(
  owner: string,
  repo: string
): Promise<CommitActivity[]> {
  try {
    const data = await githubFetch<CommitActivity[]>(
      `/repos/${owner}/${repo}/stats/commit_activity`
    );
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Failed to fetch commit activity:", error);
    return [];
  }
}

export async function fetchContributorStats(
  owner: string,
  repo: string
): Promise<ContributorStat[]> {
  try {
    const url = `/repos/${owner}/${repo}/stats/contributors`;

    let data = await githubFetch<ContributorStat[] | null>(url);

    if (!data || !Array.isArray(data)) {
      // GitHub calcule les stats en async → retry après 2s
      await new Promise((resolve) => setTimeout(resolve, 2000));
      data = await githubFetch<ContributorStat[] | null>(url);
    }

    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Failed to fetch contributor stats:", error);
    return [];
  }
}

export function calculateCommitFrequency(
  activity: CommitActivity[],
  weeksBack: number = 13
): number {
  if (!activity.length) return 0;

  const recent = activity.slice(-weeksBack);
  const totalCommits = recent.reduce((sum, week) => sum + week.total, 0);

  if (recent.length === 0) return 0;

  return totalCommits / recent.length; // commits/semaine en moyenne
}

export function calculateActiveContributors(
  stats: ContributorStat[],
  weeksBack: number = 13
): { active: number; total: number } {
  const cutoffWeek =
    Math.floor(Date.now() / 1000) - weeksBack * 7 * 24 * 3600;

  let active = 0;
  const total = stats.length;

  for (const contributor of stats) {
    const recentCommits = contributor.weeks
      .filter((w) => w.w >= cutoffWeek)
      .reduce((sum, w) => sum + w.c, 0);

    if (recentCommits > 0) {
      active++;
    }
  }

  return { active, total };
}
