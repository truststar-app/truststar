"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

const BASE = "https://truststar.co";

// ─── Copy button ──────────────────────────────────────────────────────────────

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

// ─── QR section ───────────────────────────────────────────────────────────────

function QRSection({
  url,
  filename,
  analyzedAt,
}: {
  url: string;
  filename: string;
  analyzedAt?: string;
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

          // White filled circle
          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          ctx.fillStyle = "#FFFFFF";
          ctx.fill();

          // Red border
          ctx.strokeStyle = "#D93636";
          ctx.lineWidth = 2.5;
          ctx.stroke();

          // Logo centred inside circle
          ctx.drawImage(logo, cx - logoSize / 2, cy - logoSize / 2, logoSize, logoSize);

          setDataUrl(canvas.toDataURL("image/png"));
        };
        logo.onerror = () => {
          // Fallback: no logo, just plain QR
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

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
        textAlign: "center",
        minWidth: 0,
      }}
    >
      {/* QR image */}
      {dataUrl ? (
        <img
          src={dataUrl}
          alt="QR code"
          width={120}
          height={120}
          style={{ borderRadius: 6, border: "1px solid var(--border-subtle)", flexShrink: 0 }}
        />
      ) : (
        <div
          style={{
            width: 120,
            height: 120,
            background: "var(--bg-hover)",
            borderRadius: 6,
            border: "1px solid var(--border-subtle)",
            flexShrink: 0,
          }}
        />
      )}

      {/* URL */}
      <span
        style={{
          fontFamily: "var(--font-ibm-mono), monospace",
          fontSize: 10,
          color: "var(--text-tertiary)",
          wordBreak: "break-all",
          maxWidth: 200,
          userSelect: "text",
          lineHeight: 1.4,
        }}
      >
        {url}
      </span>

      {/* Date */}
      {formattedDate && (
        <span
          style={{
            fontSize: 11,
            color: "var(--text-tertiary)",
            fontStyle: "italic",
          }}
        >
          Analyzed on {formattedDate}
        </span>
      )}

      {/* Scan hint */}
      <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
        Scan to verify
      </span>

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

// ─── Badge section ────────────────────────────────────────────────────────────

function BadgeSection({ owner, repo }: { owner: string; repo: string }) {
  const badgeUrl = `${BASE}/api/badge/${owner}/${repo}`;
  const reportUrl = `${BASE}/report/${owner}/${repo}`;
  const markdown = `[![TrustStar](${badgeUrl})](${reportUrl})`;

  return (
    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
          README badge
        </div>
        <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6 }}>
          Add this badge to your README to show your trust score.
        </p>
      </div>

      {/* Badge preview */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/badge/${owner}/${repo}`}
        alt="TrustStar badge"
        height={20}
        style={{ display: "block", height: 20, width: "auto" }}
      />

      {/* Snippet */}
      <div style={{ position: "relative" }}>
        <pre
          style={{
            background: "var(--bg-base)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "12px 40px 12px 14px",
            fontSize: 11,
            fontFamily: "var(--font-ibm-mono), monospace",
            color: "var(--text-primary)",
            overflowX: "auto",
            margin: 0,
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
          }}
        >
          {markdown}
        </pre>
        <CopyButton text={markdown} />
      </div>

      <p style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
        The badge updates automatically every hour.
      </p>
    </div>
  );
}

// ─── ShareCard ────────────────────────────────────────────────────────────────

interface ShareCardProps {
  url: string;
  filename: string;
  analyzedAt?: string;
  badge?: { owner: string; repo: string };
}

export default function ShareCard({ url, filename, analyzedAt, badge }: ShareCardProps) {
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
      {/* Header */}
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
        Share this report
      </div>

      {/* Body */}
      <div
        style={{
          display: "flex",
          gap: 24,
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        {badge && (
          <>
            <BadgeSection owner={badge.owner} repo={badge.repo} />
            <div
              style={{
                width: 1,
                alignSelf: "stretch",
                background: "var(--border)",
                flexShrink: 0,
              }}
            />
          </>
        )}

        <QRSection url={url} filename={filename} analyzedAt={analyzedAt} />
      </div>
    </div>
  );
}
