"use client";

import Link from "next/link";

export default function AboutPage() {
  return (
    <main style={{ maxWidth: 600, margin: "0 auto", padding: "calc(var(--header-h, 48px) + 56px) 24px 80px" }}>
      <div style={{ marginBottom: 40 }}>
        <Link href="/" style={{ fontSize: 13, color: "var(--text-tertiary)", textDecoration: "none" }}>
          ← Home
        </Link>
      </div>

      <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.8px", color: "var(--text-primary)", marginBottom: 32 }}>
        About TrustStar
      </h1>

      <p style={{ fontSize: 16, color: "var(--text-secondary)", lineHeight: 1.8, marginBottom: 24 }}>
        I&apos;m a French engineer with a background in DevOps, big data architecture, and AI —
        coding since I was 13 and on GitHub for over 15 years. In all that time, one thing never
        went away: that small, nagging feeling every time I cloned a new repo.
      </p>

      <p style={{ fontSize: 16, color: "var(--text-secondary)", lineHeight: 1.8, marginBottom: 24 }}>
        <em style={{ color: "var(--text-primary)", fontStyle: "italic" }}>Is this actually legit?
        Are these stars real? Is this code safe to run on my machine?</em>
      </p>

      <p style={{ fontSize: 16, color: "var(--text-secondary)", lineHeight: 1.8, marginBottom: 24 }}>
        Not quite the same paranoia as downloading a torrent — but on the internet, you&apos;re
        never fully safe. I got tired of not having a quick, honest answer, so I built
        TrustStar — first for myself, then for everyone who&apos;s ever asked the same questions.
      </p>

      <p style={{ fontSize: 16, color: "var(--text-secondary)", lineHeight: 1.8, marginBottom: 48 }}>
        The product is free, open-source, and built to stay that way. I care a lot about
        community feedback — if you have ideas, spotted something off, or just want to talk
        open-source trust, feel free to reach out.
      </p>

      <a
        href="https://www.linkedin.com/in/ramdane-a-304b2a200/"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 20px",
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
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
        </svg>
        Connect on LinkedIn
      </a>

      <p style={{ marginTop: 16, fontSize: 12, color: "var(--text-tertiary)" }}>
        Don&apos;t hesitate to add me — feedback, ideas, or just a hello are all welcome.
      </p>
    </main>
  );
}
