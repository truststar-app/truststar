import { NextResponse } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

interface CacheEntry { data: unknown; ts: number }

// M-4: Cap in-memory cache
const MAX_CACHE_SIZE = 200;
const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 30 * 60 * 1000;

// M-3: Only allow safe language strings
const LANGUAGE_RE = /^[a-zA-Z0-9#+.\-]{1,30}$/;

interface RawRepo {
  id: number;
  name: string;
  full_name: string;
  owner: { login: string };
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  created_at: string;
  html_url: string;
  topics?: string[];
}

export async function GET(req: Request) {
  if (!(await rateLimit(getClientIp(req), 30, 60_000))) {
    return NextResponse.json({ error: "Too many requests. Please try again in a minute." }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  // L-4: Validate period against known values
  const VALID_PERIODS = ["week", "month", "quarter"];
  const rawPeriod = searchParams.get("period");
  const period = rawPeriod && VALID_PERIODS.includes(rawPeriod) ? rawPeriod : "month";
  const language = searchParams.get("language") || "";

  // M-3: Validate language parameter
  if (language && !LANGUAGE_RE.test(language)) {
    return NextResponse.json({ error: "Invalid language parameter" }, { status: 400 });
  }

  const cacheKey = `${period}:${language}`;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.ts < CACHE_TTL) {
    return NextResponse.json(hit.data);
  }

  const since = new Date();
  if (period === "week") since.setDate(since.getDate() - 7);
  else if (period === "quarter") since.setDate(since.getDate() - 90);
  else since.setDate(since.getDate() - 30);

  const dateStr = since.toISOString().split("T")[0];
  let query = `stars:>50 created:>${dateStr}`;
  if (language) query += ` language:${language}`;

  try {
    const res = await fetch(
      `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=30`,
      {
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    if (res.status === 403 || res.status === 429) {
      return NextResponse.json({ error: "rate_limit" }, { status: 429 });
    }
    if (!res.ok) throw new Error(`GitHub ${res.status}`);

    const raw = await res.json() as { items: RawRepo[]; total_count: number };
    const result = {
      items: (raw.items ?? []).map((r) => ({
        id: r.id,
        name: r.name,
        full_name: r.full_name,
        owner: r.owner.login,
        description: r.description,
        stars: r.stargazers_count,
        forks: r.forks_count,
        language: r.language,
        created_at: r.created_at,
        html_url: r.html_url,
        topics: (r.topics ?? []).slice(0, 3),
      })),
      total: raw.total_count ?? 0,
    };

    // M-4: Evict oldest entry if cache is full
    if (cache.size >= MAX_CACHE_SIZE) {
      const oldest = cache.keys().next().value;
      if (oldest) cache.delete(oldest);
    }
    cache.set(cacheKey, { data: result, ts: Date.now() });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }
}
