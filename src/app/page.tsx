"use client";

import React, { useState, useRef, useEffect, useCallback, FormEvent, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

// ─── Phrase marquee ────────────────────────────────────────────────────────────

type PhraseItem = { text: string; type: "question" | "stat"; size: number };
type PhraseRowData = { speed: number; rtl: boolean; mobileHide: boolean; phrases: PhraseItem[] };

const PHRASE_ROWS: PhraseRowData[] = [
  { speed: 130, rtl: false, mobileHide: false, phrases: [
    { text: "Is this repo genuinely popular?", type: "question", size: 20 },
    { text: "6 million fake stars detected on GitHub...", type: "stat", size: 26 },
    { text: "Would you run code nobody reviewed?", type: "question", size: 17 },
  ]},
  { speed: 97, rtl: true, mobileHide: false, phrases: [
    { text: "Are these stars organic?", type: "question", size: 17 },
    { text: "npm downloads are trivially inflatable. 1 Lambda function = 1M fake downloads per week.", type: "stat", size: 20 },
    { text: "Is the last commit from a real person?", type: "question", size: 15 },
  ]},
  { speed: 155, rtl: false, mobileHide: false, phrases: [
    { text: "Is this code safe to run?", type: "question", size: 21 },
    { text: "Supply chain attacks up 742% since 2019.", type: "stat", size: 19 },
    { text: "npm install with your eyes closed?", type: "question", size: 18 },
  ]},
  { speed: 78, rtl: true, mobileHide: false, phrases: [
    { text: "Are the download numbers real?", type: "question", size: 18 },
    { text: "One malicious dependency is all it takes.", type: "stat", size: 24 },
    { text: "When did this repo last get a real commit?", type: "question", size: 15 },
  ]},
  { speed: 115, rtl: false, mobileHide: true, phrases: [
    { text: "Who maintains this package?", type: "question", size: 19 },
    { text: "Fake stars hide real malware.", type: "stat", size: 23 },
    { text: "Has the maintainer gone silent?", type: "question", size: 17 },
  ]},
  { speed: 67, rtl: true, mobileHide: true, phrases: [
    { text: "Trust but verify.", type: "question", size: 32 },
    { text: "78 repos gamed GitHub Trending with bought stars.", type: "stat", size: 16 },
    { text: "Does this code phone home?", type: "question", size: 17 },
  ]},
  { speed: 140, rtl: false, mobileHide: true, phrases: [
    { text: "Verify before you install.", type: "question", size: 18 },
    { text: "95% of attacks start with a trusted dependency.", type: "stat", size: 22 },
    { text: "Who reviewed the last release?", type: "question", size: 16 },
  ]},
  { speed: 106, rtl: true, mobileHide: true, phrases: [
    { text: "Open source ≠ safe source.", type: "question", size: 28 },
    { text: "Hidden credentials. Obfuscated code. Real threats.", type: "stat", size: 18 },
    { text: "Are these issues organic?", type: "question", size: 14 },
  ]},
];

function PhraseRow({ row }: { row: PhraseRowData }) {
  // Repeat 8× so the track is always wider than any viewport — -50% animation stays seamless
  const doubled = [...Array(8)].flatMap(() => row.phrases);
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
                ? i % 2 === 0 ? "rgba(217,54,54,0.40)" : "rgba(217,54,54,0.34)"
                : i % 2 === 0 ? "rgba(12,12,13,0.28)" : "rgba(12,12,13,0.22)",
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

// ─── Preview Block ─────────────────────────────────────────────────────────────

type Mode = "repo" | "npm" | "skill";

type SignalItem = { color: "green" | "orange" | "red" | "gray"; text: string };

const REPO_ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
  </svg>
);
const NPM_ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
  </svg>
);
const CODE_ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
  </svg>
);

const SIGNAL_COLORS: Record<SignalItem["color"], { dot: string; bg: string; border: string; text: string }> = {
  green:  { dot: "#16A34A", bg: "#F0FDF4", border: "#BBF7D0", text: "#15803D" },
  orange: { dot: "#D97706", bg: "#FFFBEB", border: "#FDE68A", text: "#B45309" },
  red:    { dot: "#DC2626", bg: "#FEF2F2", border: "#FECACA", text: "#B91C1C" },
  gray:   { dot: "#A0A0AB", bg: "#F4F4F5", border: "#E4E4E7", text: "#6B6B76" },
};

function SignalRow({ signals }: { signals: SignalItem[] }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 7 }}>
      {signals.map((s, i) => {
        const c = SIGNAL_COLORS[s.color];
        return (
          <span key={i} style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "5px 12px", borderRadius: 20,
            fontSize: 12, fontWeight: 600,
            background: c.bg, border: `1px solid ${c.border}`, color: c.text,
            lineHeight: 1,
          }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: c.dot, flexShrink: 0, display: "inline-block" }} />
            {s.text}
          </span>
        );
      })}
    </div>
  );
}

const PREVIEW_DATA: Record<Mode, {
  icon: React.ReactNode;
  title: string;
  quote: string;
  signals: SignalItem[];
}> = {
  repo: {
    icon: REPO_ICON,
    title: "Trust Score",
    quote: "Over 6M fake stars detected on GitHub. For $0.03 per star, anyone can fake popularity.",
    signals: [
      { color: "green",  text: "Stargazer profile analysis" },
      { color: "green",  text: "Account age & activity" },
      { color: "orange", text: "Burst detection" },
      { color: "green",  text: "Fork/star ratio" },
      { color: "green",  text: "Commit velocity" },
      { color: "orange", text: "Lockstep patterns" },
    ],
  },
  npm: {
    icon: NPM_ICON,
    title: "npm Check",
    quote: "npm downloads are trivially inflatable. 1 Lambda function = 1M fake downloads per week.",
    signals: [
      { color: "green",  text: "Download consistency" },
      { color: "green",  text: "Stars vs. downloads" },
      { color: "green",  text: "Maintainer count" },
      { color: "orange", text: "Install scripts" },
      { color: "green",  text: "Package age" },
      { color: "green",  text: "Version history" },
    ],
  },
  skill: {
    icon: CODE_ICON,
    title: "Code Scan",
    quote: "95% of supply chain attacks start with a trusted dependency.",
    signals: [
      { color: "green",  text: "Network calls" },
      { color: "green",  text: "File system access" },
      { color: "red",    text: "Obfuscated code" },
      { color: "orange", text: "Hardcoded secrets" },
      { color: "green",  text: "Dependency pinning" },
      { color: "orange", text: "Shell execution" },
    ],
  },
};

function PreviewBlock({ mode }: { mode: Mode }) {
  const [displayedMode, setDisplayedMode] = useState<Mode>(mode);
  const [phase, setPhase] = useState<"in" | "out">("in");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (mode === displayedMode) return;
    setPhase("out");
    timerRef.current = setTimeout(() => {
      setDisplayedMode(mode);
      setPhase("in");
    }, 150);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [mode, displayedMode]);

  const d = PREVIEW_DATA[displayedMode];

  return (
    <div
      className="preview-block"
      style={{
        maxWidth: 640,
        width: "100%",
        margin: "14px auto 0",
        textAlign: "left",
        background: "rgba(255,255,255,0.94)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
        padding: "20px 24px",
        opacity: phase === "in" ? 1 : 0,
        transform: phase === "in" ? "translateY(0)" : "translateY(6px)",
        transition: phase === "in"
          ? "opacity 250ms ease, transform 250ms ease"
          : "opacity 150ms ease, transform 150ms ease",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10 }}>
        <span style={{ color: "var(--accent)", display: "flex", flexShrink: 0 }}>{d.icon}</span>
        <span style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)", letterSpacing: "-0.3px" }}>
          {d.title}
        </span>
      </div>

      {/* Quote */}
      <p style={{
        fontSize: 13, lineHeight: 1.65, color: "var(--text-secondary)",
        fontStyle: "italic", marginBottom: 14,
        paddingLeft: 12,
        borderLeft: "2px solid var(--accent)",
      }}>
        &ldquo;{d.quote}&rdquo;
      </p>

      {/* Signal pills */}
      <SignalRow signals={d.signals} />
    </div>
  );
}

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

// ─── Loading Overlay ───────────────────────────────────────────────────────────

const SECURITY_TIPS = [
  "Activate two-factor authentication on your GitHub account — it's the single most effective way to prevent unauthorized access.",
  "Reference third-party GitHub Actions by a full commit SHA rather than a mutable tag to prevent supply-chain hijacking.",
  "Enable Dependabot alerts and security updates to automatically detect and patch vulnerable dependencies.",
  "Keep API keys and tokens out of your repository. Use GitHub Actions Secrets or a secrets manager instead.",
  "Enable branch protection rules on `main` to require pull request reviews and status checks before merging.",
  "GitHub's secret scanning automatically flags accidentally committed credentials — enable it in your repo's Security settings.",
  "GPG-sign your commits to prove authorship and make it harder for attackers to impersonate contributors.",
  "Add a CODEOWNERS file to require mandatory reviews from designated owners before sensitive code can be merged.",
  "GitHub's built-in CodeQL analysis detects common security vulnerabilities in your code automatically on every push.",
  "Regularly review and revoke OAuth app access and personal access tokens you no longer use in your account settings.",
];

function LoadingOverlay({ mode }: { mode: Mode }) {
  const [step, setStep] = useState(0);
  const [tipIndex, setTipIndex] = useState(() => Math.floor(Math.random() * SECURITY_TIPS.length));

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
  useEffect(() => {
    const id = setInterval(() => setTipIndex((i) => (i + 1) % SECURITY_TIPS.length), 8000);
    return () => clearInterval(id);
  }, []);

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
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </span>
              <p style={{ fontSize: 12, lineHeight: 1.6, color: "var(--text-secondary)" }}>
                <strong>Unexpected score?</strong> — Check our{" "}
                <a href="/how-it-works" style={{ color: "var(--accent)", textDecoration: "underline" }}>methodology</a>{" "}
                or <a href="mailto:support@truststar.co" style={{ color: "var(--accent)", textDecoration: "underline" }}>contact us</a>.
              </p>
            </div>
          </div>
        </div>

        {/* Security tip */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginTop: 20, padding: "0 4px" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          <p style={{ fontSize: 11, color: "var(--text-tertiary)", lineHeight: 1.55 }}>
            <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>Security tip —</span>{" "}
            {SECURITY_TIPS[tipIndex]}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

type Preset = "standard" | "security" | "community" | "custom";
const PRESETS: Record<Preset, { label: string; wa: number; wt: number; wh: number; wu: number }> = {
  standard:  { label: "Standard",  wa: 26, wt: 23, wh: 26, wu: 25 },
  security:  { label: "Security",  wa: 15, wt: 35, wh: 10, wu: 40 },
  community: { label: "Community", wa: 35, wt: 20, wh: 30, wu: 15 },
  custom:    { label: "Custom",    wa: 26, wt: 23, wh: 26, wu: 25 },
};

export default function HomePage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [mode, setMode] = useState<Mode>("repo");

  // Support deep-linking: /?mode=npm or /?mode=skill pre-selects the tab
  useEffect(() => {
    const m = new URLSearchParams(window.location.search).get("mode");
    if (m === "npm" || m === "skill") setMode(m);
  }, []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Scoring presets ───────────────────────────────────────────────────────
  const [preset, setPreset] = useState<Preset>("standard");
  const [showPresets, setShowPresets] = useState(false);
  const [customW, setCustomW] = useState({ wa: 26, wt: 23, wh: 26, wu: 25 });

  function getWeightsQuery(): string {
    if (preset === "standard") return "";
    const w = preset === "custom" ? customW : PRESETS[preset];
    return `?wa=${w.wa}&wt=${w.wt}&wh=${w.wh}&wu=${w.wu}`;
  }

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
    router.push(`/report/${owner}/${repo}${getWeightsQuery()}`);
  }, [router, getWeightsQuery]);

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
          ? "Invalid slug. Example: vercel/next.js"
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
    router.push(`/report/${parsed.owner}/${parsed.repo}${getWeightsQuery()}`);
  }

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 600);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);


  const PLACEHOLDERS: Record<Mode, string> = isMobile
    ? { repo: "owner/repo", npm: "package name", skill: "owner/repo" }
    : { repo: "github.com/owner/repo or owner/repo", npm: "package name — e.g. express, lodash", skill: "owner/repo — e.g. vercel/next.js" };

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
            height: "calc(80vh - var(--header-h, 48px))",
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
              maskImage: "linear-gradient(to bottom, transparent 0%, black 20%, black 94%, transparent 100%)",
              WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 20%, black 94%, transparent 100%)",
            }}
          >
            {PHRASE_ROWS.map((row, i) => (
              <PhraseRow key={i} row={row} />
            ))}
          </div>

          {/* Hero content */}
          <div
            style={{
              position: "relative",
              zIndex: 2,
              textAlign: "center",
              padding: "0 24px 11vh",
              maxWidth: 960,
              width: "100%",
              flex: 1,
              display: "flex",
              alignItems: "center",
            }}
          >
          <div style={{
            textAlign: "center", maxWidth: 726, width: "100%", margin: "0 auto", flex: 1,
            background: "rgba(250,250,250,0.96)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            borderRadius: 20,
            padding: "24px 31px 22px",
          }}>

            {/* Logo + title */}
            <div className="hero-row" style={{ marginBottom: 12, justifyContent: "center" }}>
              <Image
                src="/logo.png"
                alt="TrustStar"
                width={64}
                height={64}
                priority
                className="hero-logo"
              />
              <h1
                className="hero-title"
                style={{
                  fontSize: "clamp(24px, 3.7vw, 42px)",
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

            <p style={{ fontSize: 16, color: "var(--text-secondary)", lineHeight: 1.6, margin: "0 auto 24px" }}>
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
                        {m === "repo" ? "Repo" : m === "npm" ? "npm" : "Code Scan"}
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

              {/* Scoring presets (repo mode only) */}
              {mode === "repo" && (
                <div style={{ marginTop: 10 }}>
                  <button
                    type="button"
                    onClick={() => setShowPresets((v) => !v)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      fontSize: 11,
                      color: preset !== "standard" ? "var(--accent)" : "var(--text-secondary)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      padding: "2px 0",
                      fontWeight: preset !== "standard" ? 600 : 500,
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>
                    {preset !== "standard" ? `Custom scoring: ${PRESETS[preset].label}` : "Customize scoring"}
                    <span style={{ opacity: 0.5 }}>{showPresets ? "▲" : "▼"}</span>
                  </button>

                  {showPresets && (
                    <div
                      style={{
                        marginTop: 10,
                        background: "var(--bg-base)",
                        border: "1px solid var(--border)",
                        borderRadius: 10,
                        padding: "14px 16px",
                      }}
                    >
                      {/* Preset buttons */}
                      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
                        {(Object.keys(PRESETS) as Preset[]).map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => {
                              setPreset(p);
                              if (p !== "custom") setCustomW(PRESETS[p]);
                            }}
                            style={{
                              fontSize: 12,
                              fontWeight: 500,
                              padding: "5px 14px",
                              borderRadius: 20,
                              border: `1px solid ${preset === p ? "var(--accent)" : "var(--border)"}`,
                              background: preset === p ? "var(--accent-subtle)" : "var(--bg-surface)",
                              color: preset === p ? "var(--accent)" : "var(--text-secondary)",
                              cursor: "pointer",
                              fontFamily: "inherit",
                              transition: "all 0.12s",
                            }}
                          >
                            {PRESETS[p].label}
                          </button>
                        ))}
                      </div>

                      {/* Dimension weight display / sliders */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {[
                          { key: "wa" as const, label: "Account Quality" },
                          { key: "wt" as const, label: "Temporal Behavior" },
                          { key: "wh" as const, label: "Project Health" },
                          { key: "wu" as const, label: "Authenticity" },
                        ].map(({ key, label }) => {
                          const val = preset === "custom" ? customW[key] : PRESETS[preset][key];
                          return (
                            <div key={key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <span style={{ fontSize: 11, color: "var(--text-secondary)", width: 130, flexShrink: 0, textAlign: "left" }}>{label}</span>
                              <input
                                type="range"
                                min={5}
                                max={60}
                                value={val}
                                disabled={preset !== "custom"}
                                onChange={(e) => setCustomW((prev) => ({ ...prev, [key]: Number(e.target.value) }))}
                                style={{ flex: 1, accentColor: "var(--accent)", opacity: preset !== "custom" ? 0.5 : 1 }}
                              />
                              <span style={{ fontSize: 11, fontFamily: "var(--font-ibm-mono), monospace", color: "var(--text-secondary)", width: 32, textAlign: "right" }}>
                                {val}%
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {preset !== "standard" && (
                        <p style={{ marginTop: 10, fontSize: 10, color: "var(--text-tertiary)", lineHeight: 1.5 }}>
                          Weights are normalized automatically. The score on the report will reflect this configuration.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

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

            <PreviewBlock mode={mode} />

          </div>
          </div>

        </section>

      </main>

      <WaitlistSection />
    </>
  );
}
