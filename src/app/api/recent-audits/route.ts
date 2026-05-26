import { NextRequest, NextResponse } from "next/server";
import { getRecentAudits } from "@/lib/recent-audits";
import type { RecentAudit } from "@/lib/recent-audits";

export async function GET(
  request: NextRequest
): Promise<NextResponse<{ audits: RecentAudit[]; total: number }>> {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 100);
  const type = searchParams.get("type") as RecentAudit["type"] | null;

  const { audits, total } = await getRecentAudits(limit, type);
  return NextResponse.json({ audits, total });
}
