const BASE_URL = "https://topclawhubskills.com/api";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const TIMEOUT_MS = 10_000;

// ─── Types ────────────────────────────────────────────────────────────────────

export type ClawHubSkill = {
  slug: string;
  display_name: string;
  summary: string;
  downloads: number;
  stars: number;
  owner_handle: string;
  created_at: string;
  updated_at: string;
  is_certified: boolean;
  is_deleted: boolean;
  deleted_at: string | null;
  clawhub_url: string;
};

export type ClawHubListResult = {
  skills: ClawHubSkill[];
  total: number;
};

export type ClawHubStats = {
  total_skills: number;
  total_downloads: number;
  total_stars: number;
  certified_skills: number;
};

// ─── Cache ────────────────────────────────────────────────────────────────────

const cache = new Map<string, { data: unknown; at: number }>();

function fromCache<T>(key: string): T | null {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL) return hit.data as T;
  return null;
}

function toCache(key: string, data: unknown): void {
  cache.set(key, { data, at: Date.now() });
}

// ─── Fetch helper ─────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}${path}`, { signal: controller.signal });
    if (!res.ok) throw new Error(`ClawHub API error: ${res.status}`);
    const json = (await res.json()) as { ok: boolean; data: T };
    if (!json.ok) throw new Error("ClawHub API returned ok=false");
    return json.data;
  } finally {
    clearTimeout(timer);
  }
}

// ─── Endpoints ────────────────────────────────────────────────────────────────

export async function fetchTopDownloads(limit = 50): Promise<ClawHubListResult> {
  const key = `top-downloads:${limit}`;
  const cached = fromCache<ClawHubListResult>(key);
  if (cached) return cached;

  const skills = await apiFetch<ClawHubSkill[]>(`/top-downloads?limit=${limit}`);
  const result: ClawHubListResult = { skills, total: skills.length };
  toCache(key, result);
  return result;
}

export async function fetchTopStars(limit = 50): Promise<ClawHubListResult> {
  const key = `top-stars:${limit}`;
  const cached = fromCache<ClawHubListResult>(key);
  if (cached) return cached;

  const skills = await apiFetch<ClawHubSkill[]>(`/top-stars?limit=${limit}`);
  const result: ClawHubListResult = { skills, total: skills.length };
  toCache(key, result);
  return result;
}

export async function fetchNewest(limit = 50): Promise<ClawHubListResult> {
  const key = `newest:${limit}`;
  const cached = fromCache<ClawHubListResult>(key);
  if (cached) return cached;

  const skills = await apiFetch<ClawHubSkill[]>(`/newest?limit=${limit}`);
  const result: ClawHubListResult = { skills, total: skills.length };
  toCache(key, result);
  return result;
}

export async function fetchCertified(limit = 50): Promise<ClawHubListResult> {
  const key = `certified:${limit}`;
  const cached = fromCache<ClawHubListResult>(key);
  if (cached) return cached;

  const skills = await apiFetch<ClawHubSkill[]>(`/certified?limit=${limit}`);
  const result: ClawHubListResult = { skills, total: skills.length };
  toCache(key, result);
  return result;
}

export async function fetchSearch(q: string, limit = 50): Promise<ClawHubListResult> {
  const key = `search:${q}:${limit}`;
  const cached = fromCache<ClawHubListResult>(key);
  if (cached) return cached;

  const skills = await apiFetch<ClawHubSkill[]>(
    `/search?q=${encodeURIComponent(q)}&limit=${limit}`
  );
  const result: ClawHubListResult = { skills, total: skills.length };
  toCache(key, result);
  return result;
}

export async function fetchStats(): Promise<ClawHubStats> {
  const key = "stats";
  const cached = fromCache<ClawHubStats>(key);
  if (cached) return cached;

  const data = await apiFetch<ClawHubStats>("/stats");
  toCache(key, data);
  return data;
}
