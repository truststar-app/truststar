"use client";

import { useState } from "react";
import Link from "next/link";

const BASE = "https://truststar.co";

// ─── Static SVG previews ─────────────────────────────────────────────────────

function safeSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="136" height="20"><linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient><clipPath id="r"><rect width="136" height="20" rx="3" fill="#fff"/></clipPath><g clip-path="url(#r)"><rect width="76" height="20" fill="#555"/><rect x="76" width="60" height="20" fill="#16A34A"/><rect width="136" height="20" fill="url(#s)"/></g><g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11"><text x="38" y="15" fill="#010101" fill-opacity=".3">TrustStar</text><text x="38" y="14">TrustStar</text><text x="106" y="15" fill="#010101" fill-opacity=".3">SAFE 87</text><text x="106" y="14">SAFE 87</text></g></svg>`;
}
function suspiciousSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="185" height="20"><linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient><clipPath id="r"><rect width="185" height="20" rx="3" fill="#fff"/></clipPath><g clip-path="url(#r)"><rect width="76" height="20" fill="#555"/><rect x="76" width="109" height="20" fill="#D97706"/><rect width="185" height="20" fill="url(#s)"/></g><g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11"><text x="38" y="15" fill="#010101" fill-opacity=".3">TrustStar</text><text x="38" y="14">TrustStar</text><text x="131" y="15" fill="#010101" fill-opacity=".3">SUSPICIOUS 52</text><text x="131" y="14">SUSPICIOUS 52</text></g></svg>`;
}
function dangerousSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="172" height="20"><linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient><clipPath id="r"><rect width="172" height="20" rx="3" fill="#fff"/></clipPath><g clip-path="url(#r)"><rect width="76" height="20" fill="#555"/><rect x="76" width="96" height="20" fill="#DC2626"/><rect width="172" height="20" fill="url(#s)"/></g><g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11"><text x="38" y="15" fill="#010101" fill-opacity=".3">TrustStar</text><text x="38" y="14">TrustStar</text><text x="124" y="15" fill="#010101" fill-opacity=".3">DANGEROUS 23</text><text x="124" y="14">DANGEROUS 23</text></g></svg>`;
}

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

// ─── Code block ───────────────────────────────────────────────────────────────

function CodeBlock({ code }: { code: string }) {
  return (
    <div style={{ position: "relative" }}>
      <pre
        style={{
          background: "var(--bg-hover)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: "14px 44px 14px 16px",
          fontSize: 12,
          fontFamily: "var(--font-ibm-mono), monospace",
          color: "var(--text-primary)",
          overflowX: "auto",
          margin: 0,
          whiteSpace: "pre-wrap",
          wordBreak: "break-all",
          lineHeight: 1.55,
        }}
      >
        {code}
      </pre>
      <CopyButton text={code} />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type CodeTab = "markdown" | "html" | "rst";

function BadgeWhy_ShieldIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
}
function BadgeWhy_TrendIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>;
}
function BadgeWhy_RefreshIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>;
}

const WHY_CARDS = [
  { icon: <BadgeWhy_ShieldIcon />, title: "Build Trust", desc: "Users instantly see your project has been independently verified. No fake stars, no hidden risks." },
  { icon: <BadgeWhy_TrendIcon />, title: "Increase Adoption", desc: "Projects with trust signals get more contributors and enterprise adoption." },
  { icon: <BadgeWhy_RefreshIcon />, title: "Always Up to Date", desc: "The badge auto-updates every hour. Re-run your analysis anytime to refresh your score." },
];

export default function BadgePage() {
  const [input, setInput] = useState("");
  const [activeTab, setActiveTab] = useState<CodeTab>("markdown");

  const slug = input.trim().replace(/^https?:\/\/github\.com\//, "");
  const [owner, repo] = slug.split("/");
  const valid = Boolean(owner && repo && !repo.includes("/"));

  const badgeUrl  = valid ? `${BASE}/api/badge/${owner}/${repo}` : `${BASE}/api/badge/owner/repo`;
  const reportUrl = valid ? `${BASE}/report/${owner}/${repo}` : `${BASE}/report/owner/repo`;

  const snippets: Record<CodeTab, string> = {
    markdown: `[![TrustStar](${badgeUrl})](${reportUrl})`,
    html:     `<a href="${reportUrl}">\n  <img src="${badgeUrl}" alt="TrustStar">\n</a>`,
    rst:      `.. image:: ${badgeUrl}\n   :target: ${reportUrl}\n   :alt: TrustStar`,
  };

  const TABS: { id: CodeTab; label: string }[] = [
    { id: "markdown", label: "Markdown" },
    { id: "html",     label: "HTML" },
    { id: "rst",      label: "reStructuredText" },
  ];

  const previews = [
    { svg: safeSvg(),       label: "SAFE" },
    { svg: suspiciousSvg(), label: "SUSPICIOUS" },
    { svg: dangerousSvg(),  label: "DANGEROUS" },
  ];

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg-base)" }}>
      <div style={{ maxWidth: "var(--max-w)", margin: "0 auto", padding: "56px 32px 80px" }}>

        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 32, fontSize: 14, color: "var(--text-tertiary)" }}>
          <Link href="/" style={{ color: "var(--text-tertiary)", textDecoration: "none" }}>Home</Link>
          <span>/</span>
          <span style={{ color: "var(--text-secondary)" }}>Badge</span>
        </div>

        {/* Hero */}
        <div style={{ maxWidth: 600, marginBottom: 56 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 7,
            padding: "5px 16px 5px 12px", background: "var(--bg-surface)",
            border: "1px solid var(--border)", borderRadius: 20, fontSize: 13,
            color: "var(--text-secondary)", marginBottom: 18, boxShadow: "var(--shadow-xs)",
          }}>
            <span style={{ width: 7, height: 7, background: "var(--accent)", borderRadius: "50%" }} />
            Growth Tool
          </div>

          <h1 style={{ fontSize: 42, fontWeight: 700, letterSpacing: "-1.5px", color: "var(--text-primary)", marginBottom: 12 }}>
            TrustStar Badge
          </h1>
          <p style={{ fontSize: 16, color: "var(--text-secondary)", lineHeight: 1.65 }}>
            Show your project&apos;s trust score. Add a badge to your README and let your
            users know your repo has been verified.
          </p>
        </div>

        {/* Preview */}
        <section style={{ marginBottom: 56 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.5px", color: "var(--text-primary)", marginBottom: 20 }}>
            Preview
          </h2>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            {previews.map(({ svg, label }) => (
              <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`}
                  alt={label}
                  style={{ display: "block" }}
                />
                <span style={{ fontSize: 12, color: "var(--text-tertiary)", fontFamily: "var(--font-ibm-mono), monospace" }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Generator */}
        <section style={{ marginBottom: 56 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.5px", color: "var(--text-primary)", marginBottom: 8 }}>
            Add to your README
          </h2>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 20 }}>
            Enter your repository to generate the badge snippets.
          </p>

          {/* Input */}
          <input
            type="text"
            placeholder="owner/repo or https://github.com/owner/repo"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            style={{
              width: "100%",
              maxWidth: 480,
              padding: "10px 14px",
              fontSize: 14,
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              color: "var(--text-primary)",
              outline: "none",
              fontFamily: "var(--font-ibm-mono), monospace",
              marginBottom: 20,
              boxSizing: "border-box" as const,
              transition: "border-color 0.12s",
            }}
            onFocus={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)"; }}
            onBlur={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
          />

          {/* Live badge preview */}
          {valid && (
            <div style={{ marginBottom: 16 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/badge/${owner}/${repo}`} alt="TrustStar badge" style={{ display: "block", marginBottom: 6 }} />
              <p style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                Live preview — runs an analysis if not yet cached.
              </p>
            </div>
          )}

          {/* Code tabs */}
          <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
            {/* Tab bar */}
            <div style={{ display: "flex", borderBottom: "1px solid var(--border)", padding: "0 4px" }}>
              {TABS.map(({ id, label }) => {
                const active = activeTab === id;
                return (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    style={{
                      padding: "9px 14px",
                      fontSize: 13,
                      fontWeight: active ? 600 : 400,
                      color: active ? "var(--accent)" : "var(--text-secondary)",
                      background: "none",
                      border: "none",
                      borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      marginBottom: -1,
                      transition: "color 0.1s",
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Code */}
            <div style={{ padding: 14 }}>
              <CodeBlock code={snippets[activeTab]} />
            </div>
          </div>

          <p style={{ marginTop: 12, fontSize: 13, color: "var(--text-tertiary)" }}>
            The badge updates automatically every hour. Run an analysis first to get your score.
          </p>

          <div style={{ marginTop: 14 }}>
            <Link
              href="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "8px 16px",
                background: "var(--accent)",
                color: "#fff",
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                textDecoration: "none",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--accent-hover)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--accent)"; }}
            >
              Analyze your repo first →
            </Link>
          </div>
        </section>

        {/* Why badges */}
        <section style={{ marginBottom: 56 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.5px", color: "var(--text-primary)", marginBottom: 20 }}>
            Why add the badge?
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
            {WHY_CARDS.map(({ icon, title, desc }) => (
              <div
                key={title}
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: "20px 22px",
                  boxShadow: "var(--shadow-xs)",
                }}
              >
                <span style={{ fontSize: 22, display: "block", marginBottom: 10 }}>{icon}</span>
                <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>{title}</p>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section>
          <div style={{
            background: "var(--bg-surface)", border: "1px solid var(--border)",
            borderRadius: 10, padding: "36px 28px", textAlign: "center",
            boxShadow: "var(--shadow-xs)",
          }}>
            <p style={{ fontSize: 16, color: "var(--text-secondary)", marginBottom: 16 }}>
              Don&apos;t have a score yet?
            </p>
            <Link
              href="/"
              style={{
                display: "inline-flex", alignItems: "center",
                padding: "9px 20px", background: "var(--accent)", color: "#fff",
                borderRadius: 6, fontSize: 14, fontWeight: 600,
                textDecoration: "none", transition: "background 0.15s",
                boxShadow: "0 1px 3px rgba(217,54,54,0.2)",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--accent-hover)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--accent)"; }}
            >
              Get your Trust Score →
            </Link>
          </div>
        </section>

      </div>
    </main>
  );
}
