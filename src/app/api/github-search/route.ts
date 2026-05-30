import { NextRequest, NextResponse } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

type GHItem = {
  full_name: string;
  description: string | null;
  stargazers_count: number;
  language: string | null;
};

export async function GET(req: NextRequest) {
  // H-3: Rate limit this endpoint
  if (!(await rateLimit(getClientIp(req), 30, 60_000))) {
    return NextResponse.json({ items: [] }, { status: 429 });
  }

  const q = req.nextUrl.searchParams.get("q") ?? "";
  // L-3: Min 3 chars, max 100 chars
  if (q.length < 3 || q.length > 100) {
    return NextResponse.json({ items: [] });
  }

  const token = process.env.GITHUB_TOKEN;
  const headers: HeadersInit = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "TrustStar/1.0",
  };
  if (token) (headers as Record<string, string>).Authorization = `Bearer ${token}`;

  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&per_page=8&sort=stars&order=desc`;

  try {
    const res = await fetch(url, { headers, next: { revalidate: 60 } });
    if (!res.ok) {
      return NextResponse.json({ items: [] });
    }
    const data = (await res.json()) as { items?: GHItem[] };
    const items = (data.items ?? []).map((item) => ({
      full_name: item.full_name,
      description: item.description,
      stargazers_count: item.stargazers_count,
      language: item.language,
    }));
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
