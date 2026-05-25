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

export default function BadgeShare({ owner, repo }: { owner: string; repo: string }) {
  const badgeUrl  = `${BASE}/api/badge/${owner}/${repo}`;
  const reportUrl = `${BASE}/report/${owner}/${repo}`;
  const markdown  = `[![TrustStar](${badgeUrl})](${reportUrl})`;

  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: "24px 28px",
        marginTop: 20,
        boxShadow: "var(--shadow-xs)",
      }}
    >
      <h3
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: "var(--text-primary)",
          marginBottom: 4,
        }}
      >
        Share your score
      </h3>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
        Add this badge to your README to show your trust score.
      </p>

      {/* Badge preview */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/badge/${owner}/${repo}`}
        alt="TrustStar badge"
        style={{ display: "block", marginBottom: 16 }}
      />

      {/* Snippet */}
      <div style={{ position: "relative" }}>
        <pre
          style={{
            background: "var(--bg-base)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "12px 40px 12px 14px",
            fontSize: 12,
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

      <p
        style={{
          marginTop: 10,
          fontSize: 12,
          color: "var(--text-tertiary)",
        }}
      >
        The badge updates automatically every hour.
      </p>
    </div>
  );
}
