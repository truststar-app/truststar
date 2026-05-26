import { getRedis } from "./redis";

export type RecentAudit = {
  id: string;
  type: "trust-score" | "skill-audit" | "npm-check";
  slug: string;
  score: number;
  label: "SAFE" | "SUSPICIOUS" | "DANGEROUS" | "NEW";
  analyzedAt: string;
};

const REDIS_KEY = "recent-audits";
const MAX_ENTRIES = 500;

// ─── Write ───────────────────────────────────────────────────────────────────

export function addAudit(audit: RecentAudit): void {
  const redis = getRedis();
  if (!redis) return;

  const score = new Date(audit.analyzedAt).getTime();
  const member = JSON.stringify(audit);

  // fire-and-forget — never blocks the API response
  redis
    .zadd(REDIS_KEY, { score, member })
    .then(() =>
      redis.zremrangebyrank(REDIS_KEY, 0, -(MAX_ENTRIES + 1))
    )
    .catch(() => {
      // Redis unavailable — silent fail
    });
}

// ─── Read ────────────────────────────────────────────────────────────────────

export async function getRecentAudits(
  limit = 20,
  type?: RecentAudit["type"] | null
): Promise<{ audits: RecentAudit[]; total: number }> {
  const redis = getRedis();
  if (!redis) return { audits: [], total: 0 };

  try {
    // Fetch a larger window so we can filter by type and still hit the limit
    const fetchCount = type ? Math.min(limit * 10, MAX_ENTRIES) : limit;
    const raw = await redis.zrange<string[]>(REDIS_KEY, 0, fetchCount - 1, {
      rev: true,
    });

    const parsed = raw
      .map((item) => {
        try {
          return JSON.parse(item) as RecentAudit;
        } catch {
          return null;
        }
      })
      .filter((a): a is RecentAudit => a !== null);

    const filtered = type ? parsed.filter((a) => a.type === type) : parsed;
    const audits = filtered.slice(0, limit);

    return { audits, total: filtered.length };
  } catch {
    return { audits: [], total: 0 };
  }
}
