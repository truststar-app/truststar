const GITHUB_API_BASE = "https://api.github.com";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

type FetchOptions = {
  headers?: Record<string, string>;
  cache?: RequestCache;
};

export class GitHubRateLimitError extends Error {
  constructor() {
    super("GitHub API rate limit exceeded");
    this.name = "GitHubRateLimitError";
  }
}

export class GitHubNotFoundError extends Error {
  constructor(resource: string) {
    super(`GitHub resource not found: ${resource}`);
    this.name = "GitHubNotFoundError";
  }
}

function buildHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  if (GITHUB_TOKEN) {
    headers["Authorization"] = `Bearer ${GITHUB_TOKEN}`;
  }

  return headers;
}

export async function githubFetch<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  // C-2: Prevent SSRF — full URLs must resolve to the GitHub API host only
  if (endpoint.startsWith("http") && !endpoint.startsWith(GITHUB_API_BASE)) {
    throw new Error(`Blocked: request to non-GitHub host`);
  }
  const url = endpoint.startsWith("http")
    ? endpoint
    : `${GITHUB_API_BASE}${endpoint}`;

  const response = await fetch(url, {
    headers: {
      ...buildHeaders(),
      ...options.headers,
    },
    cache: options.cache ?? "no-store",
  });

  if (response.status === 401) {
    // Token invalid/expired — retry unauthenticated (60 req/hour limit)
    const retry = await fetch(url, {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...options.headers,
      },
      cache: options.cache ?? "no-store",
    });
    if (!retry.ok) {
      // H-5: Don't log raw API body — may contain sensitive details
      throw new Error(`GitHub API error ${retry.status} on ${endpoint}`);
    }
    return retry.json() as Promise<T>;
  }

  if (response.status === 403) {
    const rateLimitRemaining = response.headers.get("X-RateLimit-Remaining");
    if (rateLimitRemaining === "0") {
      throw new GitHubRateLimitError();
    }
    throw new Error(`GitHub API forbidden: ${endpoint}`);
  }

  if (response.status === 202) {
    // GitHub stats API: computation in progress, return null to trigger retry
    return null as unknown as T;
  }

  if (response.status === 404) {
    throw new GitHubNotFoundError(endpoint);
  }

  if (!response.ok) {
    // H-5: Don't include raw API body in error — may contain sensitive details
    throw new Error(`GitHub API error ${response.status} on ${endpoint}`);
  }

  return response.json() as Promise<T>;
}

export async function githubFetchWithStarredAt<T>(
  endpoint: string
): Promise<T> {
  if (endpoint.startsWith("http") && !endpoint.startsWith(GITHUB_API_BASE)) {
    throw new Error(`Blocked: request to non-GitHub host`);
  }
  const url = endpoint.startsWith("http")
    ? endpoint
    : `${GITHUB_API_BASE}${endpoint}`;

  const sentHeaders = {
    ...buildHeaders(),
    Accept: "application/vnd.github.v3.star+json",
  };

  const response = await fetch(url, {
    headers: sentHeaders,
    cache: "no-store",
  });

  if (response.status === 401) {
    const retry = await fetch(url, {
      headers: {
        Accept: "application/vnd.github.v3.star+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      cache: "no-store",
    });
    if (!retry.ok) throw new Error(`GitHub API error ${retry.status}`);
    return retry.json() as Promise<T>;
  }

  if (response.status === 403) {
    const rateLimitRemaining = response.headers.get("X-RateLimit-Remaining");
    if (rateLimitRemaining === "0") {
      throw new GitHubRateLimitError();
    }
    throw new Error("GitHub API forbidden");
  }

  if (response.status === 404) {
    throw new GitHubNotFoundError(endpoint);
  }

  if (!response.ok) {
    throw new Error(`GitHub API error ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function fetchStargazers(
  owner: string,
  repo: string,
  pages: number[]
): Promise<any[]> {
  const allStargazers: any[] = [];
  for (const page of pages) {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/stargazers?per_page=100&page=${page}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          Accept: "application/vnd.github.v3.star+json",
        },
      }
    );
    if (!response.ok) break;
    const data = await response.json();
    if (data.length === 0) break;
    allStargazers.push(...data);
  }
  return allStargazers;
}

export async function getRateLimit(): Promise<{
  remaining: number;
  limit: number;
  reset: number;
}> {
  const data = await githubFetch<{
    rate: { remaining: number; limit: number; reset: number };
  }>("/rate_limit");
  return data.rate;
}
