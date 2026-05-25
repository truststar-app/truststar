export type RecentAudit = {
  id: string;
  type: "trust-score" | "skill-audit" | "npm-check";
  slug: string;
  score: number;
  label: "SAFE" | "SUSPICIOUS" | "DANGEROUS";
  analyzedAt: string;
};

const MAX_ENTRIES = 100;

const store: RecentAudit[] = [];

export function addAudit(audit: RecentAudit): void {
  store.unshift(audit);
  if (store.length > MAX_ENTRIES) store.splice(MAX_ENTRIES);
}

export function getRecentAudits(limit = 50): RecentAudit[] {
  const cap = Math.min(limit, MAX_ENTRIES);
  return store
    .slice()
    .sort((a, b) => new Date(b.analyzedAt).getTime() - new Date(a.analyzedAt).getTime())
    .slice(0, cap);
}
