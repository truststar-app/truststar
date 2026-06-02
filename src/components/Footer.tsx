"use client";

import Link from "next/link";

const GH = "https://github.com/truststar-app/truststar";

export default function Footer() {
  return (
    <footer
      style={{
        borderTop: "1px solid var(--border)",
        background: "rgba(255,255,255,0.88)",
        backdropFilter: "saturate(180%) blur(14px)",
        WebkitBackdropFilter: "saturate(180%) blur(14px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        height: 40,
        gap: 16,
      }}
    >
      <span style={{ fontSize: 11, color: "var(--text-tertiary)", flexShrink: 0 }}>
        © 2026 TrustStar
      </span>
      <nav style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        {[
          { href: "/privacy",               label: "Privacy" },
          { href: "/terms",                 label: "Terms" },
          { href: "/how-it-works",          label: "How it Works" },
          { href: "/api-docs",              label: "API" },
          { href: GH, label: "GitHub", external: true },
        ].map(({ href, label, external }) =>
          external ? (
            <a key={href} href={href} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "var(--text-tertiary)", textDecoration: "none" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-primary)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-tertiary)")}
            >{label}</a>
          ) : (
            <Link key={href} href={href} style={{ fontSize: 11, color: "var(--text-tertiary)", textDecoration: "none" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-primary)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-tertiary)")}
            >{label}</Link>
          )
        )}
      </nav>
    </footer>
  );
}
