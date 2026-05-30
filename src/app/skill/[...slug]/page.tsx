import { cache } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";
import type { Metadata } from "next";
import type { SkillSafetyScore, SkillFinding } from "@/lib/skill-audit/types";
import { getSkillResultCached } from "@/lib/skill-audit/pipeline";
import { addAudit } from "@/lib/recent-audits";

const SITE = "https://truststar.co";

const getSkillReport = cache(async (
  owner: string,
  repo: string
): Promise<SkillSafetyScore | { error: string; details?: string } | null> => {
  try {
    const result = await getSkillResultCached(owner, repo);
    addAudit({
      id: crypto.randomUUID(),
      type: "skill-audit",
      slug: `${owner}/${repo}`,
      score: result.score,
      label: result.label,
      analyzedAt: new Date().toISOString(),
    });
    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("not found")) return { error: "Repository not found", details: "Check the slug or GitHub URL" };
    if (msg.includes("rate limit")) return { error: "GitHub rate limit reached", details: "Please try again in a few minutes" };
    return null;
  }
});

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (!slug || slug.length < 2) return { title: "Code Scan | TrustStar" };

  const owner = slug[0];
  const repo = slug[1];
  const result = await getSkillReport(owner, repo);
  const repoSlug = `${owner}/${repo}`;

  const isReport = result && !("error" in result);
  const report = isReport ? (result as SkillSafetyScore) : null;

  const title = report
    ? `${repoSlug} — Code Scan: ${report.score} ${report.label} | TrustStar`
    : `${repoSlug} — Code Scan | TrustStar`;

  const description = report
    ? `Static security analysis for ${repoSlug}. ${report.findings.length} finding(s) detected across ${report.metadata.files.length} file(s). Score: ${report.score} ${report.label}. Scanned by TrustStar.`
    : `Static security analysis for ${repoSlug}. Scanned by TrustStar.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${SITE}/skill/${repoSlug}`,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function SkillReportPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;

  if (!slug || slug.length < 2) {
    notFound();
  }

  const owner = slug[0];
  const repo = slug[1];
  const result = await getSkillReport(owner, repo);

  if (!result) {
    return <ErrorState owner={owner} repo={repo} message="Analysis failed" details="An unexpected error occurred." />;
  }

  if ("error" in result) {
    return <ErrorState owner={owner} repo={repo} message={result.error} details={result.details} />;
  }

  const report = result;
  const cfg = getLabelConfig(report.label);

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg-base)" }}>
      <div
        style={{
          maxWidth: "var(--max-w)",
          margin: "0 auto",
          padding: "32px 24px 48px",
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
          <Link
            href="/"
            style={{ color: "var(--text-tertiary)", textDecoration: "none" }}
          >
            Home
          </Link>
          <span>/</span>
          <span>Code Scan</span>
          <span>/</span>
          <span
            style={{
              fontFamily: "var(--font-ibm-mono), monospace",
              color: "var(--text-secondary)",
            }}
          >
            {owner}/{repo}
          </span>
          <Link
            href="/"
            style={{
              marginLeft: "auto",
              fontSize: 12,
              color: "var(--text-tertiary)",
              textDecoration: "none",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              padding: "4px 10px",
              transition: "border-color 0.12s",
            }}
          >
            ← New Analysis
          </Link>
        </div>

        {/* Score hero */}
        <div
          className="rpt-score-hero"
          style={{
            background: cfg.bgCard,
            border: `1px solid ${cfg.borderCard}`,
            borderRadius: "var(--radius-xl)",
            padding: "28px 32px",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 28,
          }}
        >
          <ScoreCircle score={report.score} color={cfg.color} />

          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
              <span
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: cfg.color,
                  letterSpacing: "-0.5px",
                }}
              >
                {report.label}
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontFamily: "var(--font-ibm-mono), monospace",
                  background: cfg.bgCard,
                  border: `1px solid ${cfg.borderCard}`,
                  borderRadius: "var(--radius)",
                  padding: "2px 8px",
                  color: cfg.color,
                  fontWeight: 600,
                }}
              >
                Code Scan Score {report.score}
              </span>
              {report.metadata.hasSkillMd ? (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "2px 8px",
                    borderRadius: "var(--radius)",
                    background: "var(--safe-bg)",
                    color: "var(--safe)",
                    border: "1px solid #BBF7D0",
                  }}
                >
                  ✓ OpenClaw Skill
                </span>
              ) : (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "2px 8px",
                    borderRadius: "var(--radius)",
                    background: "var(--bg-hover)",
                    color: "var(--text-secondary)",
                    border: "1px solid var(--border)",
                  }}
                >
                  Generic Repository
                </span>
              )}
            </div>
            <p
              style={{
                fontSize: 13,
                color: "var(--text-secondary)",
                lineHeight: 1.65,
                maxWidth: 480,
                marginBottom: 14,
              }}
            >
              {cfg.description}
            </p>
            <div
              style={{
                display: "flex",
                gap: 12,
                fontSize: 12,
                color: "var(--text-tertiary)",
                flexWrap: "wrap",
              }}
            >
              <span>{report.findings.length} finding(s)</span>
              <span>·</span>
              <span>{report.metadata.files.length} file(s)</span>
              <span>·</span>
              <span>
                {new Date(report.analyzedAt).toLocaleDateString("en-US", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Dimension bars */}
        <div
          className="rpt-4col-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <DimensionCard label="Popularity" score={report.dimensions.popularity} weight="30%" icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>} />
          <DimensionCard label="Permissions" score={report.dimensions.permissions} weight="30%" icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>} />
          <DimensionCard label="Code Safety" score={report.dimensions.codeSafety} weight="25%" icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>} />
          <DimensionCard label="Ecosystem" score={report.dimensions.ecosystem} weight="15%" icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17 8C8 10 5.9 16.17 3.82 19.34a1 1 0 0 0 .9 1.48 9.67 9.67 0 0 0 2.28.18C9 21 12 20 14 17c-1-1-2-2-2-4 0-2 2-4 5-4z"/></svg>} />
        </div>

        {/* Metadata */}
        <MetadataPanel report={report} />

        {/* Findings */}
        <FindingsPanel findings={report.findings} />

        {/* Files */}
        <FilesPanel report={report} />

        {/* Go Further */}
        <div style={{ marginTop: 16, background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 24, boxShadow: "var(--shadow-xs)" }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4, letterSpacing: "-0.2px" }}>
            Want to go deeper?
          </h3>
          <p style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 16 }}>
            Complement this Code Scan with a reputation check or npm analysis.
          </p>
          <div className="go-further-grid">
            <div style={{ background: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: 8, padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Check this repo&apos;s reputation</span>
              </div>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 14 }}>
                Verify that the popularity is genuine — detect fake stars, bot accounts, and artificial engagement.
              </p>
              <Link
                href={`/report/${owner}/${repo}`}
                style={{ display: "inline-flex", alignItems: "center", fontSize: 12, fontWeight: 500, padding: "7px 14px", borderRadius: "var(--radius)", background: "var(--accent)", color: "#fff", textDecoration: "none", boxShadow: "0 1px 3px rgba(217,54,54,0.2)" }}
              >
                Run Trust Score →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

// ─── Error state ──────────────────────────────────────────────────────────────

function ErrorState({
  owner,
  repo,
  message,
  details,
}: {
  owner: string;
  repo: string;
  message: string;
  details?: string;
}) {
  return (
    <main style={{ minHeight: "100vh", background: "var(--bg-base)" }}>
      <div
        style={{
          maxWidth: "var(--max-w)",
          margin: "0 auto",
          padding: "80px 24px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            background: "var(--dangerous-bg)",
            border: "1px solid #FCA5A5",
            borderRadius: "var(--radius-xl)",
            padding: "48px 32px",
            maxWidth: 500,
            margin: "0 auto",
          }}
        >
          <p
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: "var(--dangerous)",
              marginBottom: 8,
            }}
          >
            {message}
          </p>
          {details && (
            <p
              style={{
                fontSize: 13,
                color: "var(--text-secondary)",
                marginBottom: 24,
                lineHeight: 1.6,
              }}
            >
              {details}
            </p>
          )}
          <p style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 24 }}>
            {owner}/{repo}
          </p>
          <Link
            href="/"
            style={{
              display: "inline-block",
              padding: "8px 20px",
              background: "var(--accent)",
              color: "#fff",
              borderRadius: "var(--radius)",
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            ← New Analysis
          </Link>
        </div>
      </div>
    </main>
  );
}

// ─── Label config ──────────────────────────────────────────────────────────────

function getLabelConfig(label: SkillSafetyScore["label"]): {
  color: string;
  bgCard: string;
  borderCard: string;
  description: string;
} {
  switch (label) {
    case "SAFE":
      return {
        color: "var(--safe)",
        bgCard: "var(--safe-bg)",
        borderCard: "#86EFAC",
        description:
          "This skill shows healthy signals. It appears safe to use.",
      };
    case "SUSPICIOUS":
      return {
        color: "var(--suspicious)",
        bgCard: "var(--suspicious-bg)",
        borderCard: "#FCD34D",
        description:
          "Some signals are concerning. A manual review is recommended.",
      };
    case "DANGEROUS":
      return {
        color: "var(--dangerous)",
        bgCard: "var(--dangerous-bg)",
        borderCard: "#FCA5A5",
        description:
          "Strongly suspicious signals. This skill should not be installed.",
      };
  }
}

// ─── Severity config ──────────────────────────────────────────────────────────

type SeverityConfig = {
  color: string;
  bg: string;
  borderLeft: string;
  label: string;
};

function getSeverityConfig(severity: SkillFinding["severity"]): SeverityConfig {
  switch (severity) {
    case "CRITICAL":
      return { color: "#DC2626", bg: "#FEF2F2", borderLeft: "#DC2626", label: "CRITICAL" };
    case "HIGH":
      return { color: "#EA580C", bg: "#FFF7ED", borderLeft: "#EA580C", label: "HIGH" };
    case "MEDIUM":
      return { color: "#D97706", bg: "#FFFBEB", borderLeft: "#D97706", label: "MEDIUM" };
    case "LOW":
      return { color: "#2563EB", bg: "#EFF6FF", borderLeft: "#2563EB", label: "LOW" };
    case "INFO":
      return {
        color: "var(--text-secondary)",
        bg: "var(--bg-hover)",
        borderLeft: "var(--border)",
        label: "INFO",
      };
  }
}

// ─── Score circle ─────────────────────────────────────────────────────────────

function ScoreCircle({ score, color }: { score: number; color: string }) {
  const r = 40;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;

  return (
    <svg
      width="100"
      height="100"
      viewBox="0 0 100 100"
      style={{ flexShrink: 0 }}
    >
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke="var(--border)"
        strokeWidth="7"
      />
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="7"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 50 50)"
      />
      <text
        x="50"
        y="46"
        textAnchor="middle"
        style={{
          fontSize: 20,
          fontWeight: "bold",
          fill: color,
          fontFamily: "var(--font-ibm-mono), monospace",
        }}
      >
        {score}
      </text>
      <text
        x="50"
        y="62"
        textAnchor="middle"
        style={{ fontSize: 10, fill: "var(--text-tertiary)" }}
      >
        /100
      </text>
    </svg>
  );
}

// ─── Dimension card ────────────────────────────────────────────────────────────

function DimensionCard({
  label,
  score,
  weight,
  icon,
}: {
  label: string;
  score: number;
  weight: string;
  icon: ReactNode;
}) {
  const color =
    score >= 70 ? "var(--safe)" : score >= 40 ? "var(--suspicious)" : "var(--dangerous)";
  const barBg =
    score >= 70 ? "var(--safe)" : score >= 40 ? "var(--suspicious)" : "var(--dangerous)";

  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        padding: "16px",
        boxShadow: "var(--shadow-xs)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 14 }}>{icon}</span>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--text-secondary)",
            }}
          >
            {label}
          </span>
        </div>
        <span
          style={{
            fontSize: 10,
            fontFamily: "var(--font-ibm-mono), monospace",
            color: "var(--text-tertiary)",
            background: "var(--bg-hover)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: "1px 5px",
          }}
        >
          {weight}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 4, marginBottom: 8 }}>
        <span
          style={{
            fontSize: 28,
            fontWeight: 700,
            color,
            fontFamily: "var(--font-ibm-mono), monospace",
            lineHeight: 1,
          }}
        >
          {score}
        </span>
        <span style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 2 }}>
          /100
        </span>
      </div>
      <div
        style={{
          height: 4,
          background: "var(--bg-hover)",
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${score}%`,
            background: barBg,
            borderRadius: 2,
            transition: "width 0.4s ease",
          }}
        />
      </div>
    </div>
  );
}

// ─── Metadata panel ───────────────────────────────────────────────────────────

function MetadataPanel({ report }: { report: SkillSafetyScore }) {
  const meta = report.metadata;
  const lastActivity = meta.lastCommitDate
    ? new Date(meta.lastCommitDate).toLocaleDateString("en-US", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "Unknown";

  const accountAge =
    meta.authorAccountAge !== undefined
      ? meta.authorAccountAge < 30
        ? `${meta.authorAccountAge} days (new account)`
        : meta.authorAccountAge < 365
        ? `${meta.authorAccountAge} days`
        : `${Math.floor(meta.authorAccountAge / 365)} year(s)`
      : "Unknown";

  const badges = [
    meta.hasBashScripts && { label: "Bash scripts", warning: false },
    meta.hasPythonScripts && { label: "Python scripts", warning: false },
    meta.hasNodeScripts && { label: "Node.js scripts", warning: false },
    meta.hasInstallerScript && { label: "Installer script", warning: true },
  ].filter(Boolean) as { label: string; warning: boolean }[];

  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        padding: "20px 24px",
        marginBottom: 16,
        boxShadow: "var(--shadow-xs)",
      }}
    >
      <h3
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "var(--text-primary)",
          marginBottom: 14,
        }}
      >
        Metadata
      </h3>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "8px 32px",
          marginBottom: badges.length > 0 ? 14 : 0,
        }}
      >
        <MetaRow label="Name" value={meta.name || report.slug} />
        <MetaRow label="Stars" value={String(meta.stars)} />
        <MetaRow label="Author" value={meta.author} />
        <MetaRow label="Forks" value={String(meta.forks)} />
        <MetaRow label="Account age" value={accountAge} />
        <MetaRow label="Analyzed files" value={String(meta.files.length)} />
        <MetaRow
          label="Public repos"
          value={meta.authorPublicRepos !== undefined ? String(meta.authorPublicRepos) : "Unknown"}
        />
        <MetaRow label="Last activity" value={lastActivity} />
      </div>
      {badges.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
          {badges.map((b) => (
            <span
              key={b.label}
              style={{
                fontSize: 11,
                background: b.warning ? "var(--suspicious-bg)" : "var(--bg-hover)",
                border: `1px solid ${b.warning ? "#FCD34D" : "var(--border)"}`,
                borderRadius: "var(--radius)",
                padding: "2px 8px",
                color: b.warning ? "var(--suspicious)" : "var(--text-secondary)",
                fontWeight: 500,
              }}
            >
              {b.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{label}</span>
      <span
        style={{
          fontSize: 12,
          fontFamily: "var(--font-ibm-mono), monospace",
          color: "var(--text-secondary)",
          textAlign: "right",
        }}
      >
        {value}
      </span>
    </div>
  );
}

// ─── Findings panel ───────────────────────────────────────────────────────────

const SEVERITY_ORDER: Record<SkillFinding["severity"], number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
  INFO: 4,
};

function FindingsPanel({ findings }: { findings: SkillFinding[] }) {
  const sorted = [...findings].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
  );

  if (sorted.length === 0) {
    return (
      <div
        style={{
          background: "var(--safe-bg)",
          border: "1px solid #86EFAC",
          borderRadius: "var(--radius-lg)",
          padding: "32px",
          textAlign: "center",
          marginBottom: 16,
        }}
      >
        <p style={{ fontSize: 14, fontWeight: 600, color: "var(--safe)", marginBottom: 4 }}>
          No findings detected
        </p>
        <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>
          Static analysis found no suspicious patterns.
        </p>
      </div>
    );
  }

  const counts = findings.reduce<Record<string, number>>((acc, f) => {
    acc[f.severity] = (acc[f.severity] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        padding: "20px 24px",
        marginBottom: 16,
        boxShadow: "var(--shadow-xs)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
        }}
      >
        <h3 style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
          Findings ({findings.length})
        </h3>
        <div style={{ display: "flex", gap: 6 }}>
          {(["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"] as const).map((s) => {
            const c = counts[s];
            if (!c) return null;
            const cfg = getSeverityConfig(s);
            return (
              <span
                key={s}
                style={{
                  fontSize: 11,
                  fontFamily: "var(--font-ibm-mono), monospace",
                  background: cfg.bg,
                  color: cfg.color,
                  padding: "1px 7px",
                  borderRadius: "var(--radius)",
                  fontWeight: 600,
                }}
              >
                {c} {s}
              </span>
            );
          })}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {sorted.map((finding) => (
          <FindingCard key={finding.id} finding={finding} />
        ))}
      </div>
    </div>
  );
}

function FindingCard({ finding }: { finding: SkillFinding }) {
  const cfg = getSeverityConfig(finding.severity);

  return (
    <div
      style={{
        background: cfg.bg,
        border: "1px solid var(--border)",
        borderLeft: `3px solid ${cfg.borderLeft}`,
        borderRadius: "var(--radius)",
        padding: "12px 14px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 6,
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontFamily: "var(--font-ibm-mono), monospace",
            fontWeight: 700,
            background: cfg.bg,
            color: cfg.color,
            border: `1px solid ${cfg.borderLeft}`,
            borderRadius: "var(--radius)",
            padding: "1px 6px",
            flexShrink: 0,
          }}
        >
          {cfg.label}
        </span>
        <span
          style={{
            fontSize: 11,
            fontFamily: "var(--font-ibm-mono), monospace",
            color: "var(--text-tertiary)",
          }}
        >
          {finding.id}
        </span>
        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>
          {finding.title}
        </span>
      </div>

      <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 6, lineHeight: 1.6 }}>
        {finding.description}
      </p>

      {finding.file && (
        <p
          style={{
            fontSize: 11,
            fontFamily: "var(--font-ibm-mono), monospace",
            color: "var(--text-tertiary)",
            marginBottom: 6,
          }}
        >
          {finding.file}
          {finding.line ? `:${finding.line}` : ""}
        </p>
      )}

      {finding.evidence && (
        <pre
          style={{
            fontSize: 11,
            fontFamily: "var(--font-ibm-mono), monospace",
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: "8px 10px",
            overflowX: "auto",
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
            color: "var(--text-secondary)",
            marginBottom: 6,
          }}
        >
          {finding.evidence}
        </pre>
      )}

      <p style={{ fontSize: 11, color: "var(--text-secondary)" }}>
        <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>Recommendation:</span>{" "}
        {finding.recommendation}
      </p>
    </div>
  );
}

// ─── Files panel ──────────────────────────────────────────────────────────────

function FilesPanel({ report }: { report: SkillSafetyScore }) {
  const fileFindings = report.findings.reduce<Record<string, SkillFinding[]>>(
    (acc, f) => {
      if (!acc[f.file]) acc[f.file] = [];
      acc[f.file].push(f);
      return acc;
    },
    {}
  );

  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        padding: "20px 24px",
        boxShadow: "var(--shadow-xs)",
      }}
    >
      <h3
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "var(--text-primary)",
          marginBottom: 14,
        }}
      >
        Analyzed files ({report.metadata.files.length})
      </h3>
      <div>
        {report.metadata.files.map((filePath, i) => {
          const findings = fileFindings[filePath] ?? [];
          const critCount = findings.filter((f) => f.severity === "CRITICAL").length;
          const highCount = findings.filter((f) => f.severity === "HIGH").length;
          const isLast = i === report.metadata.files.length - 1;

          return (
            <div
              key={filePath}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
                padding: "7px 0",
                borderBottom: isLast ? "none" : "1px solid var(--border-subtle)",
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  fontFamily: "var(--font-ibm-mono), monospace",
                  color: "var(--text-secondary)",
                }}
              >
                {filePath}
              </span>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                {critCount > 0 && (
                  <span
                    style={{
                      fontSize: 11,
                      fontFamily: "var(--font-ibm-mono), monospace",
                      color: "#DC2626",
                      background: "#FEF2F2",
                      padding: "1px 6px",
                      borderRadius: "var(--radius)",
                    }}
                  >
                    {critCount} CRIT
                  </span>
                )}
                {highCount > 0 && (
                  <span
                    style={{
                      fontSize: 11,
                      fontFamily: "var(--font-ibm-mono), monospace",
                      color: "#EA580C",
                      background: "#FFF7ED",
                      padding: "1px 6px",
                      borderRadius: "var(--radius)",
                    }}
                  >
                    {highCount} HIGH
                  </span>
                )}
                {findings.length === 0 && (
                  <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>OK</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
