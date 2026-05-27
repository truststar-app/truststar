import { getRedis } from "./redis";

export type RecentAudit = {
  id: string;
  type: "trust-score" | "skill-audit" | "npm-check";
  slug: string;
  score: number;
  label: "SAFE" | "CAUTION" | "SUSPICIOUS" | "DANGEROUS" | "NEW";
  analyzedAt: string;
};

const REDIS_KEY  = "recent-audits";
const MAX_ENTRIES = 500;

// In-memory fallback (used when Redis is not configured — dev only)
const memStore: RecentAudit[] = [];

// ─── Write ───────────────────────────────────────────────────────────────────

export function addAudit(audit: RecentAudit): void {
  const redis = getRedis();

  if (redis) {
    const score  = new Date(audit.analyzedAt).getTime();
    const member = JSON.stringify(audit);
    redis
      .zadd(REDIS_KEY, { score, member })
      .then(() => redis.zremrangebyrank(REDIS_KEY, 0, -(MAX_ENTRIES + 1)))
      .catch(() => {});
    return;
  }

  // No Redis — fall back to in-memory (single instance, non-persistent)
  memStore.unshift(audit);
  if (memStore.length > 100) memStore.splice(100);
}

// ─── Lookup by slug ──────────────────────────────────────────────────────────

export async function getLatestAuditForSlug(
  slug: string,
  type: RecentAudit["type"]
): Promise<RecentAudit | null> {
  const key = slug.toLowerCase();
  const redis = getRedis();

  if (redis) {
    try {
      const raw = await redis.zrange<string[]>(REDIS_KEY, 0, MAX_ENTRIES - 1, { rev: true });
      for (const item of raw) {
        try {
          const audit = (typeof item === "string" ? JSON.parse(item) : item) as RecentAudit;
          if (audit.type === type && audit.slug.toLowerCase() === key) return audit;
        } catch { /* skip */ }
      }
    } catch { /* Redis unavailable */ }
  }

  // In-memory fallback
  const sorted = [...memStore].sort(
    (a, b) => new Date(b.analyzedAt).getTime() - new Date(a.analyzedAt).getTime()
  );
  return sorted.find((a) => a.type === type && a.slug.toLowerCase() === key) ?? null;
}

// ─── Read ────────────────────────────────────────────────────────────────────

export async function getRecentAudits(
  limit = 20,
  type?: RecentAudit["type"] | null
): Promise<{ audits: RecentAudit[]; total: number }> {
  const redis = getRedis();

  if (redis) {
    try {
      const fetchCount = type ? Math.min(limit * 10, MAX_ENTRIES) : limit;
      const raw = await redis.zrange<string[]>(REDIS_KEY, 0, fetchCount - 1, {
        rev: true,
      });
      const parsed = raw
        .map((item) => { try { return (typeof item === "string" ? JSON.parse(item) : item) as RecentAudit; } catch { return null; } })
        .filter((a): a is RecentAudit => a !== null);
      const filtered = type ? parsed.filter((a) => a.type === type) : parsed;
      return { audits: filtered.slice(0, limit), total: filtered.length };
    } catch {
      // Redis unavailable — fall through to in-memory
    }
  }

  // In-memory fallback
  const sorted = [...memStore].sort(
    (a, b) => new Date(b.analyzedAt).getTime() - new Date(a.analyzedAt).getTime()
  );
  const filtered = type ? sorted.filter((a) => a.type === type) : sorted;
  return { audits: filtered.slice(0, limit), total: filtered.length };
}
