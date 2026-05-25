import { NextRequest, NextResponse } from "next/server";
import { getRecentAudits } from "@/lib/recent-audits";
import type { RecentAudit } from "@/lib/recent-audits";

export async function GET(request: NextRequest): Promise<NextResponse<{ audits: RecentAudit[]; total: number }>> {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 100);
  const type = searchParams.get("type") as RecentAudit["type"] | null;

  let audits = getRecentAudits(100);
  if (type) {
    audits = audits.filter((a) => a.type === type);
  }
  const total = audits.length;
  audits = audits.slice(0, limit);

  return NextResponse.json({ audits, total });
}
