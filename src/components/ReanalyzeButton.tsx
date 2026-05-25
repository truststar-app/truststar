"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ReanalyzeButton({ owner, repo }: { owner: string; repo: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner, repo, force: true }),
      });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      style={{
        marginLeft: "auto",
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontSize: 12,
        fontWeight: 500,
        padding: "5px 12px",
        borderRadius: "var(--radius)",
        border: "1px solid var(--border)",
        background: "var(--bg-surface)",
        color: loading ? "var(--text-tertiary)" : "var(--text-secondary)",
        cursor: loading ? "not-allowed" : "pointer",
        fontFamily: "inherit",
        flexShrink: 0,
      }}
    >
      {loading ? "Analyzing…" : "↻ Re-analyze"}
    </button>
  );
}
