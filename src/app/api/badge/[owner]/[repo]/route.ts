import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { getCached } from "@/lib/trust-score-cache";
import { getLatestAuditForSlug } from "@/lib/recent-audits";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "https://truststar.co";

const STATUS_COLORS: Record<string, string> = {
  SAFE:       "#16A34A",
  CAUTION:    "#D97706",
  SUSPICIOUS: "#D97706",
  DANGEROUS:  "#DC2626",
};

// Badge layout
const LEFT_W  = 92;   // brand section
const SCORE_W = 72;   // score + label section
const QR_W    = 44;   // QR section
const TOTAL   = LEFT_W + SCORE_W + QR_W;  // 208
const H       = 36;
const QR_SIZE = 28;
const QR_X    = LEFT_W + SCORE_W + Math.round((QR_W - QR_SIZE) / 2);
const QR_Y    = Math.round((H - QR_SIZE) / 2);

async function extractQrPath(url: string): Promise<{ d: string; scale: number } | null> {
  try {
    const svg = await QRCode.toString(url, { type: "svg", margin: 0, errorCorrectionLevel: "L" });
    const vb = svg.match(/viewBox="0 0 (\d+)/);
    const n = vb ? parseInt(vb[1]) : 37;
    const pd = svg.match(/<path[^>]+d="([^"]+)"/);
    if (!pd) return null;
    return { d: pd[1], scale: QR_SIZE / n };
  } catch {
    return null;
  }
}

async function buildSvg(
  score: number | null,
  label: string | null,
  reportUrl: string
): Promise<string> {
  const color     = STATUS_COLORS[label ?? ""] ?? "#9CA3AF";
  const scoreText = score !== null ? String(score) : "—";
  const labelText = label && label !== "NEW" ? label : "NEW";

  const qr = await extractQrPath(reportUrl);
  const qrPath = qr
    ? `<path fill="#1C1C1E" transform="translate(${QR_X},${QR_Y}) scale(${qr.scale.toFixed(5)})" d="${qr.d}"/>`
    : "";

  // Score center x
  const sc = LEFT_W + Math.round(SCORE_W / 2);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${TOTAL}" height="${H}" role="img" aria-label="TrustStar ${scoreText} ${labelText}">
  <clipPath id="r"><rect width="${TOTAL}" height="${H}" rx="5" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${LEFT_W}" height="${H}" fill="#1C1C1E"/>
    <rect x="${LEFT_W}" width="${SCORE_W}" height="${H}" fill="${color}"/>
    <rect x="${LEFT_W + SCORE_W}" width="${QR_W}" height="${H}" fill="#FFFFFF"/>
  </g>
  <rect width="${TOTAL}" height="${H}" rx="5" fill="none" stroke="#D1D5DB" stroke-width="1"/>
  <g font-family="Verdana,Geneva,DejaVu Sans,sans-serif">
    <text x="10" y="24" font-size="13" font-weight="700" fill="#D93636">&#9679;</text>
    <text x="22" y="23" font-size="10" font-weight="700" fill="#FFFFFF">TrustStar</text>
    <text x="${sc}" y="19" text-anchor="middle" font-size="13" font-weight="800" fill="#FFFFFF">${scoreText}</text>
    <text x="${sc}" y="29" text-anchor="middle" font-size="8" font-weight="600" fill="#FFFFFF" fill-opacity="0.9">${labelText}</text>
  </g>
  ${qrPath}
</svg>`;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string }> }
) {
  if (!rateLimit(getClientIp(req), 60, 60_000)) {
    return new NextResponse("Too many requests", { status: 429 });
  }

  const { owner, repo } = await params;
  const reportUrl = `${BASE}/report/${owner}/${repo}`;

  const cached = getCached(owner, repo);
  let score: number | null = null;
  let label: string | null = null;

  if (cached) {
    score = cached.score;
    label = cached.label;
  } else {
    const audit = await getLatestAuditForSlug(`${owner}/${repo}`, "trust-score");
    if (audit) {
      score = audit.score;
      label = audit.label;
    }
  }

  const svg = await buildSvg(score, label, reportUrl);

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
