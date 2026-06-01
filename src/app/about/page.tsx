"use client";

import Link from "next/link";

export default function AboutPage() {
  return (
    <main style={{ maxWidth: 560, margin: "0 auto", padding: "calc(var(--header-h, 48px) + 56px) 24px 80px" }}>

      <div style={{ marginBottom: 40 }}>
        <Link href="/" style={{ fontSize: 13, color: "var(--text-tertiary)", textDecoration: "none" }}>
          ← Home
        </Link>
      </div>

      {/* Header block */}
      <div style={{ marginBottom: 48 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--accent)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12 }}>
          About
        </p>
        <h1 style={{ fontSize: 34, fontWeight: 700, letterSpacing: "-0.9px", color: "var(--text-primary)", lineHeight: 1.1, marginBottom: 0 }}>
          TrustStar
        </h1>
      </div>

      {/* Story */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <p style={{ fontSize: 16, color: "var(--text-secondary)", lineHeight: 1.8 }}>
          French engineer, DevOps and big data background, coding since 13, on GitHub for over
          15 years. In all that time, one thing never went away: that small nagging feeling every
          time I cloned a new repo.
        </p>

        <p style={{ fontSize: 16, color: "var(--text-primary)", lineHeight: 1.8, fontStyle: "italic" }}>
          Is this actually legit? Are these stars real? Is this code safe to run on my machine?
        </p>

        <p style={{ fontSize: 16, color: "var(--text-secondary)", lineHeight: 1.8 }}>
          Not quite the same paranoia as downloading a torrent, but you get the idea. I got tired
          of not having a quick, honest answer. So I built TrustStar, first for myself, then for
          anyone who ever asked the same questions.
        </p>

        <p style={{ fontSize: 16, color: "var(--text-secondary)", lineHeight: 1.8 }}>
          Free, open-source, and built to stay that way. If you have ideas, spotted something off,
          or just want to talk open-source trust, reach out.
        </p>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "var(--border)", margin: "40px 0" }} />

      {/* CTA */}
      <a
        href="https://www.linkedin.com/in/ramdane-a-304b2a200/"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          padding: "11px 20px",
          background: "#0A66C2",
          color: "#fff",
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 600,
          textDecoration: "none",
          transition: "background 0.15s",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#004182"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#0A66C2"; }}
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
        </svg>
        Connect on LinkedIn
      </a>
      <p style={{ marginTop: 12, fontSize: 12, color: "var(--text-tertiary)" }}>
        Feedback, ideas or just a hello are all welcome.
      </p>

    </main>
  );
}
