"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error.digest ?? error.message);
  }, [error]);

  return (
    <main
      style={{
        minHeight: "calc(100vh - var(--header-h))",
        background: "var(--bg-base)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 24px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: "var(--dangerous-bg)",
          border: "1px solid #FCA5A5",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 20,
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--dangerous)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </div>

      <h1
        style={{
          fontSize: 20,
          fontWeight: 700,
          color: "var(--text-primary)",
          letterSpacing: "-0.4px",
          marginBottom: 8,
        }}
      >
        Something went wrong
      </h1>

      <p
        style={{
          fontSize: 14,
          color: "var(--text-secondary)",
          lineHeight: 1.65,
          maxWidth: 360,
          marginBottom: 28,
        }}
      >
        An unexpected error occurred. Try again or go back to the home page.
      </p>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        <button
          onClick={reset}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "9px 20px",
            background: "var(--accent)",
            color: "#fff",
            borderRadius: "var(--radius)",
            fontSize: 13,
            fontWeight: 500,
            border: "none",
            cursor: "pointer",
            fontFamily: "inherit",
            boxShadow: "0 1px 3px rgba(217,54,54,0.2)",
          }}
        >
          Try again
        </button>

        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "9px 20px",
            background: "none",
            color: "var(--text-secondary)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            fontSize: 13,
            fontWeight: 500,
            textDecoration: "none",
          }}
        >
          ← Back to Home
        </Link>
      </div>
    </main>
  );
}
