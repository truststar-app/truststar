import type { IssueStats } from "../types";

async function fetchIssueCount(
  owner: string,
  repo: string,
  state: "open" | "closed"
): Promise<number> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/issues?state=${state}&per_page=1&page=1`,
      {
        headers: {
          ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        next: { revalidate: 300 },
      }
    );

    if (!response.ok) return 0;

    // Parse the Link header to extract the last page number
    const linkHeader = response.headers.get("Link") ?? "";
    const lastPageMatch = linkHeader.match(/page=(\d+)>; rel="last"/);

    if (lastPageMatch) {
      return parseInt(lastPageMatch[1], 10);
    }

    // No Link header = less than one page of results
    const data = (await response.json()) as unknown[];
    return data.length;
  } catch {
    return 0;
  }
}

export async function fetchIssueStats(
  owner: string,
  repo: string
): Promise<IssueStats> {
  try {
    const [open, closed] = await Promise.all([
      fetchIssueCount(owner, repo, "open"),
      fetchIssueCount(owner, repo, "closed"),
    ]);

    return { open, closed };
  } catch (error) {
    console.error("Failed to fetch issue stats:", error);
    return { open: 0, closed: 0 };
  }
}
