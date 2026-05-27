import { NextRequest, NextResponse } from "next/server";

type GHItem = {
  full_name: string;
  description: string | null;
  stargazers_count: number;
  language: string | null;
};

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (q.length < 3) {
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
