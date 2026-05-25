const GITHUB_API_BASE = "https://api.github.com";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

type FetchOptions = {
  headers?: Record<string, string>;
  next?: { revalidate: number };
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
  const url = endpoint.startsWith("http")
    ? endpoint
    : `${GITHUB_API_BASE}${endpoint}`;

  const response = await fetch(url, {
    headers: {
      ...buildHeaders(),
      ...options.headers,
    },
    ...(options.cache
      ? { cache: options.cache }
      : { next: options.next ?? { revalidate: 300 } }),
  });

  if (response.status === 401) {
    throw new Error(`GitHubAuthError: invalid or expired token — ${endpoint}`);
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
    const body = await response.text();
    throw new Error(
      `GitHub API error ${response.status} on ${endpoint}: ${body}`
    );
  }

  return response.json() as Promise<T>;
}

export async function githubFetchWithStarredAt<T>(
  endpoint: string
): Promise<T> {
  const url = endpoint.startsWith("http")
    ? endpoint
    : `${GITHUB_API_BASE}${endpoint}`;

  const response = await fetch(url, {
    headers: {
      ...buildHeaders(),
      Accept: "application/vnd.github.star+json",
    },
    next: { revalidate: 300 },
  });

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
    const body = await response.text();
    throw new Error(`GitHub API error ${response.status}: ${body}`);
  }

  return response.json() as Promise<T>;
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
