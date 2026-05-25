"use client";

import { useState, useRef, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

type Mode = "repo" | "npm" | "skill";

type PhraseItem = {
  text: string;
  type: "question" | "stat";
  size: number;
};

type PhraseRowData = {
  speed: number;
  rtl: boolean;
  mobileHide: boolean;
  phrases: PhraseItem[];
};

const PHRASE_ROWS: PhraseRowData[] = [
  {
    speed: 35,
    rtl: false,
    mobileHide: false,
    phrases: [
      { text: "Is this repo genuinely popular?", type: "question", size: 20 },
      { text: "6 million fake stars detected on GitHub...", type: "stat", size: 26 },
      { text: "Can you trust this maintainer?", type: "question", size: 16 },
    ],
  },
  {
    speed: 22,
    rtl: true,
    mobileHide: false,
    phrases: [
      { text: "1 Lambda can fake 1M weekly downloads...", type: "stat", size: 22 },
      { text: "Are these stars organic?", type: "question", size: 17 },
      { text: "Who actually contributes here?", type: "question", size: 14 },
    ],
  },
  {
    speed: 40,
    rtl: false,
    mobileHide: false,
    phrases: [
      { text: "Is this code safe to run?", type: "question", size: 21 },
      { text: "Supply chain attacks up 742% since 2019...", type: "stat", size: 19 },
      { text: "Do the numbers add up?", type: "question", size: 15 },
    ],
  },
  {
    speed: 18,
    rtl: true,
    mobileHide: false,
    phrases: [
      { text: "One malicious dependency is all it takes...", type: "stat", size: 24 },
      { text: "Are the download numbers real?", type: "question", size: 18 },
      { text: "Star quality matters more than star count.", type: "question", size: 16 },
    ],
  },
  {
    speed: 28,
    rtl: false,
    mobileHide: true,
    phrases: [
      { text: "Who maintains this package?", type: "question", size: 19 },
      { text: "73% of devs use packages with 0 active contributors...", type: "stat", size: 22 },
      { text: "Is this project still active?", type: "question", size: 15 },
    ],
  },
  {
    speed: 15,
    rtl: true,
    mobileHide: true,
    phrases: [
      { text: "Trust but verify.", type: "question", size: 32 },
      { text: "Does this code phone home?", type: "question", size: 17 },
      { text: "Fake popularity = real risk.", type: "stat", size: 21 },
    ],
  },
  {
    speed: 33,
    rtl: false,
    mobileHide: true,
    phrases: [
      { text: "Is the fork ratio healthy?", type: "question", size: 16 },
      { text: "95% of attacks start with a trusted dependency...", type: "stat", size: 23 },
      { text: "Verify before you install.", type: "question", size: 18 },
    ],
  },
  {
    speed: 25,
    rtl: true,
    mobileHide: true,
    phrases: [
      { text: "Hidden credentials. Obfuscated code. Real threats.", type: "stat", size: 20 },
      { text: "Are these issues organic?", type: "question", size: 14 },
      { text: "Open source ≠ safe source.", type: "stat", size: 28 },
    ],
  },
];

// ─── Loading Overlay ───────────────────────────────────────────────────────────

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
        style={{
          maxWidth: 400,
          width: "100%",
          padding: "0 24px",
          textAlign: "center",
        }}
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
        <h3
          style={{
            fontWeight: 600,
            fontSize: 16,
            color: "var(--text-primary)",
            marginBottom: 6,
            letterSpacing: "-0.3px",
          }}
        >
          Analysis in progress…
        </h3>
        <p
          style={{
            fontSize: 13,
            color: "var(--text-tertiary)",
            marginBottom: 32,
            minHeight: 20,
          }}
        >
          {currentSteps[step]}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, textAlign: "left" }}>
          <div
            style={{
              background: "var(--accent-subtle)",
              border: "1px solid var(--accent-muted)",
              borderRadius: "var(--radius-lg)",
              padding: "12px 14px",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <span style={{ flexShrink: 0, marginTop: 2, color: "var(--accent)", display: "flex" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
                </svg>
              </span>
              <p style={{ fontSize: 12, lineHeight: 1.6, color: "var(--accent-hover)" }}>
                <strong>Objective analysis</strong> — All metrics are open source and
                auditable.{" "}
                <a href="/how-it-works" style={{ color: "var(--accent)", textDecoration: "underline" }}>
                  Check our methodology
                </a>
                .
              </p>
            </div>
          </div>
          <div
            style={{
              background: "var(--bg-hover)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              padding: "12px 14px",
            }}
          >
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
                <strong>Free service</strong> — Please use responsibly to preserve
                API quotas and ensure availability for everyone.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Phrase Row ────────────────────────────────────────────────────────────────

function PhraseRow({ row }: { row: PhraseRowData }) {
  const doubled = [...row.phrases, ...row.phrases];
  return (
    <div
      style={{ overflow: "hidden" }}
      className={row.mobileHide ? "phrase-row-mobile-hide" : ""}
    >
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
              color:
                phrase.type === "stat"
                  ? i % 2 === 0
                    ? "rgba(217, 54, 54, 0.25)"
                    : "rgba(217, 54, 54, 0.22)"
                  : i % 2 === 0
                  ? "rgba(12, 12, 13, 0.18)"
                  : "rgba(12, 12, 13, 0.15)",
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

function ScoreArc({ score, color, label }: { score: number; color: string; label: string }) {
  const r = 24;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0 }}>
      <svg width="60" height="60" viewBox="0 0 60 60" aria-hidden="true">
        <circle cx="30" cy="30" r={r} fill="none" stroke="var(--border)" strokeWidth="5" />
        <circle
          cx="30" cy="30" r={r} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 30 30)"
        />
        <text
          x="30" y="35" textAnchor="middle"
          style={{ fontSize: 14, fontWeight: "bold", fill: color, fontFamily: "monospace" }}
        >
          {score}
        </text>
      </svg>
      <span style={{ fontSize: 9, fontWeight: 700, color, letterSpacing: "0.5px", textTransform: "uppercase" as const }}>
        {label}
      </span>
    </div>
  );
}

function PreviewBar({ label, pct }: { label: string; pct: number }) {
  const color = pct > 70 ? "var(--safe)" : pct >= 40 ? "var(--suspicious)" : "var(--dangerous)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 12, color: "var(--text-secondary)", flex: 1, whiteSpace: "nowrap" as const }}>{label}</span>
      <div style={{ flex: 2, height: 6, background: "var(--bg-hover)", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 4 }} />
      </div>
      <span style={{ fontSize: 12, fontFamily: "var(--font-ibm-mono), monospace", color: "var(--text-secondary)", width: 36, textAlign: "right" as const }}>{pct}%</span>
    </div>
  );
}

type DotColor = "orange" | "green" | "red" | "gray";
const DOT_COLORS: Record<DotColor, string> = {
  orange: "#D97706",
  green: "#16A34A",
  red: "#DC2626",
  gray: "#A0A0AB",
};

function PreviewFinding({ dot, text }: { dot: DotColor; text: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12, lineHeight: 1.8 }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: DOT_COLORS[dot], display: "inline-block", flexShrink: 0, marginTop: 6 }} />
      <span style={{ color: "var(--text-secondary)" }}>{text}</span>
    </div>
  );
}

function RepoPreview() {
  return (
    <>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <p style={{ fontWeight: 600, fontSize: 18, color: "var(--text-primary)", marginBottom: 2, letterSpacing: "-0.3px" }}>Trust Score</p>
          <p style={{ fontSize: 12, color: "var(--text-tertiary)", fontStyle: "italic" }}>What you&apos;ll discover</p>
        </div>
        <ScoreArc score={87} color="#16A34A" label="SAFE" />
      </div>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", fontStyle: "italic", marginBottom: 16, lineHeight: 1.6 }}>
        &ldquo;Over 6M fake stars detected on GitHub. For $0.01 per star, anyone can fake popularity.&rdquo;
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
        <PreviewBar label="Stargazer Quality" pct={82} />
        <PreviewBar label="Temporal Patterns" pct={89} />
        <PreviewBar label="Project Health" pct={61} />
        <PreviewBar label="Community Signals" pct={95} />
      </div>
      <div style={{ borderTop: "1px solid var(--border)", marginBottom: 12 }} />
      <div style={{ display: "flex", flexDirection: "column" }}>
        <PreviewFinding dot="orange" text="12% of stargazers have accounts younger than 7 days" />
        <PreviewFinding dot="orange" text="Star burst: +2,400 stars in 48h (March 3)" />
        <PreviewFinding dot="green" text="Healthy fork/star ratio (1:18)" />
        <PreviewFinding dot="green" text="Active maintenance — 47 commits last month" />
      </div>
    </>
  );
}

function NpmPreview() {
  const points = [10,14,9,18,16,22,20,28,26,32,30,38,36,43,40,47,44,52,50,57,54,61,58,66,63,70,67,74,71,78];
  const W = 400; const H = 60;
  const maxV = Math.max(...points);
  const pts = points.map((v, i) => `${(i / (points.length - 1)) * W},${H - (v / maxV) * H}`).join(" ");

  return (
    <>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <p style={{ fontWeight: 600, fontSize: 18, color: "var(--text-primary)", marginBottom: 2, letterSpacing: "-0.3px" }}>npm Check</p>
          <p style={{ fontSize: 12, color: "var(--text-tertiary)", fontStyle: "italic" }}>What you&apos;ll discover</p>
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: "var(--radius)", background: "var(--safe-bg)", color: "var(--safe)", border: "1px solid #BBF7D0", alignSelf: "flex-start", flexShrink: 0 }}>
          7 positive signals
        </span>
      </div>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", fontStyle: "italic", marginBottom: 14, lineHeight: 1.6 }}>
        &ldquo;npm downloads are trivially inflatable. 1 Lambda function = 1M fake downloads per week.&rdquo;
      </p>
      <div style={{ background: "var(--accent-subtle)", borderRadius: "var(--radius)", overflow: "hidden", marginBottom: 12 }}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height: 60, display: "block" }} aria-hidden="true">
          <polyline points={pts} fill="none" stroke="#D93636" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
      </div>
      <p style={{ fontSize: 12, fontFamily: "var(--font-ibm-mono), monospace", color: "var(--text-secondary)", marginBottom: 16 }}>
        Weekly: 106.8M · Stars: 69.1k · Maintainers: 5 · Versions: 288
      </p>
      <div style={{ borderTop: "1px solid var(--border)", marginBottom: 12 }} />
      <div style={{ display: "flex", flexDirection: "column" }}>
        <PreviewFinding dot="green" text="Widely adopted — 106.8M weekly downloads" />
        <PreviewFinding dot="green" text="Established package — published since 2010" />
        <PreviewFinding dot="green" text="Multiple maintainers — 5 registered" />
        <PreviewFinding dot="gray" text="Install scripts detected — review before installing" />
      </div>
    </>
  );
}

function CodePreview() {
  return (
    <>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <p style={{ fontWeight: 600, fontSize: 18, color: "var(--text-primary)", marginBottom: 2, letterSpacing: "-0.3px" }}>Code Scan</p>
          <p style={{ fontSize: 12, color: "var(--text-tertiary)", fontStyle: "italic" }}>What you&apos;ll discover</p>
        </div>
        <ScoreArc score={73} color="#D97706" label="SUSPICIOUS" />
      </div>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", fontStyle: "italic", marginBottom: 16, lineHeight: 1.6 }}>
        &ldquo;95% of supply chain attacks start with a trusted dependency.&rdquo;
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
        <PreviewBar label="Network Access" pct={65} />
        <PreviewBar label="File Access" pct={90} />
        <PreviewBar label="Execution" pct={45} />
        <PreviewBar label="Dependencies" pct={82} />
      </div>
      <div style={{ borderTop: "1px solid var(--border)", marginBottom: 12 }} />
      <div style={{ display: "flex", flexDirection: "column" }}>
        <PreviewFinding dot="red" text="Hardcoded URL to unknown domain (3 occurrences)" />
        <PreviewFinding dot="orange" text="Uses eval() with dynamic input" />
        <PreviewFinding dot="green" text="No access to sensitive paths" />
        <PreviewFinding dot="green" text="All dependencies pinned to exact versions" />
      </div>
    </>
  );
}

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
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [mode, displayedMode]);

  return (
    <div
      style={{
        maxWidth: 700,
        width: "100%",
        margin: "28px auto 0",
        textAlign: "left",
        background: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
        padding: "28px 32px",
        opacity: phase === "in" ? 1 : 0,
        transform: phase === "in" ? "translateY(0)" : "translateY(8px)",
        transition: phase === "in"
          ? "opacity 250ms ease, transform 250ms ease"
          : "opacity 150ms ease, transform 150ms ease",
      }}
    >
      {displayedMode === "repo" && <RepoPreview />}
      {displayedMode === "npm" && <NpmPreview />}
      {displayedMode === "skill" && <CodePreview />}
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

  const PLACEHOLDERS: Record<Mode, string> = {
    repo: "github.com/owner/repo or owner/repo",
    npm: "package name — e.g. express, lodash",
    skill: "owner/repo — e.g. dbalve/fast-io",
  };

  const STATS = [
    { value: "6M+", label: "fake stars detected on GitHub", sub: "source: CMU ICSE 2026" },
    { value: "5,500+", label: "skills indexed on ClawHub", sub: "and growing" },
    { value: "100%", label: "open source methodology", sub: "fully auditable" },
    { value: "Free", label: "no account required", sub: "always will be" },
  ];

  return (
    <>
      {loading && <LoadingOverlay mode={mode} />}

      <main style={{ background: "var(--bg-base)", minHeight: "100vh" }}>

        {/* ─── HERO ──────────────────────────────────────────────────────────── */}
        <section
          id="hero"
          style={{
            position: "relative",
            overflow: "hidden",
            minHeight: "85vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-start",
            background: "var(--bg-base)",
          }}
        >
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
              maskImage: "linear-gradient(to bottom, transparent 0%, black 5%, black 95%, transparent 100%)",
              WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 5%, black 95%, transparent 100%)",
            }}
          >
            {PHRASE_ROWS.map((row, i) => (
              <PhraseRow key={i} row={row} />
            ))}
          </div>

          <div
            style={{
              position: "relative",
              zIndex: 2,
              textAlign: "center",
              padding: "12vh 80px 60px",
              maxWidth: 960,
              width: "100%",
              background: "radial-gradient(ellipse 85% 48% at 50% 70%, rgba(250,250,250,0.97) 0%, rgba(250,250,250,0.95) 40%, rgba(250,250,250,0.65) 70%, transparent 92%)",
            }}
          >
            <div className="hero-row" style={{ marginBottom: 12 }}>
              <Image
                src="/14619e05-69a1-41be-86dc-5ecda5629b3a-removebg-preview.png"
                alt="TrustStar"
                width={72}
                height={72}
                priority
                className="hero-logo"
              />
              <h1
                style={{
                  fontSize: "clamp(26px, 4vw, 44px)",
                  fontWeight: 700,
                  letterSpacing: "-1.5px",
                  lineHeight: 1.1,
                  color: "var(--text-primary)",
                  margin: 0,
                  whiteSpace: "nowrap",
                }}
              >
                Trust starts with{" "}
                <span style={{ color: "var(--accent)" }}>transparency.</span>
              </h1>
            </div>

            <p style={{ fontSize: 17, color: "var(--text-secondary)", lineHeight: 1.6, maxWidth: 480, margin: "12px auto 32px" }}>
              Verify any open source project before you depend on it.
            </p>

            <form onSubmit={handleSubmit}>
              <div className={`search-bar-outer${error ? " has-error" : ""}`}>
                <div className="search-bar-modes">
                  {(["repo", "npm", "skill"] as Mode[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => { setMode(m); setError(null); }}
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

                <input
                  ref={inputRef}
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder={PLACEHOLDERS[mode]}
                  disabled={loading}
                  autoFocus
                  className="search-bar-input"
                />

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

            <p style={{ marginTop: 14, fontSize: 12, color: "var(--text-tertiary)" }}>
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
        </section>

        {/* ─── STATS BAND ────────────────────────────────────────────────────── */}
        <section
          style={{
            background: "var(--bg-surface)",
            borderTop: "1px solid var(--border)",
            borderBottom: "1px solid var(--border)",
            padding: "56px 24px",
          }}
        >
          <div className="stats-grid" style={{ maxWidth: 900, margin: "0 auto" }}>
            {STATS.map((stat, i) => (
              <div
                key={stat.value}
                className={`stat-item${i < STATS.length - 1 ? " stat-item-divider" : ""}`}
                style={{ textAlign: "center", padding: "16px 28px" }}
              >
                <div style={{ fontSize: "clamp(28px, 3vw, 40px)", fontWeight: 700, fontFamily: "var(--font-ibm-mono), monospace", color: "var(--text-primary)", letterSpacing: "-1px", lineHeight: 1.15, marginBottom: 6 }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.4, marginBottom: 3 }}>
                  {stat.label}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                  {stat.sub}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ─── CTA FINAL ─────────────────────────────────────────────────────── */}
        <section style={{ background: "var(--bg-surface)", padding: "100px 24px", textAlign: "center" }}>
          <h2 style={{ fontSize: "clamp(22px, 3vw, 36px)", fontWeight: 700, color: "var(--text-primary)", marginBottom: 14, letterSpacing: "-0.8px" }}>
            Ready to verify trust?
          </h2>
          <p style={{ fontSize: 16, color: "var(--text-secondary)", maxWidth: 460, margin: "0 auto 36px", lineHeight: 1.65 }}>
            Paste a GitHub repo, npm package, or skill slug. Results in seconds.
          </p>
          <CtaButton
            onClick={() => {
              const hero = document.getElementById("hero");
              if (hero) hero.scrollIntoView({ behavior: "smooth" });
              setTimeout(() => inputRef.current?.focus(), 600);
            }}
          />
          <p style={{ marginTop: 16, fontSize: 12, color: "var(--text-tertiary)" }}>
            Free, open source, no account required.
          </p>
        </section>

      </main>
    </>
  );
}

function CtaButton({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? "var(--accent-hover)" : "var(--accent)",
        color: "#fff",
        border: "none",
        borderRadius: 10,
        padding: "14px 36px",
        fontSize: 15,
        fontWeight: 600,
        cursor: "pointer",
        fontFamily: "inherit",
        transition: "background 0.15s",
        boxShadow: "0 2px 10px rgba(217,54,54,0.25)",
        letterSpacing: "-0.2px",
      }}
    >
      Start Analyzing →
    </button>
  );
}
