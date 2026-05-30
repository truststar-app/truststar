import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { getCached } from "@/lib/trust-score-cache";
import { getLatestAuditForSlug } from "@/lib/recent-audits";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "https://truststar.co";

const STATUS_COLORS: Record<string, { bg: string; light: string }> = {
  SAFE:       { bg: "#16A34A", light: "#BBF7D0" },
  CAUTION:    { bg: "#D97706", light: "#FDE68A" },
  SUSPICIOUS: { bg: "#D97706", light: "#FDE68A" },
  DANGEROUS:  { bg: "#DC2626", light: "#FECACA" },
};

// Layout — 220 × 40px
const LW = 96;   // brand section
const SW = 80;   // score section
const QW = 44;   // QR section
const W  = LW + SW + QW;  // 220
const H  = 40;

// QR: 32×32 centered in QW×H
const QS   = 32;
const QX   = LW + SW + Math.round((QW - QS) / 2);
const QY   = Math.round((H - QS) / 2);

async function extractQrPath(url: string): Promise<{ d: string; scale: number } | null> {
  try {
    const svg = await QRCode.toString(url, { type: "svg", margin: 0, errorCorrectionLevel: "L" });
    const vb = svg.match(/viewBox="0 0 (\d+)/);
    const n  = vb ? parseInt(vb[1]) : 37;
    const pd = svg.match(/<path[^>]+d="([^"]+)"/);
    if (!pd) return null;
    return { d: pd[1], scale: QS / n };
  } catch {
    return null;
  }
}

async function buildSvg(score: number | null, label: string | null, reportUrl: string): Promise<string> {
  const cfg       = STATUS_COLORS[label ?? ""] ?? { bg: "#6B7280", light: "#E5E7EB" };
  const scoreText = score !== null ? String(score) : "—";
  const labelText = label && label !== "NEW" ? label : "NEW";

  const qr = await extractQrPath(reportUrl);
  const qrEl = qr
    ? `<path fill="#1a1a1a" transform="translate(${QX},${QY}) scale(${qr.scale.toFixed(5)})" d="${qr.d}"/>`
    : "";

  // Score section center
  const sc = LW + Math.round(SW / 2);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" role="img" aria-label="TrustStar ${scoreText} ${labelText}">
  <defs>
    <clipPath id="clip"><rect width="${W}" height="${H}" rx="6"/></clipPath>
    <linearGradient id="brand" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
    <linearGradient id="score" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${cfg.bg}"/>
      <stop offset="100%" stop-color="${cfg.bg}" stop-opacity="0.88"/>
    </linearGradient>
  </defs>

  <g clip-path="url(#clip)">
    <rect width="${LW}" height="${H}" fill="url(#brand)"/>
    <rect x="${LW}" width="${SW}" height="${H}" fill="url(#score)"/>
    <rect x="${LW + SW}" width="${QW}" height="${H}" fill="#f8fafc"/>
    <line x1="${LW}" y1="0" x2="${LW}" y2="${H}" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
    <line x1="${LW + SW}" y1="0" x2="${LW + SW}" y2="${H}" stroke="rgba(0,0,0,0.06)" stroke-width="1"/>
  </g>

  <rect width="${W}" height="${H}" rx="6" fill="none" stroke="rgba(0,0,0,0.18)" stroke-width="1"/>

  <!-- Brand: star + name -->
  <text x="12" y="${H / 2 + 6}" font-family="Verdana,Geneva,sans-serif" font-size="18" fill="#D93636">&#9733;</text>
  <text x="32" y="${H / 2 + 4}" font-family="Verdana,Geneva,sans-serif" font-size="10" font-weight="700" fill="#f1f5f9" letter-spacing="0.2">TrustStar</text>

  <!-- Score + label -->
  <text x="${sc}" y="${H / 2 - 2}" text-anchor="middle" font-family="Verdana,Geneva,sans-serif" font-size="16" font-weight="800" fill="#ffffff">${scoreText}</text>
  <text x="${sc}" y="${H / 2 + 13}" text-anchor="middle" font-family="Verdana,Geneva,sans-serif" font-size="8.5" font-weight="600" fill="${cfg.light}" letter-spacing="0.4">${labelText}</text>

  <!-- QR -->
  ${qrEl}
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
