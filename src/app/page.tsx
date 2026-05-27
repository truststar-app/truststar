"use client";

import { useState, useRef, useEffect, useCallback, FormEvent, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

// ─── Waitlist Section ──────────────────────────────────────────────────────────

function WaitlistSection() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const val = email.trim().toLowerCase();
    if (!val || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: val }),
      });
      if (res.ok) {
        setStatus("success");
        setEmail("");
      } else {
        const data = (await res.json()) as { error?: string };
        setErrorMsg(data.error ?? "Something went wrong. Please try again.");
        setStatus("error");
      }
    } catch {
      setErrorMsg("Network error. Please try again.");
      setStatus("error");
    }
  }

  return (
    <section
      style={{
        padding: "72px 24px",
        background: "var(--bg-surface)",
        borderTop: "1px solid var(--border)",
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        {status === "success" ? (
          <div>
            <div style={{
              width: 48, height: 48, borderRadius: "50%",
              background: "var(--safe-bg)", border: "1px solid #BBF7D0",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 16px",
            }}>
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
                <path d="M4 11l5.5 5.5L18 7" stroke="var(--safe)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p style={{ fontWeight: 700, fontSize: 20, color: "var(--text-primary)", marginBottom: 6, letterSpacing: "-0.4px" }}>
              You&apos;re in!
            </p>
            <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>We&apos;ll keep you posted.</p>
          </div>
        ) : (
          <>
            <h2 style={{ fontWeight: 700, fontSize: "clamp(20px, 3vw, 26px)", color: "var(--text-primary)", marginBottom: 10, letterSpacing: "-0.5px" }}>
              Stay in the loop
            </h2>
            <p style={{ fontSize: 15, color: "var(--text-secondary)", lineHeight: 1.65, marginBottom: 28, maxWidth: 400, margin: "0 auto 28px" }}>
              Get alerted when we detect suspicious activity on trending repos.
            </p>

            <form onSubmit={handleSubmit}>
              <div style={{ display: "flex", gap: 8, maxWidth: 420, margin: "0 auto" }}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setErrorMsg(""); }}
                  placeholder="you@example.com"
                  disabled={status === "loading"}
                  style={{
                    flex: 1, padding: "10px 14px", fontSize: 14,
                    border: `1px solid ${errorMsg ? "var(--accent)" : "var(--border)"}`,
                    borderRadius: "var(--radius)",
                    background: "var(--bg-base)",
                    color: "var(--text-primary)",
                    fontFamily: "inherit",
                    outline: "none",
                    transition: "border-color 0.15s",
                    minWidth: 0,
                  }}
                  onFocus={(e) => { if (!errorMsg) (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)"; }}
                  onBlur={(e) => { if (!errorMsg) (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
                />
                <button
                  type="submit"
                  disabled={status === "loading"}
                  style={{
                    padding: "10px 20px", fontSize: 14, fontWeight: 600,
                    background: "var(--accent)", color: "#fff",
                    border: "none", borderRadius: "var(--radius)",
                    cursor: status === "loading" ? "not-allowed" : "pointer",
                    opacity: status === "loading" ? 0.7 : 1,
                    fontFamily: "inherit",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                    transition: "background 0.15s",
                    boxShadow: "0 1px 3px rgba(217,54,54,0.2)",
                  }}
                  onMouseEnter={(e) => {
                    if (status !== "loading") (e.currentTarget as HTMLElement).style.background = "var(--accent-hover)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "var(--accent)";
                  }}
                >
                  {status === "loading" ? "..." : "Get updates"}
                </button>
              </div>
              {errorMsg && (
                <p style={{ marginTop: 8, fontSize: 12, color: "var(--accent)", maxWidth: 420, margin: "8px auto 0" }}>{errorMsg}</p>
              )}
            </form>

            <p style={{ marginTop: 14, fontSize: 11, color: "var(--text-tertiary)" }}>
              No spam. Unsubscribe anytime.
            </p>
          </>
        )}
      </div>
    </section>
  );
}

// ─── Phrase marquee ────────────────────────────────────────────────────────────

type PhraseItem = { text: string; type: "question" | "stat"; size: number };
type PhraseRowData = { speed: number; rtl: boolean; mobileHide: boolean; phrases: PhraseItem[] };

const PHRASE_ROWS: PhraseRowData[] = [
  { speed: 35, rtl: false, mobileHide: false, phrases: [
    { text: "Is this repo genuinely popular?", type: "question", size: 20 },
    { text: "6 million fake stars detected on GitHub...", type: "stat", size: 26 },
    { text: "Can you trust this maintainer?", type: "question", size: 16 },
  ]},
  { speed: 22, rtl: true, mobileHide: false, phrases: [
    { text: "1 Lambda can fake 1M weekly downloads...", type: "stat", size: 22 },
    { text: "Are these stars organic?", type: "question", size: 17 },
    { text: "Who actually contributes here?", type: "question", size: 14 },
  ]},
  { speed: 40, rtl: false, mobileHide: false, phrases: [
    { text: "Is this code safe to run?", type: "question", size: 21 },
    { text: "Supply chain attacks up 742% since 2019...", type: "stat", size: 19 },
    { text: "Do the numbers add up?", type: "question", size: 15 },
  ]},
  { speed: 18, rtl: true, mobileHide: false, phrases: [
    { text: "One malicious dependency is all it takes...", type: "stat", size: 24 },
    { text: "Are the download numbers real?", type: "question", size: 18 },
    { text: "Star quality matters more than star count.", type: "question", size: 16 },
  ]},
  { speed: 28, rtl: false, mobileHide: true, phrases: [
    { text: "Who maintains this package?", type: "question", size: 19 },
    { text: "73% of devs use packages with 0 active contributors...", type: "stat", size: 22 },
    { text: "Is this project still active?", type: "question", size: 15 },
  ]},
  { speed: 15, rtl: true, mobileHide: true, phrases: [
    { text: "Trust but verify.", type: "question", size: 32 },
    { text: "Does this code phone home?", type: "question", size: 17 },
    { text: "Fake popularity = real risk.", type: "stat", size: 21 },
  ]},
  { speed: 33, rtl: false, mobileHide: true, phrases: [
    { text: "Is the fork ratio healthy?", type: "question", size: 16 },
    { text: "95% of attacks start with a trusted dependency...", type: "stat", size: 23 },
    { text: "Verify before you install.", type: "question", size: 18 },
  ]},
  { speed: 25, rtl: true, mobileHide: true, phrases: [
    { text: "Hidden credentials. Obfuscated code. Real threats.", type: "stat", size: 20 },
    { text: "Are these issues organic?", type: "question", size: 14 },
    { text: "Open source ≠ safe source.", type: "stat", size: 28 },
  ]},
];

function PhraseRow({ row }: { row: PhraseRowData }) {
  const doubled = [...row.phrases, ...row.phrases];
  return (
    <div style={{ overflow: "hidden" }} className={row.mobileHide ? "phrase-row-mobile-hide" : ""}>
      <div
        className="phrase-marquee"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 64,
          width: "max-content",
          animation: `${row.rtl ? "marquee-rtl" : "marquee-ltr"} ${row.speed}s linear infinite`,
          willChange: "transform",
          padding: "10px 0",
        }}
      >
        {doubled.map((phrase, i) => (
          <span
            key={i}
            style={{
              fontSize: phrase.size,
              fontWeight: phrase.type === "stat" ? 600 : 400,
              fontFamily: "var(--font-ibm-sans), sans-serif",
              color: phrase.type === "stat"
                ? i % 2 === 0 ? "rgba(217,54,54,0.25)" : "rgba(217,54,54,0.22)"
                : i % 2 === 0 ? "rgba(12,12,13,0.18)" : "rgba(12,12,13,0.15)",
              whiteSpace: "nowrap",
              flexShrink: 0,
              letterSpacing: phrase.size > 18 ? "-0.4px" : "0",
            }}
          >
            {phrase.text}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Loading Overlay ───────────────────────────────────────────────────────────

type Mode = "repo" | "npm" | "skill";

function LoadingOverlay({ mode }: { mode: Mode }) {
  const [step, setStep] = useState(0);

  const steps: Record<Mode, string[]> = {
    repo: [
      "Collecting GitHub stargazers…",
      "Analyzing user profiles…",
      "Computing temporal signals…",
      "Evaluating project health…",
      "Aggregating Trust Score…",
    ],
    npm: [
      "Fetching npm download stats…",
      "Loading package metadata…",
      "Cross-referencing GitHub signals…",
      "Computing consistency indicators…",
    ],
    skill: [
      "Fetching repository files…",
      "Parsing SKILL.md…",
      "Running security analyzers…",
      "Computing Safety Score…",
    ],
  };

  const currentSteps = steps[mode];

  useEffect(() => {
    const id = setInterval(
      () => setStep((s) => (s + 1) % currentSteps.length),
      1800
    );
    return () => clearInterval(id);
  }, [currentSteps.length]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(250,250,250,0.96)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
      }}
    >
      <div
        style={{ maxWidth: 400, width: "100%", padding: "0 24px", textAlign: "center" }}
        className="sa-fade-in"
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            border: "2.5px solid var(--accent-muted)",
            borderTopColor: "var(--accent)",
            margin: "0 auto 24px",
          }}
          className="sa-spin"
        />
        <h3 style={{ fontWeight: 600, fontSize: 16, color: "var(--text-primary)", marginBottom: 6, letterSpacing: "-0.3px" }}>
          Analysis in progress…
        </h3>
        <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginBottom: 32, minHeight: 20 }}>
          {currentSteps[step]}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, textAlign: "left" }}>
          <div style={{ background: "var(--accent-subtle)", border: "1px solid var(--accent-muted)", borderRadius: "var(--radius-lg)", padding: "12px 14px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <span style={{ flexShrink: 0, marginTop: 2, color: "var(--accent)", display: "flex" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
                </svg>
              </span>
              <p style={{ fontSize: 12, lineHeight: 1.6, color: "var(--accent-hover)" }}>
                <strong>Objective analysis</strong> — All metrics are open source and auditable.{" "}
                <a href="/how-it-works" style={{ color: "var(--accent)", textDecoration: "underline" }}>Check our methodology</a>.
              </p>
            </div>
          </div>
          <div style={{ background: "var(--bg-hover)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "12px 14px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <span style={{ flexShrink: 0, marginTop: 2, color: "var(--text-tertiary)", display: "flex" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/>
                  <line x1="12" y1="22" x2="12" y2="7"/>
                  <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/>
                  <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
                </svg>
              </span>
              <p style={{ fontSize: 12, lineHeight: 1.6, color: "var(--text-secondary)" }}>
                <strong>Free service</strong> — Please use responsibly to preserve API quotas for everyone.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function HomePage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [mode, setMode] = useState<Mode>("repo");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Autocomplete state ────────────────────────────────────────────────────
  type RepoSuggestion = {
    full_name: string;
    description: string | null;
    stargazers_count: number;
    language: string | null;
  };
  const [suggestions, setSuggestions] = useState<RepoSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
        setActiveIndex(-1);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (mode !== "repo") {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }
    const val = url.trim();
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
        // silently ignore
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [url, mode]);

  const selectSuggestion = useCallback((item: RepoSuggestion) => {
    const [owner, repo] = item.full_name.split("/");
    setUrl(item.full_name);
    setShowDropdown(false);
    setActiveIndex(-1);
    setSuggestions([]);
    setLoading(true);
    fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ owner, repo }),
    })
      .then(() => router.push(`/report/${owner}/${repo}`))
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "An error occurred");
        setLoading(false);
      });
  }, [router]);

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!showDropdown || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      selectSuggestion(suggestions[activeIndex]);
    } else if (e.key === "Escape") {
      setShowDropdown(false);
      setActiveIndex(-1);
    }
  }

  function formatStars(n: number): string {
    if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
    return String(n);
  }

  function parseGitHubUrl(input: string): { owner: string; repo: string } | null {
    const urlMatch = input.match(/github\.com\/([^/]+)\/([^/\s?#]+)/);
    if (urlMatch) return { owner: urlMatch[1], repo: urlMatch[2].replace(/\.git$/, "") };
    const shortMatch = input.trim().match(/^([^/]+)\/([^/\s]+)$/);
    if (shortMatch) return { owner: shortMatch[1], repo: shortMatch[2].replace(/\.git$/, "") };
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const val = url.trim();
    if (!val) return;

    if (mode === "npm") {
      setLoading(true);
      router.push(`/npm/${val.toLowerCase()}`);
      return;
    }

    const parsed = parseGitHubUrl(val);
    if (!parsed) {
      setError(
        mode === "skill"
          ? "Invalid slug. Example: dbalve/fast-io"
          : "Invalid URL. Example: expressjs/express"
      );
      return;
    }

    if (mode === "skill") {
      setLoading(true);
      router.push(`/skill/${parsed.owner}/${parsed.repo}`);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner: parsed.owner, repo: parsed.repo }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error: string };
        throw new Error(data.error ?? "Unknown error");
      }

      router.push(`/report/${parsed.owner}/${parsed.repo}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setLoading(false);
    }
  }

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 600);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Lock scroll on homepage — everything fits in one viewport
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const PLACEHOLDERS: Record<Mode, string> = isMobile
    ? { repo: "owner/repo", npm: "package name", skill: "owner/repo" }
    : { repo: "github.com/owner/repo or owner/repo", npm: "package name — e.g. express, lodash", skill: "owner/repo — e.g. dbalve/fast-io" };

  return (
    <>
      {loading && <LoadingOverlay mode={mode} />}

      <main style={{ background: "var(--bg-base)" }}>

        {/* ─── Hero ─────────────────────────────────────────────────────────── */}
        <section
          id="hero"
          style={{
            position: "relative",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            background: "var(--bg-base)",
            height: "calc(70vh - var(--header-h, 48px))",
          }}
        >
          {/* Phrase marquee — absolute background */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-around",
              pointerEvents: "none",
              userSelect: "none",
              overflow: "hidden",
              maskImage: "linear-gradient(to bottom, transparent 0%, black 8%, black 88%, transparent 100%)",
              WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 8%, black 88%, transparent 100%)",
            }}
          >
            {PHRASE_ROWS.map((row, i) => (
              <PhraseRow key={i} row={row} />
            ))}
          </div>

          {/* Hero content — radial gradient fades phrases behind it */}
          <div
            style={{
              position: "relative",
              zIndex: 2,
              textAlign: "center",
              padding: "5vh 24px 4vh",
              maxWidth: 960,
              width: "100%",
              flex: 1,
              display: "flex",
              alignItems: "center",
              background: "radial-gradient(ellipse 90% 55% at 50% 60%, rgba(250,250,250,0.98) 0%, rgba(250,250,250,0.96) 35%, rgba(250,250,250,0.70) 65%, transparent 90%)",
            }}
          >
          <div style={{ textAlign: "center", maxWidth: 780, width: "100%", margin: "0 auto", flex: 1 }}>

            {/* Logo + title */}
            <div className="hero-row" style={{ marginBottom: 12, justifyContent: "center" }}>
              <Image
                src="/14619e05-69a1-41be-86dc-5ecda5629b3a-removebg-preview.png"
                alt="TrustStar"
                width={64}
                height={64}
                priority
                className="hero-logo"
              />
              <h1
                className="hero-title"
                style={{
                  fontSize: "clamp(26px, 4vw, 44px)",
                  fontWeight: 700,
                  letterSpacing: "-1.5px",
                  lineHeight: 1.1,
                  color: "var(--text-primary)",
                  margin: 0,
                }}
              >
                Trust starts with{" "}
                <span style={{ color: "var(--accent)" }}>transparency.</span>
              </h1>
            </div>

            <p style={{ fontSize: 17, color: "var(--text-secondary)", lineHeight: 1.6, maxWidth: 440, margin: "0 auto 28px" }}>
              Verify any open source project before you depend on it.
            </p>

            {/* Search bar */}
            <div ref={searchWrapperRef} style={{ position: "relative" }}>
              <form onSubmit={handleSubmit}>
                <div className={`search-bar-outer${error ? " has-error" : ""}`}>
                  <div className="search-bar-modes">
                    {(["repo", "npm", "skill"] as Mode[]).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => { setMode(m); setError(null); setShowDropdown(false); }}
                        className="search-bar-mode-btn"
                        style={{
                          background: mode === m ? "var(--accent)" : "none",
                          color: mode === m ? "#fff" : "var(--text-secondary)",
                        }}
                      >
                        {m === "repo" ? "Repo" : m === "npm" ? "npm" : "Code"}
                      </button>
                    ))}
                  </div>

                  <div style={{ flex: 1, display: "flex", alignItems: "center", minWidth: 0 }}>
                    <input
                      ref={inputRef}
                      type="text"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
                      placeholder={PLACEHOLDERS[mode]}
                      disabled={loading}
                      autoFocus
                      className="search-bar-input"
                      style={{ flex: 1 }}
                      autoComplete="off"
                    />
                    {searching && (
                      <span
                        style={{
                          width: 16, height: 16, flexShrink: 0, marginRight: 12,
                          border: "2px solid var(--border)",
                          borderTopColor: "var(--accent)",
                          borderRadius: "50%",
                          display: "inline-block",
                          animation: "spin 0.7s linear infinite",
                        }}
                      />
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !url.trim()}
                    className="search-bar-submit"
                    style={{
                      background: loading || !url.trim() ? "var(--bg-hover)" : "var(--accent)",
                      color: loading || !url.trim() ? "var(--text-tertiary)" : "#fff",
                      cursor: loading || !url.trim() ? "not-allowed" : "pointer",
                    }}
                  >
                    Analyze
                  </button>
                </div>

                {error && (
                  <p style={{ marginTop: 8, fontSize: 12, color: "var(--accent)", maxWidth: 560, margin: "8px auto 0", textAlign: "left" }}>
                    {error}
                  </p>
                )}
              </form>

              {/* Autocomplete dropdown */}
              {showDropdown && suggestions.length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 6px)",
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: "100%",
                    maxWidth: 768,
                    background: "var(--bg-surface)",
                    border: "1.5px solid var(--border)",
                    borderRadius: 12,
                    boxShadow: "0 8px 32px rgba(0,0,0,0.10)",
                    overflow: "hidden",
                    zIndex: 100,
                  }}
                >
                  {suggestions.map((item, i) => (
                    <div
                      key={item.full_name}
                      className="dd-item-hover"
                      onMouseDown={(e) => { e.preventDefault(); selectSuggestion(item); }}
                      onMouseEnter={() => setActiveIndex(i)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "10px 16px",
                        cursor: "pointer",
                        background: i === activeIndex ? "var(--bg-hover)" : "var(--bg-surface)",
                        borderBottom: i < suggestions.length - 1 ? "1px solid var(--border)" : "none",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                          <span style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                            {item.full_name}
                          </span>
                          {item.language && (
                            <span style={{ fontSize: 11, color: "var(--text-tertiary)", background: "var(--bg-hover)", padding: "1px 6px", borderRadius: 4, flexShrink: 0 }}>
                              {item.language}
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <span style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {item.description.length > 80 ? item.description.slice(0, 80) + "…" : item.description}
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0, color: "var(--text-tertiary)", fontSize: 12 }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                        <span>{formatStars(item.stargazers_count)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Examples */}
            <p style={{ marginTop: 12, fontSize: 12, color: "var(--text-tertiary)" }}>
              Try:{" "}
              {[
                { label: "facebook/react", value: "facebook/react", m: "repo" as Mode },
                { label: "express", value: "express", m: "npm" as Mode },
                { label: "vercel/next.js", value: "vercel/next.js", m: "repo" as Mode },
              ].map((ex, i) => (
                <span key={ex.value}>
                  {i > 0 && <span style={{ margin: "0 5px", opacity: 0.4 }}>·</span>}
                  <code
                    onClick={() => { setUrl(ex.value); setMode(ex.m); setError(null); }}
                    style={{
                      fontFamily: "var(--font-ibm-mono), monospace",
                      background: "var(--bg-hover)",
                      padding: "2px 7px",
                      borderRadius: 4,
                      fontSize: 11,
                      cursor: "pointer",
                      transition: "background 0.12s, color 0.12s",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "var(--accent-subtle)";
                      (e.currentTarget as HTMLElement).style.color = "var(--accent)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)";
                      (e.currentTarget as HTMLElement).style.color = "inherit";
                    }}
                  >
                    {ex.label}
                  </code>
                </span>
              ))}
            </p>

          </div>
          </div>

        </section>

      </main>
    </>
  );
}
