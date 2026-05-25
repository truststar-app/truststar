import { NextRequest, NextResponse } from "next/server";
import {
  fetchTopDownloads,
  fetchTopStars,
  fetchNewest,
  fetchCertified,
  fetchSearch,
  fetchStats,
} from "@/lib/clawhub/client";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const view = searchParams.get("view");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 100);
  const q = searchParams.get("q") ?? "";

  try {
    switch (view) {
      case "top-downloads":
        return NextResponse.json(await fetchTopDownloads(limit));
      case "top-stars":
        return NextResponse.json(await fetchTopStars(limit));
      case "newest":
        return NextResponse.json(await fetchNewest(limit));
      case "certified":
        return NextResponse.json(await fetchCertified(limit));
      case "search":
        if (!q) return NextResponse.json({ skills: [], total: 0 });
        return NextResponse.json(await fetchSearch(q, limit));
      case "stats":
        return NextResponse.json(await fetchStats());
      default:
        return NextResponse.json({ error: "Invalid view parameter" }, { status: 400 });
    }
  } catch (err) {
    console.error("[clawhub proxy]", err);
    return NextResponse.json(
      { error: "Failed to fetch from ClawHub API" },
      { status: 502 }
    );
  }
}
