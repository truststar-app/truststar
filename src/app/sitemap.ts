import type { MetadataRoute } from "next";
import { getRecentAudits } from "@/lib/recent-audits";

const BASE = "https://truststar.co";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE,                        lastModified: now, priority: 1.0 },
    { url: `${BASE}/discover`,          lastModified: now, priority: 0.8 },
    { url: `${BASE}/recent`,            lastModified: now, priority: 0.7 },
    { url: `${BASE}/how-it-works`,      lastModified: now, priority: 0.6 },
    { url: `${BASE}/badge`,             lastModified: now, priority: 0.5 },
    { url: `${BASE}/api-docs`,          lastModified: now, priority: 0.5 },
    { url: `${BASE}/about`,             lastModified: now, priority: 0.4 },
    { url: `${BASE}/privacy`,           lastModified: now, priority: 0.3 },
    { url: `${BASE}/terms`,             lastModified: now, priority: 0.3 },
  ];

  let dynamicPages: MetadataRoute.Sitemap = [];
  try {
    const { audits } = await getRecentAudits(500);
    // Deduplicate by slug within each type
    const seen = new Set<string>();
    for (const a of audits) {
      const key = `${a.type}:${a.slug}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const lastMod = new Date(a.analyzedAt);
      if (a.type === "trust-score") {
        dynamicPages.push({ url: `${BASE}/report/${a.slug}`, lastModified: lastMod, priority: 0.6 });
      } else if (a.type === "npm-check") {
        dynamicPages.push({ url: `${BASE}/npm/${a.slug}`, lastModified: lastMod, priority: 0.6 });
      } else if (a.type === "skill-audit") {
        dynamicPages.push({ url: `${BASE}/skill/${a.slug}`, lastModified: lastMod, priority: 0.6 });
      }
    }
  } catch {
    // Redis unavailable — return static pages only
  }

  return [...staticPages, ...dynamicPages];
}
