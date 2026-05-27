"use client";

import { useState } from "react";
import Link from "next/link";

const GH = "https://github.com/truststar-app/truststar";

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 600,
  color: "var(--text-secondary)",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  fontSize: 14,
  fontFamily: "inherit",
  border: "1px solid var(--border)",
  borderRadius: 6,
  background: "var(--bg-surface)",
  color: "var(--text-primary)",
  outline: "none",
  boxSizing: "border-box",
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "inline-block",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "1px",
        textTransform: "uppercase",
        color: "var(--accent)",
        background: "var(--accent-subtle)",
        border: "1px solid var(--accent-muted)",
        padding: "3px 10px",
        borderRadius: 20,
        marginBottom: 12,
      }}
    >
      {children}
    </div>
  );
}

function SectionH2({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontSize: "clamp(22px, 3vw, 28px)",
        fontWeight: 700,
        letterSpacing: "-0.6px",
        color: "var(--text-primary)",
        margin: "8px 0 8px",
      }}
    >
      {children}
    </h2>
  );
}

function ProblemCard({ num, title, text }: { num: string; title: string; text: string }) {
  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "24px 22px",
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-ibm-mono, 'JetBrains Mono', monospace)",
          fontSize: 36,
          fontWeight: 700,
          color: "var(--accent)",
          letterSpacing: "-1px",
          lineHeight: 1,
          marginBottom: 10,
        }}
      >
        {num}
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", marginBottom: 6 }}>
        {title}
      </div>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.65, margin: 0 }}>
        {text}
      </p>
    </div>
  );
}

function EngineCard({
  icon, name, desc, children,
}: {
  icon: React.ReactNode;
  name: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "28px 28px",
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        marginBottom: 20,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: "var(--accent-subtle)",
            border: "1px solid var(--accent-muted)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--accent)",
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <h3
          style={{
            fontSize: 17,
            fontWeight: 600,
            color: "var(--text-primary)",
            margin: 0,
            letterSpacing: "-0.3px",
          }}
        >
          {name}
        </h3>
      </div>
      <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.65, margin: "0 0 4px" }}>
        {desc}
      </p>
      {children}
    </div>
  );
}

function TableLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.5px",
        color: "var(--text-secondary)",
        marginBottom: 8,
      }}
    >
      {children}
    </div>
  );
}

function SimpleTable({ rows }: { rows: string[][] }) {
  const cols = rows[0]?.length ?? 2;
  return (
    <div style={{ overflowX: "auto" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: 13,
          minWidth: cols === 3 ? 360 : 280,
        }}
      >
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              style={{
                borderBottom: i < rows.length - 1 ? "1px solid var(--border)" : "none",
              }}
            >
              {row.map((cell, j) => (
                <td
                  key={j}
                  style={{
                    padding: "8px 12px",
                    verticalAlign: "top",
                    color: j === 0 ? "var(--text-primary)" : j === 1 && cols === 3 ? "var(--accent)" : "var(--text-secondary)",
                    fontWeight: j === 0 ? 500 : j === 1 && cols === 3 ? 600 : 400,
                    fontFamily: j === 1 && cols === 3 ? "var(--font-ibm-mono, monospace)" : "inherit",
                    lineHeight: 1.5,
                    background: i % 2 === 0 ? "var(--bg-hover)" : "transparent",
                    whiteSpace: j === 0 ? "nowrap" : "normal",
                  }}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LabelBadge({ color, bg, label, note }: { color: string; bg: string; label: string; note: string }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        borderRadius: 6,
        background: bg,
        border: `1px solid ${color}30`,
        fontSize: 12,
      }}
    >
      <span style={{ fontWeight: 700, color, fontFamily: "var(--font-ibm-mono, monospace)", fontSize: 11, letterSpacing: "0.3px" }}>
        {label}
      </span>
      <span style={{ color: "var(--text-tertiary)", fontSize: 11 }}>{note}</span>
    </div>
  );
}

function SeverityBadge({ label, penalty, color }: { label: string; penalty: string; color: string }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        borderRadius: 6,
        background: "var(--bg-hover)",
        border: "1px solid var(--border)",
        fontSize: 12,
      }}
    >
      <span style={{ fontWeight: 700, color, fontSize: 11, letterSpacing: "0.3px" }}>{label}</span>
      <span
        style={{
          fontFamily: "var(--font-ibm-mono, monospace)",
          color: penalty === "0" ? "var(--text-tertiary)" : "var(--accent)",
          fontWeight: 600,
          fontSize: 11,
        }}
      >
        {penalty} pts
      </span>
    </div>
  );
}

function SignalRow({ color, label, examples }: { color: string; label: string; examples: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: color,
          flexShrink: 0,
          marginTop: 5,
          display: "inline-block",
        }}
      />
      <span style={{ fontSize: 13, color: "var(--text-primary)" }}>
        <span style={{ fontWeight: 600 }}>{label}</span>
        <span style={{ color: "var(--text-tertiary)" }}> — </span>
        <span style={{ color: "var(--text-secondary)" }}>{examples}</span>
      </span>
    </div>
  );
}

function StatCard({ num, label, sub }: { num: string; label: string; sub: string }) {
  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "28px 24px",
        textAlign: "center",
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-ibm-mono, 'JetBrains Mono', monospace)",
          fontSize: 40,
          fontWeight: 700,
          color: "var(--accent)",
          letterSpacing: "-1.5px",
          lineHeight: 1,
          marginBottom: 8,
        }}
      >
        {num}
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{sub}</div>
    </div>
  );
}

export default function HowItWorksPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  function handleContactSubmit(e: React.FormEvent) {
    e.preventDefault();
    const subject = encodeURIComponent(
      `Message from ${name.trim() || "TrustStar visitor"}`
    );
    const body = encodeURIComponent(
      `Name: ${name}\nEmail: ${email}\n\n${message}`
    );
    window.location.href = `mailto:support@truststar.co?subject=${subject}&body=${body}`;
  }

  return (
    <main
      style={{
        maxWidth: 820,
        margin: "0 auto",
        padding: "calc(var(--header-h, 48px) + 48px) 24px 80px",
      }}
    >
      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section style={{ marginBottom: 72, textAlign: "center" }}>
        <SectionLabel>Transparency</SectionLabel>
        <h1
          style={{
            fontSize: "clamp(28px, 4vw, 44px)",
            fontWeight: 700,
            letterSpacing: "-1px",
            lineHeight: 1.15,
            color: "var(--text-primary)",
            margin: "0 0 16px",
          }}
        >
          How TrustStar Works
        </h1>
        <p
          style={{
            fontSize: 17,
            color: "var(--text-secondary)",
            lineHeight: 1.6,
            maxWidth: 520,
            margin: "0 auto 28px",
          }}
        >
          Every scoring algorithm is open source. Read the code, run the
          benchmarks, and verify the results yourself.
        </p>
        <div
          style={{
            display: "flex",
            gap: 12,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <a
            href={GH}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: "10px 22px",
              fontSize: 14,
              fontWeight: 600,
              color: "#fff",
              background: "var(--accent)",
              borderRadius: 6,
              textDecoration: "none",
              transition: "background 0.15s",
              display: "inline-block",
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLElement).style.background = "var(--accent-hover)")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.background = "var(--accent)")
            }
          >
            View on GitHub
          </a>
          <Link
            href="/"
            style={{
              padding: "10px 22px",
              fontSize: 14,
              fontWeight: 500,
              color: "var(--text-secondary)",
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              textDecoration: "none",
              transition: "border-color 0.15s, color 0.15s",
              display: "inline-block",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)";
              (e.currentTarget as HTMLElement).style.color = "var(--accent)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
              (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
            }}
          >
            Try an Analysis
          </Link>
        </div>
      </section>

      {/* ── The Problem ─────────────────────────────────────────────────────── */}
      <section style={{ marginBottom: 72 }}>
        <SectionLabel>The problem</SectionLabel>
        <SectionH2>Why trust matters</SectionH2>
        <p style={{ fontSize: 15, color: "var(--text-secondary)", lineHeight: 1.6, margin: "0 0 24px", maxWidth: 600 }}>
          Open source reputation signals are routinely manipulated. Developers
          need a way to verify what they see.
        </p>
        <div className="hiw-problem-grid">
          <ProblemCard
            num="6M+"
            title="Fake Stars"
            text="GitHub stars can be purchased in bulk. Services sell them openly, inflating perceived popularity and misleading developers who rely on star count as a quality signal."
          />
          <ProblemCard
            num="$0"
            title="Inflated Downloads"
            text="npm download counts can be inflated at near-zero cost using AWS Lambda or CI scripts. A package with 500k weekly downloads may have zero real users."
          />
          <ProblemCard
            num="+742%"
            title="Supply Chain Attacks"
            text="Supply chain attacks on open source packages have increased 742% since 2019. A single malicious dependency can compromise thousands of downstream projects."
          />
        </div>
      </section>

      {/* ── Three Engines ───────────────────────────────────────────────────── */}
      <section style={{ marginBottom: 72 }}>
        <SectionLabel>The engines</SectionLabel>
        <SectionH2>Three engines, one trust verdict</SectionH2>
        <p style={{ fontSize: 15, color: "var(--text-secondary)", lineHeight: 1.6, margin: "0 0 28px", maxWidth: 600 }}>
          Each engine runs independently and produces its own score. Results
          are fully transparent — you can see exactly which signals drove each
          finding.
        </p>

        {/* Trust Score */}
        <EngineCard
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          }
          name="Trust Score"
          desc="Analyzes GitHub repositories to detect fake star campaigns and assess the authenticity of a project's community. Examines up to 500 stargazer profiles across time-distributed samples."
        >
          <div style={{ marginTop: 20 }}>
            <TableLabel>How we score it</TableLabel>
            <SimpleTable
              rows={[
                ["Account Quality", "35%", "Age, repos, followers of stargazers sampled across time"],
                ["Temporal Behavior", "30%", "Star velocity anomalies, 48h concentration, z-score"],
                ["Project Health", "35%", "Fork/star ratio, commit cadence, contributors, issue resolution"],
              ]}
            />
          </div>
          <div style={{ marginTop: 16 }}>
            <TableLabel>Labels</TableLabel>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
              <LabelBadge color="var(--safe)" bg="var(--safe-bg)" label="SAFE" note="score ≥ 70" />
              <LabelBadge color="var(--suspicious)" bg="var(--suspicious-bg)" label="SUSPICIOUS" note="score 40–69" />
              <LabelBadge color="var(--dangerous)" bg="var(--dangerous-bg)" label="DANGEROUS" note="score < 40" />
              <LabelBadge color="#6B6B76" bg="var(--bg-hover)" label="NEW" note="< 50 stars" />
            </div>
          </div>
        </EngineCard>

        {/* npm Check */}
        <EngineCard
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/>
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
              <line x1="12" y1="22.08" x2="12" y2="12"/>
            </svg>
          }
          name="npm Check"
          desc="Cross-references npm download counts with GitHub stars, maintainer count, release history, and install scripts to surface inconsistencies between popularity signals."
        >
          <div style={{ marginTop: 20 }}>
            <TableLabel>Signal types</TableLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
              <SignalRow
                color="#16A34A"
                label="Positive"
                examples="Downloads above 10k/week, age over 2 years, multiple maintainers, linked GitHub repo, 10+ versions"
              />
              <SignalRow
                color="#A0A0AB"
                label="Neutral"
                examples="Low download volume, single maintainer, no linked repo, published over a year ago"
              />
              <SignalRow
                color="#D97706"
                label="Warning"
                examples="100k+ downloads but under 50 stars and 10 forks, install scripts detected, very new package with high downloads"
              />
            </div>
            <p style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 12, lineHeight: 1.6, margin: "12px 0 0" }}>
              Thresholds are conservative — in case of doubt, signals default to Neutral rather than Warning.
            </p>
          </div>
        </EngineCard>

        {/* Code Scan */}
        <EngineCard
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          }
          name="Code Scan"
          desc="Static security analysis of up to 50 source files, fetched shallow-first to maximize coverage of the most likely attack surface. Analyzes .ts, .js, .py, and .sh files."
        >
          <div style={{ marginTop: 20 }}>
            <TableLabel>What we detect</TableLabel>
            <SimpleTable
              rows={[
                ["Network", "Hardcoded non-loopback IPs, unknown domains, dynamic URL construction"],
                ["Filesystem", "Access to ~/.ssh, ~/.aws, ~/.gnupg, /etc/passwd, /etc/shadow"],
                ["Execution", "eval(), new Function(), exec() and spawn() with dynamic arguments"],
                ["Obfuscation", "eval(atob()), long base64 strings (>200 chars), hex-escape flooding, fromCharCode chains, hardcoded PEM keys"],
                ["Dependencies", "Unpinned versions, typosquatting via edit distance ≤ 2"],
              ]}
            />
          </div>
          <div style={{ marginTop: 16 }}>
            <TableLabel>Severity penalties</TableLabel>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
              <SeverityBadge label="CRITICAL" penalty="-25" color="#DC2626" />
              <SeverityBadge label="HIGH" penalty="-15" color="#D97706" />
              <SeverityBadge label="MEDIUM" penalty="-8" color="#2563EB" />
              <SeverityBadge label="LOW" penalty="-3" color="#6B6B76" />
              <SeverityBadge label="INFO" penalty="0" color="#A0A0AB" />
            </div>
          </div>
        </EngineCard>
      </section>

      {/* ── Honest limits ───────────────────────────────────────────────────── */}
      <section style={{ marginBottom: 72 }}>
        <SectionLabel>Limitations</SectionLabel>
        <SectionH2>Honest about our limits</SectionH2>
        <p style={{ fontSize: 15, color: "var(--text-secondary)", lineHeight: 1.6, margin: "0 0 24px" }}>
          TrustStar does not replace a full security audit. Here is what it
          cannot detect:
        </p>
        <div
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "24px 28px",
          }}
        >
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              "SQL injection, XSS, NoSQL injection, and SSTI — these require AST-level data-flow analysis, which TrustStar does not perform.",
              "Code in files beyond the 50-file scan limit — large repos with deep directory trees may have vulnerable code in paths that were not fetched.",
              "PHP, Ruby, Java, and Go backends — only .ts, .js, .py, and .sh files are analyzed. A PHP app is analyzed only on its JavaScript glue code.",
              "Multi-line PEM private keys stored with real embedded newlines — single-line escape sequences (\\r\\n) are detected; actual newlines in string literals are not.",
              "Transitive dependencies — only direct entries in package.json or requirements.txt are checked.",
            ].map((text, i) => (
              <li key={i} style={{ display: "flex", gap: 12, fontSize: 14, color: "var(--text-primary)", lineHeight: 1.6 }}>
                <span style={{ color: "var(--accent)", fontWeight: 700, flexShrink: 0, marginTop: 1 }}>—</span>
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>
        <p style={{ marginTop: 16, fontSize: 13, color: "var(--text-tertiary)", lineHeight: 1.7 }}>
          For deeper audits, use TrustStar alongside{" "}
          <a href="https://snyk.io" target="_blank" rel="noopener noreferrer" style={{ color: "var(--text-secondary)", textDecoration: "underline" }}>Snyk</a>
          ,{" "}
          <a href="https://socket.dev" target="_blank" rel="noopener noreferrer" style={{ color: "var(--text-secondary)", textDecoration: "underline" }}>Socket.dev</a>
          , and{" "}
          <code style={{ fontFamily: "var(--font-ibm-mono, monospace)", fontSize: 12, background: "var(--bg-hover)", padding: "1px 5px", borderRadius: 3 }}>npm audit</code>
          .
        </p>
      </section>

      {/* ── Tested and measured ─────────────────────────────────────────────── */}
      <section style={{ marginBottom: 72 }}>
        <SectionLabel>Reliability</SectionLabel>
        <SectionH2>Tested and measured</SectionH2>
        <p style={{ fontSize: 15, color: "var(--text-secondary)", lineHeight: 1.6, margin: "0 0 28px", maxWidth: 560 }}>
          Each engine is validated against a fixed benchmark of real-world
          repositories and packages, run multiple times for consistency.
        </p>
        <div className="hiw-stats-grid">
          <StatCard num="100%" label="Trust Score" sub="29-repo benchmark" />
          <StatCard num="100%" label="npm Check" sub="45-package benchmark" />
          <StatCard num="94%" label="Code Scan" sub="19 repos, 8 iterations" />
        </div>
        <p style={{ marginTop: 16, fontSize: 13, color: "var(--text-tertiary)", textAlign: "center" }}>
          <a
            href={`${GH}/tree/main/scripts`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--text-secondary)", textDecoration: "underline" }}
          >
            View benchmark scripts on GitHub
          </a>
        </p>
      </section>

      {/* ── Get in touch ────────────────────────────────────────────────────── */}
      <section
        id="contact"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: "40px 36px",
          marginBottom: 32,
        }}
      >
        <SectionLabel>Contact</SectionLabel>
        <SectionH2>Get in touch</SectionH2>
        <p style={{ fontSize: 15, color: "var(--text-secondary)", lineHeight: 1.6, margin: "0 0 20px" }}>
          Questions, feedback, or want to report a scoring issue? We read
          every message.
        </p>

        <a
          href="mailto:support@truststar.co"
          style={{
            display: "inline-block",
            fontSize: 22,
            fontWeight: 600,
            color: "var(--accent)",
            textDecoration: "none",
            letterSpacing: "-0.4px",
            marginBottom: 32,
            transition: "color 0.12s",
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLElement).style.color = "var(--accent-hover)")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLElement).style.color = "var(--accent)")
          }
        >
          support@truststar.co
        </a>

        <form
          onSubmit={handleContactSubmit}
          style={{ display: "flex", flexDirection: "column", gap: 14 }}
        >
          <div className="hiw-contact-form-grid">
            <div>
              <label style={labelStyle}>Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={inputStyle}
              />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Your message..."
              rows={4}
              style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
            />
          </div>
          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              type="submit"
              disabled={!message.trim()}
              style={{
                padding: "10px 22px",
                fontSize: 14,
                fontWeight: 600,
                color: "#fff",
                background: message.trim() ? "var(--accent)" : "var(--text-tertiary)",
                border: "none",
                borderRadius: 6,
                cursor: message.trim() ? "pointer" : "not-allowed",
                fontFamily: "inherit",
                transition: "background 0.15s",
              }}
            >
              Send via email
            </button>
            <a
              href={`${GH}/issues`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 13,
                color: "var(--text-secondary)",
                textDecoration: "none",
                transition: "color 0.12s",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLElement).style.color = "var(--text-primary)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLElement).style.color = "var(--text-secondary)")
              }
            >
              Or open a GitHub issue
            </a>
          </div>
        </form>
      </section>

      {/* StarScout citation */}
      <section style={{ maxWidth: 780, margin: "0 auto", padding: "0 24px 64px" }}>
        <div
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: "24px 28px",
          }}
        >
          <h2
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "var(--text-primary)",
              marginBottom: 12,
              letterSpacing: "-0.3px",
            }}
          >
            Research foundation — StarScout
          </h2>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.75, marginBottom: 12 }}>
            The Authenticity dimension is inspired by{" "}
            <strong style={{ color: "var(--text-primary)" }}>StarScout</strong>, a peer-reviewed system
            developed at Carnegie Mellon University and published at ICSE 2026. StarScout identifies
            fake star campaigns on GitHub using two core signatures:
          </p>
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: "0 0 14px",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <li style={{ display: "flex", gap: 10, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.65 }}>
              <span style={{ color: "var(--accent)", fontWeight: 700, flexShrink: 0 }}>1.</span>
              <span>
                <strong style={{ color: "var(--text-primary)" }}>Low Activity Signature</strong> — disposable
                accounts with a single public repo, zero followers, and no activity beyond starring.
              </span>
            </li>
            <li style={{ display: "flex", gap: 10, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.65 }}>
              <span style={{ color: "var(--accent)", fontWeight: 700, flexShrink: 0 }}>2.</span>
              <span>
                <strong style={{ color: "var(--text-primary)" }}>Lockstep Signature</strong> — clusters of accounts
                that starred the same set of repositories within a 7-day window (simplified CopyCatch algorithm).
              </span>
            </li>
          </ul>
          <p style={{ fontSize: 12, color: "var(--text-tertiary)", lineHeight: 1.65 }}>
            TrustStar applies these signals conservatively: clean repos skip event-API calls entirely, and the
            authenticity score is additive — it never overrides strong positive signals from other dimensions.
            Full paper:{" "}
            <span style={{ fontFamily: "var(--font-ibm-mono), monospace" }}>
              Wermke et al., "StarScout: Identifying Fake Stars on GitHub", ICSE 2026.
            </span>
          </p>
        </div>
      </section>
    </main>
  );
}
