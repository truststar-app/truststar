"use client";

import Link from "next/link";

// ─── Data ─────────────────────────────────────────────────────────────────────

const trustMetrics = [
  { name: "Account Quality", weight: "35%", desc: "Age, repos, followers, activity patterns of stargazers" },
  { name: "Temporal Behavior", weight: "30%", desc: "Star velocity, burst detection, Z-score anomalies" },
  { name: "Project Health", weight: "20%", desc: "Fork/star ratio, commit cadence, issue resolution" },
  { name: "Community Signals", weight: "15%", desc: "Contributor diversity, organic engagement patterns" },
];

const safetyAnalyzers = [
  { name: "Network Analysis", desc: "Outbound calls, hardcoded IPs, dynamic URLs, data exfiltration" },
  { name: "Filesystem Access", desc: "Sensitive path access (~/.ssh, ~/.aws, /etc/passwd), file operations" },
  { name: "Code Execution", desc: "Shell injection, eval(), subprocess, curl|bash patterns" },
  { name: "Obfuscation Detection", desc: "Base64 payloads, minified code, hex escapes, String.fromCharCode" },
  { name: "Dependency Audit", desc: "Typosquatting, unpinned versions, excessive dependencies" },
];

const penalties = [
  { severity: "CRITICAL", bg: "var(--dangerous-bg)", color: "var(--dangerous)", penalty: "-25 pts", example: "eval(atob(…)), curl|bash, ~/.ssh access" },
  { severity: "HIGH",     bg: "var(--suspicious-bg)", color: "var(--suspicious)", penalty: "-15 pts", example: "Unknown domain calls, subprocess shell=True" },
  { severity: "MEDIUM",   bg: "#FEFCE8", color: "#CA8A04", penalty: "-8 pts",  example: "Unpinned dependencies, hex escapes" },
  { severity: "LOW",      bg: "#EFF6FF", color: "#1D4ED8", penalty: "-3 pts",  example: "Minor style issues" },
  { severity: "INFO",     bg: "var(--bg-hover)", color: "var(--text-secondary)", penalty: "0 pts",   example: "Known safe patterns detected" },
];

type CmpVal = "yes" | "no" | "soon";

const comparisonFeatures = [
  { feature: "Open source methodology", sa: "yes" as CmpVal, sc: "yes" as CmpVal, cs: "no" as CmpVal, bd: "no" as CmpVal, vt: "no" as CmpVal },
  { feature: "Fake star detection",     sa: "yes" as CmpVal, sc: "no" as CmpVal,  cs: "no" as CmpVal, bd: "no" as CmpVal, vt: "no" as CmpVal },
  { feature: "Code security scanning",  sa: "yes" as CmpVal, sc: "yes" as CmpVal, cs: "yes" as CmpVal, bd: "yes" as CmpVal, vt: "yes" as CmpVal },
  { feature: "Combined trust verdict",  sa: "yes" as CmpVal, sc: "no" as CmpVal,  cs: "no" as CmpVal, bd: "no" as CmpVal, vt: "no" as CmpVal },
  { feature: "Free & unlimited",        sa: "yes" as CmpVal, sc: "yes" as CmpVal, cs: "yes" as CmpVal, bd: "yes" as CmpVal, vt: "no" as CmpVal },
  { feature: "Embeddable badges",       sa: "soon" as CmpVal, sc: "no" as CmpVal, cs: "no" as CmpVal, bd: "no" as CmpVal, vt: "no" as CmpVal },
  { feature: "API access",              sa: "soon" as CmpVal, sc: "no" as CmpVal, cs: "no" as CmpVal, bd: "no" as CmpVal, vt: "yes" as CmpVal },
];

function CmpCell({ val }: { val: CmpVal }) {
  if (val === "yes") return <span style={{ color: "var(--safe)", fontSize: 15, fontWeight: 700 }}>●</span>;
  if (val === "no") return <span style={{ color: "var(--border)", fontSize: 16, lineHeight: 1 }}>—</span>;
  return <span style={{ fontSize: 10, color: "var(--suspicious)", fontWeight: 700, background: "var(--suspicious-bg)", border: "1px solid #FDE68A", borderRadius: 20, padding: "1px 7px" }}>Soon</span>;
}

function HiW_UnlockIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>;
}
function HiW_UsersIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
}
function HiW_BuildingIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h.01M15 9h.01M9 15h.01M15 15h.01M9 3v18M3 9h18"/></svg>;
}

const openSourceReasons = [
  { icon: <HiW_UnlockIcon />, title: "Auditability", desc: "Our detection algorithms are public. If you think we're wrong, you can prove it. No trust-us-bro security." },
  { icon: <HiW_UsersIcon />, title: "Community-Driven", desc: "Found a false positive? Missing a pattern? Open a PR. The methodology improves with every contribution." },
  { icon: <HiW_BuildingIcon />, title: "Enterprise Ready", desc: "Open source doesn't mean amateur. Transparent methodology is what compliance teams actually want to see." },
];

// ─── Score label row ──────────────────────────────────────────────────────────

function ScoreLabels() {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16 }}>
      {[
        { label: "SAFE", min: "≥ 70", bg: "var(--safe-bg)", color: "var(--safe)" },
        { label: "SUSPICIOUS", min: "40–69", bg: "var(--suspicious-bg)", color: "var(--suspicious)" },
        { label: "DANGEROUS", min: "< 40", bg: "var(--dangerous-bg)", color: "var(--dangerous)" },
      ].map(({ label, min, bg, color }) => (
        <span
          key={label}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 10px",
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 600,
            fontFamily: "var(--font-ibm-mono), monospace",
            background: bg,
            color,
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor", flexShrink: 0 }} />
          {label} ({min})
        </span>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HowItWorksPage() {
  return (
    <main style={{ minHeight: "100vh", background: "var(--bg-base)" }}>
      <div style={{ maxWidth: "var(--max-w)", margin: "0 auto", padding: "64px 32px 80px" }}>

        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <div style={{ maxWidth: 680, marginBottom: 80 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              padding: "5px 16px 5px 12px",
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              borderRadius: 20,
              fontSize: 13,
              color: "var(--text-secondary)",
              marginBottom: 20,
              boxShadow: "var(--shadow-xs)",
            }}
          >
            <span style={{ width: 7, height: 7, background: "var(--accent)", borderRadius: "50%" }} />
            Open Source Methodology
          </div>

          <h1
            style={{
              fontSize: 48,
              fontWeight: 700,
              letterSpacing: "-2px",
              color: "var(--text-primary)",
              lineHeight: 1.1,
              marginBottom: 16,
            }}
          >
            How TrustStar Works
          </h1>

          <p style={{ fontSize: 17, color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 28 }}>
            Full transparency on how we calculate trust. Our methodology is open source — anyone
            can audit it, challenge it, or contribute to it.
          </p>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a
              href="https://github.com/truststar/truststar"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "9px 18px",
                background: "var(--accent)",
                color: "#fff",
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 600,
                textDecoration: "none",
                transition: "background 0.15s",
                boxShadow: "0 1px 3px rgba(217,54,54,0.2)",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--accent-hover)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--accent)"; }}
            >
              View on GitHub ↗
            </a>
            <Link
              href="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "9px 18px",
                background: "var(--bg-surface)",
                color: "var(--text-secondary)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 500,
                textDecoration: "none",
                transition: "border-color 0.12s, color 0.12s",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = "var(--text-tertiary)";
                el.style.color = "var(--text-primary)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = "var(--border)";
                el.style.color = "var(--text-secondary)";
              }}
            >
              Try an Analysis
            </Link>
          </div>
        </div>

        {/* ── Two Engines ───────────────────────────────────────────────────── */}
        <section style={{ marginBottom: 72 }}>
          <div style={{ maxWidth: 640, marginBottom: 32 }}>
            <h2
              style={{
                fontSize: 28,
                fontWeight: 700,
                letterSpacing: "-0.8px",
                color: "var(--text-primary)",
                marginBottom: 12,
              }}
            >
              Two Engines, One Verdict
            </h2>
            <p style={{ fontSize: 15, color: "var(--text-secondary)", lineHeight: 1.7 }}>
              TrustStar combines two independent analysis engines to deliver a complete trust verdict.
              A project can have thousands of bought stars but clean code. Another can be authentically
              popular but contain dangerous code. TrustStar detects both.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>

            {/* Trust Score card */}
            <div
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: 28,
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <span
                  style={{
                    width: 38,
                    height: 38,
                    background: "var(--accent-subtle)",
                    border: "1px solid var(--accent-muted)",
                    borderRadius: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    color: "var(--accent)",
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                </span>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Trust Score</p>
                  <p style={{ fontSize: 12, color: "var(--text-tertiary)" }}>Reputation Engine</p>
                </div>
              </div>

              <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.65, marginBottom: 20 }}>
                Analyses whether a GitHub repository&apos;s popularity is genuine or artificially inflated
                through fake stars, bot accounts, or coordinated campaigns.
              </p>

              <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 10 }}>
                Metrics analyzed
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {trustMetrics.map(({ name, weight, desc }) => (
                  <div
                    key={name}
                    style={{
                      background: "var(--bg-base)",
                      border: "1px solid var(--border)",
                      borderRadius: 7,
                      padding: "9px 12px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{name}</span>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          fontFamily: "var(--font-ibm-mono), monospace",
                          color: "var(--accent)",
                        }}
                      >
                        {weight}
                      </span>
                    </div>
                    <p style={{ fontSize: 12, color: "var(--text-tertiary)", lineHeight: 1.4 }}>{desc}</p>
                  </div>
                ))}
              </div>

              <ScoreLabels />
            </div>

            {/* Safety Score card */}
            <div
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: 28,
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <span
                  style={{
                    width: 38,
                    height: 38,
                    background: "var(--accent-subtle)",
                    border: "1px solid var(--accent-muted)",
                    borderRadius: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    color: "var(--accent)",
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                </span>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Safety Score</p>
                  <p style={{ fontSize: 12, color: "var(--text-tertiary)" }}>Code Security Engine</p>
                </div>
              </div>

              <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.65, marginBottom: 20 }}>
                Static analysis of skill source code to detect dangerous patterns: data exfiltration,
                credential theft, obfuscated payloads, and supply chain risks.
              </p>

              <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 10 }}>
                Analyzers
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {safetyAnalyzers.map(({ name, desc }) => (
                  <div
                    key={name}
                    style={{
                      background: "var(--bg-base)",
                      border: "1px solid var(--border)",
                      borderRadius: 7,
                      padding: "9px 12px",
                    }}
                  >
                    <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 3 }}>{name}</p>
                    <p style={{ fontSize: 12, color: "var(--text-tertiary)", lineHeight: 1.4 }}>{desc}</p>
                  </div>
                ))}
              </div>

              <ScoreLabels />
            </div>
          </div>
        </section>

        {/* ── Scoring Methodology ───────────────────────────────────────────── */}
        <section style={{ marginBottom: 72 }}>
          <div style={{ maxWidth: 580, marginBottom: 28 }}>
            <h2
              style={{
                fontSize: 28,
                fontWeight: 700,
                letterSpacing: "-0.8px",
                color: "var(--text-primary)",
                marginBottom: 10,
              }}
            >
              Transparent Scoring
            </h2>
            <p style={{ fontSize: 15, color: "var(--text-secondary)", lineHeight: 1.7 }}>
              Every score is deterministic and reproducible. No black box, no AI judgment
              calls — pure static analysis with published thresholds.
            </p>
          </div>

          {/* Penalties table */}
          <div
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              overflow: "hidden",
              boxShadow: "var(--shadow-sm)",
              maxWidth: 800,
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "110px 100px 1fr",
                padding: "10px 20px",
                background: "var(--bg-base)",
                borderBottom: "1px solid var(--border)",
              }}
            >
              {["Severity", "Penalty", "Example"].map((h) => (
                <span
                  key={h}
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--text-tertiary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  {h}
                </span>
              ))}
            </div>

            {penalties.map(({ severity, bg, color, penalty, example }, i) => (
              <div
                key={severity}
                style={{
                  display: "grid",
                  gridTemplateColumns: "110px 100px 1fr",
                  alignItems: "center",
                  padding: "12px 20px",
                  borderBottom: i < penalties.length - 1 ? "1px solid var(--border)" : "none",
                }}
              >
                <span>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "3px 9px",
                      borderRadius: 20,
                      fontSize: 11,
                      fontWeight: 700,
                      background: bg,
                      color,
                      fontFamily: "var(--font-ibm-mono), monospace",
                    }}
                  >
                    {severity}
                  </span>
                </span>
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    fontFamily: "var(--font-ibm-mono), monospace",
                    color,
                  }}
                >
                  {penalty}
                </span>
                <span style={{ fontSize: 13, color: "var(--text-secondary)", fontFamily: "var(--font-ibm-mono), monospace" }}>
                  {example}
                </span>
              </div>
            ))}
          </div>

          <p
            style={{
              marginTop: 14,
              fontSize: 13,
              color: "var(--text-tertiary)",
              lineHeight: 1.6,
              maxWidth: 800,
            }}
          >
            Each dimension starts at 100 and loses points per finding. The final score is a weighted
            average of all dimensions. Minimum score per dimension: 0.
          </p>
        </section>

        {/* ── Why Open Source ───────────────────────────────────────────────── */}
        <section style={{ marginBottom: 72 }}>
          <div style={{ maxWidth: 520, marginBottom: 28 }}>
            <h2
              style={{
                fontSize: 28,
                fontWeight: 700,
                letterSpacing: "-0.8px",
                color: "var(--text-primary)",
                marginBottom: 10,
              }}
            >
              Why We&apos;re Open Source
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
            {openSourceReasons.map(({ icon, title, desc }) => (
              <div
                key={title}
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: "22px 24px",
                  boxShadow: "var(--shadow-xs)",
                }}
              >
                <span style={{ fontSize: 24, display: "block", marginBottom: 12 }}>{icon}</span>
                <p style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>{title}</p>
                <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.65 }}>{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Comparison table ──────────────────────────────────────────────── */}
        <section style={{ marginBottom: 72 }}>
          <div style={{ maxWidth: 580, marginBottom: 28 }}>
            <h2
              style={{
                fontSize: 28,
                fontWeight: 700,
                letterSpacing: "-0.8px",
                color: "var(--text-primary)",
                marginBottom: 10,
              }}
            >
              TrustStar vs. the Alternatives
            </h2>
          </div>

          <div
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              overflow: "hidden",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            {/* Table header */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.6fr repeat(5, 1fr)",
                background: "var(--bg-base)",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <div style={{ padding: "12px 20px" }} />
              {["TrustStar", "SClawHub", "ClawSecure", "Bitdefender", "VirusTotal"].map((col, i) => (
                <div
                  key={col}
                  style={{
                    padding: "12px 8px",
                    textAlign: "center",
                    background: i === 0 ? "var(--accent-subtle)" : "transparent",
                    borderLeft: "1px solid var(--border)",
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: i === 0 ? "var(--accent)" : "var(--text-secondary)",
                      letterSpacing: i === 0 ? "-0.2px" : "0",
                    }}
                  >
                    {col}
                  </span>
                </div>
              ))}
            </div>

            {/* Rows */}
            {comparisonFeatures.map(({ feature, sa, sc, cs, bd, vt }, i) => (
              <div
                key={feature}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.6fr repeat(5, 1fr)",
                  borderBottom: i < comparisonFeatures.length - 1 ? "1px solid var(--border)" : "none",
                }}
              >
                <div
                  style={{
                    padding: "13px 20px",
                    fontSize: 13,
                    color: "var(--text-primary)",
                    fontWeight: 500,
                  }}
                >
                  {feature}
                </div>
                {[{ val: sa, highlight: true }, { val: sc }, { val: cs }, { val: bd }, { val: vt }].map(
                  ({ val, highlight }, j) => (
                    <div
                      key={j}
                      style={{
                        padding: "13px 8px",
                        textAlign: "center",
                        background: highlight ? "var(--accent-subtle)" : "transparent",
                        borderLeft: "1px solid var(--border)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <CmpCell val={val} />
                    </div>
                  )
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── Final CTA ─────────────────────────────────────────────────────── */}
        <section>
          <div
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: "48px 32px",
              textAlign: "center",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <h2
              style={{
                fontSize: 28,
                fontWeight: 700,
                letterSpacing: "-0.8px",
                color: "var(--text-primary)",
                marginBottom: 20,
              }}
            >
              Ready to verify trust?
            </h2>
            <Link
              href="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "10px 24px",
                background: "var(--accent)",
                color: "#fff",
                borderRadius: 6,
                fontSize: 15,
                fontWeight: 600,
                textDecoration: "none",
                transition: "background 0.15s",
                boxShadow: "0 1px 3px rgba(217,54,54,0.2)",
                marginBottom: 14,
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--accent-hover)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--accent)"; }}
            >
              Analyze a Repository →
            </Link>
            <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: 4 }}>
              Free, open source, no account required.
            </p>
          </div>
        </section>

      </div>
    </main>
  );
}
