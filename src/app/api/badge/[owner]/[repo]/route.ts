import { NextRequest, NextResponse } from "next/server";
import { getCached } from "@/lib/trust-score-cache";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

// Approximate Verdana 11px character width
function textPx(text: string): number {
  return Math.ceil(text.length * 6.5) + 14;
}

const STATUS_COLORS: Record<string, string> = {
  SAFE:       "#16A34A",
  SUSPICIOUS: "#D97706",
  DANGEROUS:  "#DC2626",
};

function buildSvg(rightText: string, color: string): string {
  const leftText  = "TrustStar";
  const leftWidth = Math.max(72, textPx(leftText));
  const rightWidth = Math.max(58, textPx(rightText));
  const total = leftWidth + rightWidth;
  const lc = Math.round(leftWidth / 2);
  const rc = leftWidth + Math.round(rightWidth / 2);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${total}" height="20">
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r"><rect width="${total}" height="20" rx="3" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${leftWidth}" height="20" fill="#555"/>
    <rect x="${leftWidth}" width="${rightWidth}" height="20" fill="${color}"/>
    <rect width="${total}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
    <text x="${lc}" y="15" fill="#010101" fill-opacity=".3">${leftText}</text>
    <text x="${lc}" y="14">${leftText}</text>
    <text x="${rc}" y="15" fill="#010101" fill-opacity=".3">${rightText}</text>
    <text x="${rc}" y="14">${rightText}</text>
  </g>
</svg>`;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string }> }
) {
  if (!rateLimit(getClientIp(_req), 60, 60_000)) {
    return new NextResponse("Too many requests", { status: 429 });
  }

  const { owner, repo } = await params;

  const cached = getCached(owner, repo);

  let rightText: string;
  let color: string;

  if (cached) {
    rightText = `${cached.label} ${cached.score}`;
    color = STATUS_COLORS[cached.label] ?? "#9CA3AF";
  } else {
    rightText = "not rated";
    color = "#9CA3AF";
  }

  const svg = buildSvg(rightText, color);

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
