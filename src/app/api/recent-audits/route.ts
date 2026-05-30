import { NextRequest, NextResponse } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { getRecentAudits } from "@/lib/recent-audits";
import type { RecentAudit } from "@/lib/recent-audits";

export async function GET(
  request: NextRequest
): Promise<NextResponse<{ audits: RecentAudit[]; total: number } | { error: string }>> {
  // H-3: Rate limit this endpoint
  if (!(await rateLimit(getClientIp(request), 60, 60_000))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 100);
  // L-3: Validate type against known values before use
  const VALID_TYPES: RecentAudit["type"][] = ["trust-score", "skill-audit", "npm-check"];
  const rawType = searchParams.get("type");
  const type = rawType && VALID_TYPES.includes(rawType as RecentAudit["type"])
    ? (rawType as RecentAudit["type"])
    : null;

  const { audits, total } = await getRecentAudits(limit, type);
  return NextResponse.json({ audits, total });
}
