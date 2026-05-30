"use client";

import Image from "next/image";
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
      <Image
        src="/logo.png"
        alt="TrustStar"
        width={80}
        height={80}
        style={{ marginBottom: 24 }}
      />

      <h1
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: "var(--text-primary)",
          letterSpacing: "-0.5px",
          marginBottom: 10,
        }}
      >
        Page not found
      </h1>

      <p
        style={{
          fontSize: 14,
          color: "var(--text-secondary)",
          lineHeight: 1.65,
          maxWidth: 340,
          marginBottom: 32,
        }}
      >
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        <Link
          href="/"
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
            textDecoration: "none",
            transition: "background 0.15s",
            boxShadow: "0 1px 3px rgba(217,54,54,0.2)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "var(--accent-hover)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "var(--accent)";
          }}
        >
          ← Back to Home
        </Link>

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
            transition: "border-color 0.15s, color 0.15s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "var(--text-secondary)";
            (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
            (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
          }}
        >
          Analyze a project →
        </Link>
      </div>
    </main>
  );
}
