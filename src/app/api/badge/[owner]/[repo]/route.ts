import { NextRequest, NextResponse } from "next/server";
import { getCached } from "@/lib/trust-score-cache";
import { getLatestAuditForSlug } from "@/lib/recent-audits";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

// H-4
const SLUG_RE = /^[a-zA-Z0-9._-]{1,100}$/;

const STATUS_COLORS: Record<string, { bg: string; light: string }> = {
  SAFE:       { bg: "#16A34A", light: "#BBF7D0" },
  CAUTION:    { bg: "#D97706", light: "#FDE68A" },
  SUSPICIOUS: { bg: "#D97706", light: "#FDE68A" },
  DANGEROUS:  { bg: "#DC2626", light: "#FECACA" },
};

// Layout — 176 × 40px
const LW = 104;  // brand section
const SW = 72;   // score section
const W  = LW + SW;  // 176
const H  = 40;
const SC = LW + Math.round(SW / 2);

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildSvg(score: number | null, label: string | null): string {
  const cfg       = STATUS_COLORS[label ?? ""] ?? { bg: "#6B7280", light: "#E5E7EB" };
  // H-6: Escape XML entities before interpolation into SVG
  const scoreText = escapeXml(score !== null ? String(score) : "—");
  const labelText = escapeXml(label && label !== "NEW" ? label : "NEW");

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
    <line x1="${LW}" y1="0" x2="${LW}" y2="${H}" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
  </g>
  <rect width="${W}" height="${H}" rx="6" fill="none" stroke="rgba(0,0,0,0.18)" stroke-width="1"/>
  <text x="13" y="${H / 2 + 6}" font-family="Verdana,Geneva,sans-serif" font-size="18" fill="#D93636">&#9733;</text>
  <text x="33" y="${H / 2 + 4}" font-family="Verdana,Geneva,sans-serif" font-size="10" font-weight="700" fill="#f1f5f9" letter-spacing="0.3">TrustStar</text>
  <text x="${SC}" y="${H / 2 - 2}" text-anchor="middle" font-family="Verdana,Geneva,sans-serif" font-size="16" font-weight="800" fill="#ffffff">${scoreText}</text>
  <text x="${SC}" y="${H / 2 + 13}" text-anchor="middle" font-family="Verdana,Geneva,sans-serif" font-size="8.5" font-weight="600" fill="${cfg.light}" letter-spacing="0.5">${labelText}</text>
</svg>`;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string }> }
) {
  if (!(await rateLimit(getClientIp(req), 60, 60_000))) {
    return new NextResponse("Too many requests", { status: 429 });
  }

  const { owner, repo } = await params;

  // H-4: Validate slug format
  if (!SLUG_RE.test(owner) || !SLUG_RE.test(repo)) {
    return new NextResponse("Invalid owner or repo", { status: 400 });
  }

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

  const svg = buildSvg(score, label);

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      // M-7: Explicit nosniff on SVG to prevent rendering as HTML
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=900, stale-while-revalidate=3600",
    },
  });
}
