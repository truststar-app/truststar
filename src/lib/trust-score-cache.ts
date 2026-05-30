import type { TrustScore } from "./types";

export const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// NEW #1: Cap size to prevent unbounded growth under sustained traffic
const MAX_CACHE_SIZE = 500;
export const trustScoreCache = new Map<string, { data: TrustScore; cachedAt: number }>();

export function cacheKey(owner: string, repo: string): string {
  return `${owner}/${repo}`.toLowerCase();
}

export function getCached(owner: string, repo: string): TrustScore | null {
  const hit = trustScoreCache.get(cacheKey(owner, repo));
  if (hit && Date.now() - hit.cachedAt < CACHE_TTL_MS) return hit.data;
  return null;
}

export function setCached(owner: string, repo: string, data: TrustScore): void {
  if (trustScoreCache.size >= MAX_CACHE_SIZE) {
    const oldest = trustScoreCache.keys().next().value;
    if (oldest) trustScoreCache.delete(oldest);
  }
  trustScoreCache.set(cacheKey(owner, repo), { data, cachedAt: Date.now() });
}
