import { notFound } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";
import type { NpmCheckResult, NpmSignal } from "@/lib/npm/analyzer";
import ShareCard from "@/components/ShareCard";

// ─── Data fetching ─────────────────────────────────────────────────────────────

async function getNpmReport(packageName: string): Promise<NpmCheckResult | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/npm-check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ package: packageName }),
      next: { revalidate: 600 },
    });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return res.json() as Promise<NpmCheckResult>;
  } catch {
    return null;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString("en-US");
}

function fmtDate(iso: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function parseGithubRepo(url: string): { owner: string; repo: string } | null {
  const m = url.match(/github\.com\/([^/]+)\/([^/\s?#]+)/);
  if (!m) return null;
  return { owner: m[1], repo: m[2].replace(/\.git$/, "") };
}

// ─── Sparkline SVG ────────────────────────────────────────────────────────────

function Sparkline({ data }: { data: { day: string; downloads: number }[] }) {
  if (data.length < 2) {
    return (
      <div
        style={{
          height: 80,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-tertiary)",
          fontSize: 12,
        }}
      >
        No trend data available
      </div>
    );
  }

  const W = 800;
  const H = 90;
  const PX = 4;
  const PY = 10;

  const max = Math.max(...data.map((d) => d.downloads), 1);
  const toX = (i: number) => PX + (i / (data.length - 1)) * (W - 2 * PX);
  const toY = (v: number) => H - PY - (v / max) * (H - 2 * PY);

  const linePts = data.map((d, i) => `${toX(i)},${toY(d.downloads)}`);
  const polyline = linePts.join(" ");
  const area = [
    `M ${linePts[0]}`,
    linePts.slice(1).map((p) => `L ${p}`).join(" "),
    `L ${toX(data.length - 1)},${H - PY}`,
    `L ${PX},${H - PY}`,
    "Z",
  ].join(" ");

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      style={{ width: "100%", height: 90, display: "block" }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#D93636" stopOpacity="0.14" />
          <stop offset="100%" stopColor="#D93636" stopOpacity="0.01" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#sparkGrad)" />
      <polyline
        points={polyline}
        fill="none"
        stroke="#D93636"
        strokeWidth="1.8"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ─── Signal components ────────────────────────────────────────────────────────

function SignalIcon({ type }: { type: NpmSignal["type"] }) {
  if (type === "positive") return <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--safe)", display: "inline-block" }} />;
  if (type === "warning") return <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--suspicious)", display: "inline-block" }} />;
  return <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--text-tertiary)", display: "inline-block" }} />;
}

function SignalRow({ signal }: { signal: NpmSignal }) {
  const labelColor =
    signal.type === "positive"
      ? "var(--safe)"
      : signal.type === "warning"
      ? "var(--suspicious)"
      : "var(--text-secondary)";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        padding: "14px 0",
        borderBottom: "1px solid var(--border-subtle)",
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          background:
            signal.type === "positive"
              ? "var(--safe-bg)"
              : signal.type === "warning"
              ? "var(--suspicious-bg)"
              : "var(--bg-hover)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          marginTop: 1,
        }}
      >
        <SignalIcon type={signal.type} />
      </div>
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: labelColor,
            marginBottom: 3,
          }}
        >
          {signal.label}
        </div>
        <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.55 }}>
          {signal.detail}
        </div>
      </div>
      <span
        style={{
          fontSize: 10,
          fontWeight: 600,
          padding: "2px 7px",
          borderRadius: 20,
          flexShrink: 0,
          textTransform: "uppercase",
          letterSpacing: "0.4px",
          background:
            signal.type === "positive"
              ? "var(--safe-bg)"
              : signal.type === "warning"
              ? "var(--suspicious-bg)"
              : "var(--bg-hover)",
          color:
            signal.type === "positive"
              ? "var(--safe)"
              : signal.type === "warning"
              ? "var(--suspicious)"
              : "var(--text-tertiary)",
          border:
            signal.type === "positive"
              ? "1px solid #BBF7D0"
              : signal.type === "warning"
              ? "1px solid #FDE68A"
              : "1px solid var(--border)",
        }}
      >
        {signal.type}
      </span>
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  mono,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  mono?: boolean;
}) {
  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        padding: "18px 20px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 10,
          fontSize: 12,
          color: "var(--text-tertiary)",
          fontWeight: 500,
        }}
      >
        <span style={{ display: "flex" }}>{icon}</span>
        {label}
      </div>
      <div
        style={{
          fontSize: 26,
          fontWeight: 700,
          color: "var(--text-primary)",
          letterSpacing: "-0.5px",
          fontFamily: mono ? "var(--font-ibm-mono), monospace" : "inherit",
        }}
      >
        {value}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function NpmReportPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const packageName = slug.join("/");
  const report = await getNpmReport(packageName);
  if (!report) notFound();

  const githubRepo = report.repositoryUrl ? parseGithubRepo(report.repositoryUrl) : null;

  const positiveCount = report.signals.filter((s) => s.type === "positive").length;
  const warningCount = report.signals.filter((s) => s.type === "warning").length;
  const neutralCount = report.signals.filter((s) => s.type === "neutral").length;

  const npmUrl = `https://www.npmjs.com/package/${encodeURIComponent(packageName)}`;

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg-base)" }}>
      <div
        style={{
          maxWidth: "var(--max-w)",
          margin: "0 auto",
          padding: "32px 24px 56px",
        }}
      >
        {/* Breadcrumb */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 28,
            fontSize: 13,
            color: "var(--text-tertiary)",
          }}
        >
          <Link href="/" className="link-accent" style={{ color: "var(--text-tertiary)", textDecoration: "none" }}>
            Home
          </Link>
          <span>/</span>
          <span>npm Check</span>
          <span>/</span>
          <span
            style={{
              fontFamily: "var(--font-ibm-mono), monospace",
              color: "var(--text-secondary)",
            }}
          >
            {packageName}
          </span>
        </div>

        {/* Hero */}
        <div
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-xl)",
            padding: "28px 32px",
            marginBottom: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 20,
              flexWrap: "wrap",
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Badge npm */}
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: 10,
                  fontWeight: 600,
                  padding: "2px 9px",
                  borderRadius: 20,
                  background: "#FFF7ED",
                  color: "#C05600",
                  border: "1px solid #FED7AA",
                  marginBottom: 10,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                npm Check
              </span>

              <h1
                style={{
                  fontSize: 32,
                  fontWeight: 700,
                  letterSpacing: "-0.8px",
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-ibm-mono), monospace",
                  marginBottom: 8,
                  overflowWrap: "break-word",
                }}
              >
                {report.package}
              </h1>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  flexWrap: "wrap",
                  marginBottom: 12,
                }}
              >
                {report.version && (
                  <span
                    style={{
                      fontSize: 12,
                      fontFamily: "var(--font-ibm-mono), monospace",
                      background: "var(--bg-hover)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius)",
                      padding: "2px 8px",
                      color: "var(--text-secondary)",
                    }}
                  >
                    v{report.version}
                  </span>
                )}
                {report.license && (
                  <span
                    style={{
                      fontSize: 12,
                      background: "var(--safe-bg)",
                      border: "1px solid #BBF7D0",
                      borderRadius: "var(--radius)",
                      padding: "2px 8px",
                      color: "var(--safe)",
                      fontWeight: 500,
                    }}
                  >
                    {report.license}
                  </span>
                )}
              </div>

              {report.description && (
                <p
                  style={{
                    fontSize: 14,
                    color: "var(--text-secondary)",
                    lineHeight: 1.6,
                    maxWidth: 600,
                    marginBottom: 16,
                  }}
                >
                  {report.description}
                </p>
              )}

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <a
                  href={npmUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    fontSize: 12,
                    fontWeight: 500,
                    color: "var(--text-secondary)",
                    textDecoration: "none",
                    padding: "5px 11px",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                    background: "var(--bg-surface)",
                    transition: "border-color 0.12s, color 0.12s",
                  }}
                  className="btn-outline"
                >
                  View on npm ↗
                </a>
                {report.repositoryUrl && (
                  <a
                    href={report.repositoryUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      fontSize: 12,
                      fontWeight: 500,
                      color: "var(--text-secondary)",
                      textDecoration: "none",
                      padding: "5px 11px",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius)",
                      background: "var(--bg-surface)",
                    }}
                    className="btn-outline"
                  >
                    View on GitHub ↗
                  </a>
                )}
              </div>
            </div>

            {/* Signal summary */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                flexShrink: 0,
              }}
            >
              {positiveCount > 0 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 12px",
                    background: "var(--safe-bg)",
                    border: "1px solid #BBF7D0",
                    borderRadius: "var(--radius)",
                    fontSize: 12,
                    color: "var(--safe)",
                    fontWeight: 500,
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--safe)", display: "inline-block" }} />
                  {positiveCount} positive signal{positiveCount !== 1 ? "s" : ""}
                </div>
              )}
              {neutralCount > 0 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 12px",
                    background: "var(--bg-hover)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                    fontSize: 12,
                    color: "var(--text-secondary)",
                    fontWeight: 500,
                  }}
                >
                  <span>·</span>
                  {neutralCount} neutral signal{neutralCount !== 1 ? "s" : ""}
                </div>
              )}
              {warningCount > 0 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 12px",
                    background: "var(--suspicious-bg)",
                    border: "1px solid #FDE68A",
                    borderRadius: "var(--radius)",
                    fontSize: 12,
                    color: "var(--suspicious)",
                    fontWeight: 500,
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--suspicious)", display: "inline-block" }} />
                  {warningCount} warning{warningCount !== 1 ? "s" : ""}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div
          className="rpt-4col-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <StatCard
            icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>}
            label="Weekly Downloads"
            value={fmt(report.weeklyDownloads)}
            mono
          />
          <StatCard
            icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>}
            label="GitHub Stars"
            value={report.stars > 0 ? fmt(report.stars) : "—"}
            mono
          />
          <StatCard
            icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
            label="Maintainers"
            value={String(report.maintainers.length)}
          />
          <StatCard
            icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>}
            label="Versions"
            value={String(report.versionsCount)}
          />
        </div>

        {/* Download Trend */}
        <div
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            padding: "20px 24px",
            marginBottom: 20,
          }}
        >
          <h2
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-primary)",
              marginBottom: 4,
            }}
          >
            Download Trend
          </h2>
          <p style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 16 }}>
            {fmt(report.monthlyDownloads)} downloads in the last 30 days
          </p>
          <Sparkline data={report.downloadTrend} />
          <p
            style={{
              fontSize: 11,
              color: "var(--text-tertiary)",
              marginTop: 8,
              textAlign: "right",
            }}
          >
            Last 30 days
          </p>
        </div>

        {/* Signals */}
        {report.signals.length > 0 && (
          <div
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              padding: "20px 24px",
              marginBottom: 20,
            }}
          >
            <h2
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--text-primary)",
                marginBottom: 4,
              }}
            >
              Signals
            </h2>
            <p style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 16 }}>
              Informational indicators — not definitive judgments
            </p>
            <div>
              {report.signals.map((s) => (
                <SignalRow key={s.id} signal={s} />
              ))}
            </div>
          </div>
        )}

        {/* Package Details + Metadata grid */}
        <div
          className="rpt-2col-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            marginBottom: 20,
          }}
        >
          {/* Package details */}
          <div
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              padding: "20px 24px",
            }}
          >
            <h2
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--text-primary)",
                marginBottom: 16,
              }}
            >
              Package Details
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <DetailRow label="First published" value={fmtDate(report.firstPublished)} />
              <DetailRow label="Last published" value={fmtDate(report.lastPublished)} />
              <DetailRow label="Latest version" value={`v${report.version}`} mono />
              <DetailRow label="Total versions" value={String(report.versionsCount)} />
              <DetailRow label="Dependencies" value={String(report.dependencyCount)} />
              <DetailRow
                label="Install scripts"
                value={report.hasInstallScripts ? "Yes" : "No"}
                valueColor={
                  report.hasInstallScripts ? "var(--suspicious)" : "var(--safe)"
                }
              />
              {report.repositoryUrl && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                    Repository
                  </span>
                  <a
                    href={report.repositoryUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: 12,
                      color: "var(--accent)",
                      textDecoration: "none",
                      textAlign: "right",
                      wordBreak: "break-all",
                    }}
                  >
                    {report.repositoryUrl.replace("https://", "")} ↗
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Maintainers + GitHub */}
          <div
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              padding: "20px 24px",
            }}
          >
            <h2
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--text-primary)",
                marginBottom: 16,
              }}
            >
              Maintainers
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {report.maintainers.slice(0, 8).map((m) => (
                <div
                  key={m.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background: "var(--bg-hover)",
                      border: "1px solid var(--border)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--text-secondary)",
                      flexShrink: 0,
                    }}
                  >
                    {m.name[0]?.toUpperCase() ?? "?"}
                  </div>
                  <a
                    href={`https://www.npmjs.com/~${encodeURIComponent(m.name)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: 12,
                      color: "var(--text-secondary)",
                      textDecoration: "none",
                      fontFamily: "var(--font-ibm-mono), monospace",
                    }}
                    className="link-accent"
                  >
                    {m.name}
                  </a>
                </div>
              ))}
              {report.maintainers.length > 8 && (
                <p style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                  +{report.maintainers.length - 8} more
                </p>
              )}
            </div>

            {report.stars > 0 && (
              <div
                style={{
                  marginTop: 20,
                  paddingTop: 16,
                  borderTop: "1px solid var(--border-subtle)",
                }}
              >
                <h3
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                    marginBottom: 10,
                  }}
                >
                  GitHub Signals
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <DetailRow label="Stars" value={fmt(report.stars)} mono />
                  <DetailRow label="Forks" value={fmt(report.forks)} mono />
                  <DetailRow label="Open issues" value={fmt(report.openIssues)} mono />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Go Further */}
        {githubRepo && (
          <div style={{ marginBottom: 20, background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 24 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4, letterSpacing: "-0.2px" }}>
              Want to go deeper?
            </h3>
            <p style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 16 }}>
              Complement this npm analysis with a reputation check or code scan.
            </p>
            <div className="go-further-grid">
              <div style={{ background: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: 8, padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Check repo reputation</span>
                </div>
                <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 14 }}>
                  Verify that the popularity is genuine — detect fake stars, bot accounts, and artificial engagement.
                </p>
                <Link
                  href={`/report/${githubRepo.owner}/${githubRepo.repo}`}
                  style={{ display: "inline-flex", alignItems: "center", fontSize: 12, fontWeight: 500, padding: "7px 14px", borderRadius: "var(--radius)", background: "var(--accent)", color: "#fff", textDecoration: "none", boxShadow: "0 1px 3px rgba(217,54,54,0.2)" }}
                >
                  Run Trust Score →
                </Link>
              </div>
              <div style={{ background: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: 8, padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Scan source code</span>
                </div>
                <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 14 }}>
                  Analyze source code for dangerous patterns — network calls, file access, obfuscation, and supply chain risks.
                </p>
                <Link
                  href={`/skill/${githubRepo.owner}/${githubRepo.repo}`}
                  className="btn-outline"
                  style={{ display: "inline-flex", alignItems: "center", fontSize: 12, fontWeight: 500, padding: "7px 14px", borderRadius: "var(--radius)", background: "none", color: "var(--text-secondary)", textDecoration: "none", border: "1px solid var(--border)" }}
                >
                  Run Code Scan →
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Disclaimers */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              padding: "10px 14px",
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              borderLeft: "3px solid var(--border)",
              borderRadius: "0 var(--radius) var(--radius) 0",
              fontSize: 12,
              color: "var(--text-secondary)",
              lineHeight: 1.65,
            }}
          >
            These signals are informational — they highlight patterns worth reviewing, not definitive judgments. A warning signal does not mean a package is malicious.
          </div>
          <div
            style={{
              padding: "10px 14px",
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              borderLeft: "3px solid var(--border)",
              borderRadius: "0 var(--radius) var(--radius) 0",
              fontSize: 12,
              color: "var(--text-secondary)",
              lineHeight: 1.65,
            }}
          >
            TrustStar is free and open source. Please use responsibly to keep the service available for everyone.
          </div>
        </div>

        {/* QR share */}
        <ShareCard
          url={`https://truststar.co/npm/${packageName}`}
          filename={packageName.replace(/\//g, "-")}
          analyzedAt={report.analyzedAt}
        />

        {/* Back */}
        <div style={{ marginTop: 24, textAlign: "center" }}>
          <Link
            href="/"
            className="btn-outline"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13,
              fontWeight: 500,
              color: "var(--text-secondary)",
              textDecoration: "none",
              padding: "8px 16px",
              borderRadius: "var(--radius)",
              border: "1px solid var(--border)",
              background: "var(--bg-surface)",
            }}
          >
            ← New Analysis
          </Link>
        </div>
      </div>
    </main>
  );
}

// ─── Detail row ────────────────────────────────────────────────────────────────

function DetailRow({
  label,
  value,
  mono,
  valueColor,
}: {
  label: string;
  value: string;
  mono?: boolean;
  valueColor?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 16,
      }}
    >
      <span style={{ fontSize: 12, color: "var(--text-tertiary)", flexShrink: 0 }}>
        {label}
      </span>
      <span
        style={{
          fontSize: 12,
          fontFamily: mono ? "var(--font-ibm-mono), monospace" : "inherit",
          color: valueColor ?? "var(--text-secondary)",
          textAlign: "right",
          fontWeight: valueColor ? 600 : 400,
        }}
      >
        {value}
      </span>
    </div>
  );
}
