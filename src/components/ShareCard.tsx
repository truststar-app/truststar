"use client";

import { useState } from "react";

const BASE = "https://truststar.co";

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
  badge,
}: ShareCardProps) {
  if (!badge) return null;

  const badgeUrl = `${BASE}/api/badge/${badge.owner}/${badge.repo}`;
  const reportUrl = `${BASE}/report/${badge.owner}/${badge.repo}`;
  const markdown = `[![TrustStar](${badgeUrl})](${reportUrl})`;

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

      {/* Live badge preview */}
      <div style={{ marginBottom: 14 }}>
        <img
          src={badgeUrl}
          alt="TrustStar badge"
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
