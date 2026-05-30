"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";

const BASE = "https://truststar.co";

// ─── Static SVG previews (no QR — live badge includes QR) ────────────────────

function badgePreviewSvg(score: number, label: string, color: string): string {
  const W = 164; const H = 36; const LW = 92; const SW = 72;
  const sc = LW + Math.round(SW / 2);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><clipPath id="r${label}"><rect width="${W}" height="${H}" rx="5" fill="#fff"/></clipPath><g clip-path="url(#r${label})"><rect width="${LW}" height="${H}" fill="#1C1C1E"/><rect x="${LW}" width="${SW}" height="${H}" fill="${color}"/></g><rect width="${W}" height="${H}" rx="5" fill="none" stroke="#D1D5DB" stroke-width="1"/><g font-family="Verdana,Geneva,DejaVu Sans,sans-serif"><text x="10" y="24" font-size="13" font-weight="700" fill="#D93636">&#9679;</text><text x="22" y="23" font-size="10" font-weight="700" fill="#FFFFFF">TrustStar</text><text x="${sc}" y="19" text-anchor="middle" font-size="13" font-weight="800" fill="#FFFFFF">${score}</text><text x="${sc}" y="29" text-anchor="middle" font-size="8" font-weight="600" fill="#FFFFFF" fill-opacity="0.9">${label}</text></g></svg>`;
}

function safeSvg():       string { return badgePreviewSvg(87, "SAFE",      "#16A34A"); }
function cautionSvg():    string { return badgePreviewSvg(62, "CAUTION",   "#D97706"); }
function dangerousSvg():  string { return badgePreviewSvg(23, "DANGEROUS", "#DC2626"); }

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

// ─── Autocomplete search ──────────────────────────────────────────────────────

type RepoSuggestion = {
  full_name: string;
  description: string | null;
  stargazers_count: number;
  language: string | null;
};

function RepoSearchInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const [suggestions, setSuggestions] = useState<RepoSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
        setActiveIndex(-1);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const val = value.trim();
    if (val.length < 3) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/github-search?q=${encodeURIComponent(val)}`);
        if (res.ok) {
          const data = (await res.json()) as { items: RepoSuggestion[] };
          setSuggestions(data.items ?? []);
          setShowDropdown((data.items ?? []).length > 0);
          setActiveIndex(-1);
        }
      } catch {
        // ignore
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value]);

  const select = useCallback((item: RepoSuggestion) => {
    onChange(item.full_name);
    setSuggestions([]);
    setShowDropdown(false);
    setActiveIndex(-1);
  }, [onChange]);

  function formatStars(n: number): string {
    if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
    return String(n);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showDropdown || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      select(suggestions[activeIndex]);
    } else if (e.key === "Escape") {
      setShowDropdown(false);
      setActiveIndex(-1);
    }
  }

  return (
    <div ref={wrapperRef} style={{ position: "relative", width: "100%" }}>
      <div style={{ position: "relative" }}>
        <input
          type="text"
          placeholder="owner/repo or https://github.com/owner/repo"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
          onKeyDown={handleKeyDown}
          style={{
            width: "100%",
            padding: "10px 36px 10px 14px",
            fontSize: 14,
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            color: "var(--text-primary)",
            outline: "none",
            fontFamily: "var(--font-ibm-mono), monospace",
            boxSizing: "border-box" as const,
            transition: "border-color 0.12s",
          }}
          onFocusCapture={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)"; }}
          onBlur={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
        />
        {searching && (
          <div
            style={{
              position: "absolute",
              right: 10,
              top: "50%",
              transform: "translateY(-50%)",
              width: 14,
              height: 14,
              border: "2px solid var(--border)",
              borderTopColor: "var(--accent)",
              borderRadius: "50%",
              animation: "spin 0.7s linear infinite",
            }}
          />
        )}
      </div>

      {showDropdown && suggestions.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
            zIndex: 50,
            overflow: "hidden",
          }}
        >
          {suggestions.map((item, i) => (
            <div
              key={item.full_name}
              onMouseDown={(e) => { e.preventDefault(); select(item); }}
              style={{
                padding: "9px 14px",
                cursor: "pointer",
                background: i === activeIndex ? "var(--bg-hover)" : "transparent",
                borderBottom: i < suggestions.length - 1 ? "1px solid var(--border)" : "none",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
              }}
              onMouseEnter={() => setActiveIndex(i)}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", fontFamily: "var(--font-ibm-mono), monospace" }}>
                  {item.full_name}
                </div>
                {item.description && (
                  <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {item.description}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, fontSize: 11, color: "var(--text-tertiary)" }}>
                {item.language && <span>{item.language}</span>}
                <span
                  style={{
                    fontFamily: "var(--font-ibm-mono), monospace",
                    background: "var(--bg-hover)",
                    border: "1px solid var(--border)",
                    borderRadius: 4,
                    padding: "1px 6px",
                    fontSize: 10,
                    color: "var(--text-secondary)",
                  }}
                >
                  {formatStars(item.stargazers_count)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type CodeTab = "markdown" | "html" | "rst";

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
    { svg: safeSvg(),      label: "SAFE" },
    { svg: cautionSvg(),   label: "CAUTION" },
    { svg: dangerousSvg(), label: "DANGEROUS" },
  ];

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg-base)" }}>
      <div className="badge-page-outer">

        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 32, fontSize: 14, color: "var(--text-tertiary)" }}>
          <Link href="/" style={{ color: "var(--text-tertiary)", textDecoration: "none" }}>Home</Link>
          <span>/</span>
          <span style={{ color: "var(--text-secondary)" }}>Badge</span>
        </div>

        {/* Hero */}
        <div style={{ maxWidth: 600, marginBottom: 40 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 7,
            padding: "5px 16px 5px 12px", background: "var(--bg-surface)",
            border: "1px solid var(--border)", borderRadius: 20, fontSize: 13,
            color: "var(--text-secondary)", marginBottom: 18, boxShadow: "var(--shadow-xs)",
          }}>
            <span style={{ width: 7, height: 7, background: "var(--accent)", borderRadius: "50%" }} />
            Growth Tool
          </div>

          <h1 className="badge-hero-title">
            TrustStar Badge
          </h1>
          <p style={{ fontSize: 16, color: "var(--text-secondary)", lineHeight: 1.65 }}>
            Show your project&apos;s trust score. Add a badge to your README and let your
            users know your repo has been verified.
          </p>
        </div>

        {/* Why add a badge */}
        <section style={{ marginBottom: 52 }}>
          <p style={{ fontSize: 15, color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 24, maxWidth: 620 }}>
            Maintainers who add a TrustStar badge signal transparency and build trust with their users.
            The badge updates automatically — when your project grows organically, your score reflects it.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
            {[
              {
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                ),
                title: "Prove your stars are real",
                desc: "Differentiate your project from repos with inflated metrics. One badge that can't be faked.",
              },
              {
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                    <polyline points="17 6 23 6 23 12"/>
                  </svg>
                ),
                title: "Build trust with adopters",
                desc: "Teams evaluating dependencies check trust signals before npm install. Give them a clear answer.",
              },
              {
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                ),
                title: "Join the transparency movement",
                desc: "6 million fake stars erode trust in open source. Be part of the solution.",
              },
            ].map(({ icon, title, desc }) => (
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
                <span style={{ display: "block", marginBottom: 10, color: "var(--accent)" }}>{icon}</span>
                <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>{title}</p>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Preview */}
        <section style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.4px", color: "var(--text-primary)", marginBottom: 16 }}>
            Preview
          </h2>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-end" }}>
            {previews.map(({ svg, label }) => (
              <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`}
                  alt={label}
                  style={{ display: "block" }}
                />
                <span style={{ fontSize: 11, color: "var(--text-tertiary)", fontFamily: "var(--font-ibm-mono), monospace" }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Generator */}
        <section style={{ marginBottom: 56 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.4px", color: "var(--text-primary)", marginBottom: 8 }}>
            Add to your README
          </h2>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 20 }}>
            Search your repository to generate the badge snippet.
          </p>

          {/* Autocomplete input */}
          <div className="badge-search-wrap">
            <RepoSearchInput value={input} onChange={setInput} />
          </div>

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

        {/* Trusted by */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.4px", color: "var(--text-primary)", marginBottom: 8 }}>
            Join projects that display their trust score
          </h2>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 20 }}>
            Add your badge to be part of the transparency movement.
          </p>

          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 13, color: "var(--text-tertiary)" }}>
              Badge examples will appear here once the repository is public.
            </span>
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
