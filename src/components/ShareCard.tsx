"use client";

import { useState } from "react";

const BASE = "https://truststar.co";

const STATUS_COLORS: Record<string, { bg: string; light: string }> = {
  SAFE:       { bg: "#16A34A", light: "#BBF7D0" },
  CAUTION:    { bg: "#D97706", light: "#FDE68A" },
  SUSPICIOUS: { bg: "#D97706", light: "#FDE68A" },
  DANGEROUS:  { bg: "#DC2626", light: "#FECACA" },
};

function buildBadgeSvg(score: number | null, label: string | null): string {
  const W = 176; const H = 40; const LW = 104; const SW = 72;
  const sc = LW + Math.round(SW / 2);
  const iy = H / 2;
  const cfg = STATUS_COLORS[label ?? ""] ?? { bg: "#6B7280", light: "#E5E7EB" };
  const scoreText = score !== null ? String(score) : "—";
  const labelText = label && label !== "NEW" ? label : "NEW";

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
  <text x="13" y="${iy + 6}" font-family="Verdana,Geneva,sans-serif" font-size="18" fill="#D93636">&#9733;</text>
  <text x="33" y="${iy + 4}" font-family="Verdana,Geneva,sans-serif" font-size="10" font-weight="700" fill="#f1f5f9" letter-spacing="0.3">TrustStar</text>
  <text x="${sc}" y="${iy - 2}" text-anchor="middle" font-family="Verdana,Geneva,sans-serif" font-size="16" font-weight="800" fill="#ffffff">${scoreText}</text>
  <text x="${sc}" y="${iy + 13}" text-anchor="middle" font-family="Verdana,Geneva,sans-serif" font-size="8.5" font-weight="600" fill="${cfg.light}" letter-spacing="0.5">${labelText}</text>
</svg>`;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }
  return (
    <button
      onClick={copy}
      title="Copy"
      style={{
        position: "absolute",
        top: 8,
        right: 8,
        padding: "3px 8px",
        fontSize: 11,
        fontWeight: 500,
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: 4,
        color: copied ? "var(--safe)" : "var(--text-secondary)",
        cursor: "pointer",
        transition: "color 0.15s",
        fontFamily: "inherit",
      }}
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

interface ShareCardProps {
  score?: number;
  label?: string;
  badge?: { owner: string; repo: string };
}

export default function ShareCard({ score, label, badge }: ShareCardProps) {
  if (!badge) return null;

  const badgeUrl = `${BASE}/api/badge/${badge.owner}/${badge.repo}`;
  const reportUrl = `${BASE}/report/${badge.owner}/${badge.repo}`;
  const markdown = `[![TrustStar](${badgeUrl})](${reportUrl})`;
  const svgDataUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(buildBadgeSvg(score ?? null, label ?? null))}`;

  return (
    <div
      style={{
        marginTop: 24,
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: "20px 24px",
        boxShadow: "var(--shadow-xs)",
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: "var(--text-secondary)",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          marginBottom: 16,
        }}
      >
        Add badge to your README
      </div>

      {/* Inline SVG badge preview */}
      <div style={{ marginBottom: 14 }}>
        <img
          src={svgDataUri}
          alt={`TrustStar ${score} ${label}`}
          width={176}
          height={40}
          style={{ display: "block", borderRadius: 6 }}
        />
      </div>

      {/* Markdown snippet */}
      <div style={{ position: "relative" }}>
        <pre
          style={{
            background: "var(--bg-base)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "10px 44px 10px 12px",
            fontSize: 11,
            fontFamily: "var(--font-ibm-mono), monospace",
            color: "var(--text-primary)",
            overflowX: "auto",
            margin: 0,
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
            lineHeight: 1.5,
          }}
        >
          {markdown}
        </pre>
        <CopyButton text={markdown} />
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 8,
          flexWrap: "wrap",
          gap: 6,
        }}
      >
        <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
          Badge updates automatically every hour.
        </span>
        <a
          href={badgeUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: 11,
            color: "var(--text-secondary)",
            textDecoration: "underline",
            textUnderlineOffset: 2,
          }}
        >
          Preview badge →
        </a>
      </div>
    </div>
  );
}
