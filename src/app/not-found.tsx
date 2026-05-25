"use client";

import Link from "next/link";

export default function NotFound() {
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
          width: 56,
          height: 56,
          background: "var(--accent-subtle)",
          border: "1px solid var(--accent-muted)",
          borderRadius: "var(--radius-lg)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 24,
          marginBottom: 20,
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
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
        Repository not found
      </h1>

      <p
        style={{
          fontSize: 14,
          color: "var(--text-secondary)",
          lineHeight: 1.6,
          maxWidth: 320,
          marginBottom: 28,
        }}
      >
        This GitHub repository does not exist or the analysis failed. Check
        the URL and try again.
      </p>

      <Link
        href="/"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "8px 18px",
          background: "var(--accent)",
          color: "#fff",
          borderRadius: "var(--radius)",
          fontSize: 13,
          fontWeight: 500,
          textDecoration: "none",
          transition: "background 0.15s",
          boxShadow: "0 1px 3px rgba(217,54,54,0.2)",
        }}
      >
        ← Back to Home
      </Link>
    </main>
  );
}
