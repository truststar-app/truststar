"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

const BASE = "https://truststar.co";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(label: string): string {
  if (label === "SAFE") return "#16A34A";
  if (label === "DANGEROUS") return "#DC2626";
  if (label === "SUSPICIOUS") return "#D97706";
  return "#6B6B76"; // NEW or unknown
}

function scoreBg(label: string): string {
  if (label === "SAFE") return "#F0FDF4";
  if (label === "DANGEROUS") return "#FEF2F2";
  if (label === "SUSPICIOUS") return "#FFFBEB";
  return "#F4F4F5";
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

// ─── QR block ─────────────────────────────────────────────────────────────────

function QRBlock({
  url,
  filename,
  analyzedAt,
  score,
  label,
}: {
  url: string;
  filename: string;
  analyzedAt?: string;
  score?: number;
  label?: string;
}) {
  const [dataUrl, setDataUrl] = useState("");
  const generatingRef = useRef(false);

  useEffect(() => {
    if (generatingRef.current) return;
    generatingRef.current = true;

    const canvas = document.createElement("canvas");

    QRCode.toCanvas(canvas, url, {
      width: 240,
      margin: 2,
      errorCorrectionLevel: "H",
      color: { dark: "#0C0C0D", light: "#FFFFFF" },
    })
      .then(() => {
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          setDataUrl(canvas.toDataURL("image/png"));
          return;
        }

        const logo = new Image();
        logo.src = "/30px-logo.webp";
        logo.onload = () => {
          const cx = canvas.width / 2;
          const cy = canvas.height / 2;
          const radius = 22;
          const logoSize = 28;

          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          ctx.fillStyle = "#FFFFFF";
          ctx.fill();

          ctx.strokeStyle = "#D93636";
          ctx.lineWidth = 2.5;
          ctx.stroke();

          ctx.drawImage(logo, cx - logoSize / 2, cy - logoSize / 2, logoSize, logoSize);

          setDataUrl(canvas.toDataURL("image/png"));
        };
        logo.onerror = () => {
          setDataUrl(canvas.toDataURL("image/png"));
        };
      })
      .catch(() => {
        generatingRef.current = false;
      });
  }, [url]);

  function download() {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `truststar-qr-${filename}.png`;
    a.click();
  }

  const formattedDate = analyzedAt
    ? new Date(analyzedAt).toLocaleString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  const color = label ? scoreColor(label) : "var(--text-primary)";
  const bg = label ? scoreBg(label) : "var(--bg-hover)";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
        textAlign: "center",
      }}
    >
      {/* QR image */}
      {dataUrl ? (
        <img
          src={dataUrl}
          alt="QR code"
          width={140}
          height={140}
          style={{ borderRadius: 8, border: "1px solid var(--border)", display: "block" }}
        />
      ) : (
        <div
          style={{
            width: 140,
            height: 140,
            background: "var(--bg-hover)",
            borderRadius: 8,
            border: "1px solid var(--border)",
          }}
        />
      )}

      {/* Score + label pill */}
      {score !== undefined && label && (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 12px",
            borderRadius: 20,
            background: bg,
            border: `1px solid ${color}33`,
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-ibm-mono), monospace",
              fontSize: 16,
              fontWeight: 700,
              color,
            }}
          >
            {score}
          </span>
          <span style={{ color: "var(--text-tertiary)", fontSize: 13 }}>·</span>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color,
              letterSpacing: "0.5px",
            }}
          >
            {label}
          </span>
        </div>
      )}

      {/* URL */}
      <span
        style={{
          fontFamily: "var(--font-ibm-mono), monospace",
          fontSize: 10,
          color: "var(--text-tertiary)",
          wordBreak: "break-all",
          maxWidth: 220,
          lineHeight: 1.4,
        }}
      >
        {url}
      </span>

      {/* Date */}
      {formattedDate && (
        <span style={{ fontSize: 11, color: "var(--text-tertiary)", fontStyle: "italic" }}>
          Analyzed on {formattedDate}
        </span>
      )}

      {/* Download button */}
      <button
        onClick={download}
        disabled={!dataUrl}
        style={{
          fontSize: 12,
          fontWeight: 500,
          fontFamily: "inherit",
          padding: "6px 16px",
          borderRadius: "var(--radius)",
          border: "1px solid var(--border)",
          background: "var(--bg-base)",
          color: "var(--text-secondary)",
          cursor: dataUrl ? "pointer" : "default",
          transition: "color 0.12s, border-color 0.12s",
          opacity: dataUrl ? 1 : 0.4,
        }}
        onMouseEnter={(e) => {
          if (!dataUrl) return;
          (e.currentTarget as HTMLElement).style.color = "var(--accent)";
          (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
          (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
        }}
      >
        Download QR
      </button>
    </div>
  );
}

// ─── Badge README block ────────────────────────────────────────────────────────

function BadgeReadmeBlock({ owner, repo }: { owner: string; repo: string }) {
  const badgeUrl = `${BASE}/api/badge/${owner}/${repo}`;
  const reportUrl = `${BASE}/report/${owner}/${repo}`;
  const markdown = `[![TrustStar](${badgeUrl})](${reportUrl})`;

  return (
    <div
      style={{
        marginTop: 12,
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: "16px 20px",
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
          marginBottom: 12,
        }}
      >
        Add badge to your README
      </div>

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
          Preview badge
        </a>
      </div>
    </div>
  );
}

// ─── ShareCard ────────────────────────────────────────────────────────────────

interface ShareCardProps {
  url: string;
  filename: string;
  analyzedAt?: string;
  score?: number;
  label?: string;
  badge?: { owner: string; repo: string };
}

export default function ShareCard({
  url,
  filename,
  analyzedAt,
  score,
  label,
  badge,
}: ShareCardProps) {
  return (
    <>
      {/* QR / share block */}
      <div
        style={{
          marginTop: 24,
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: 10,
          padding: "20px 24px",
          boxShadow: "var(--shadow-xs)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
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
            alignSelf: "flex-start",
          }}
        >
          Share this report
        </div>

        <QRBlock
          url={url}
          filename={filename}
          analyzedAt={analyzedAt}
          score={score}
          label={label}
        />
      </div>

      {/* Badge README block */}
      {badge && <BadgeReadmeBlock owner={badge.owner} repo={badge.repo} />}
    </>
  );
}
