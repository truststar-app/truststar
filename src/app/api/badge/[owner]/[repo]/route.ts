import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import fs from "fs";
import path from "path";
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

// Logo: read once at startup (50×57px webp, ~3KB)
function loadLogo(): string {
  try {
    const buf = fs.readFileSync(path.join(process.cwd(), "public", "30px-logo.webp"));
    return `data:image/webp;base64,${buf.toString("base64")}`;
  } catch {
    return "";
  }
}
const LOGO_DATA = loadLogo();

// Badge layout — 176 × 40px
const LOGO_W  = 48;   // dark brand section (logo only)
const SCORE_W = 88;   // colored section (TrustStar + score + label)
const QR_W    = 40;   // white QR section
const TOTAL   = LOGO_W + SCORE_W + QR_W;  // 176
const H       = 40;

// Logo: 26×30 centered in 48×40
const LOGO_IMG_W = 26;
const LOGO_IMG_H = 30;
const LOGO_X = Math.round((LOGO_W - LOGO_IMG_W) / 2);
const LOGO_Y = Math.round((H - LOGO_IMG_H) / 2);

// QR: 32×32 centered in 40×40
const QR_SIZE = 32;
const QR_X = LOGO_W + SCORE_W + Math.round((QR_W - QR_SIZE) / 2);
const QR_Y = Math.round((H - QR_SIZE) / 2);

// Score section center x
const SC = LOGO_W + Math.round(SCORE_W / 2);

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

async function buildSvg(score: number | null, label: string | null, reportUrl: string): Promise<string> {
  const color     = STATUS_COLORS[label ?? ""] ?? "#9CA3AF";
  const scoreText = score !== null ? String(score) : "—";
  const labelText = label && label !== "NEW" ? label : "NEW";

  const qr = await extractQrPath(reportUrl);
  const qrPath = qr
    ? `<path fill="#1C1C1E" transform="translate(${QR_X},${QR_Y}) scale(${qr.scale.toFixed(5)})" d="${qr.d}"/>`
    : "";

  const logoEl = LOGO_DATA
    ? `<image href="${LOGO_DATA}" x="${LOGO_X}" y="${LOGO_Y}" width="${LOGO_IMG_W}" height="${LOGO_IMG_H}"/>`
    : `<text x="${LOGO_W / 2}" y="${H / 2 + 5}" text-anchor="middle" font-size="18" fill="#D93636">&#9679;</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${TOTAL}" height="${H}" role="img" aria-label="TrustStar ${scoreText} ${labelText}">
  <clipPath id="r"><rect width="${TOTAL}" height="${H}" rx="6" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${LOGO_W}" height="${H}" fill="#1C1C1E"/>
    <rect x="${LOGO_W}" width="${SCORE_W}" height="${H}" fill="${color}"/>
    <rect x="${LOGO_W + SCORE_W}" width="${QR_W}" height="${H}" fill="#FFFFFF"/>
  </g>
  <rect width="${TOTAL}" height="${H}" rx="6" fill="none" stroke="#D1D5DB" stroke-width="1"/>
  ${logoEl}
  <g font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-anchor="middle">
    <text x="${SC}" y="14" font-size="7" font-weight="600" fill="#FFFFFF" fill-opacity="0.7" letter-spacing="0.5">TRUSTSTAR</text>
    <text x="${SC}" y="27" font-size="14" font-weight="800" fill="#FFFFFF">${scoreText}</text>
    <text x="${SC}" y="37" font-size="8" font-weight="600" fill="#FFFFFF" fill-opacity="0.9">${labelText}</text>
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
