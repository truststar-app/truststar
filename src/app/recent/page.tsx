"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import type { RecentAudit } from "@/lib/recent-audits";

type Tab = "all" | "trust-score" | "skill-audit" | "npm-check";

const TYPE_META: Record<
  RecentAudit["type"],
  { label: string; bg: string; color: string; border: string }
> = {
  "trust-score": {
    label: "Trust",
    bg: "var(--accent-subtle)",
    color: "var(--accent)",
    border: "var(--accent-muted)",
  },
  "skill-audit": {
    label: "Code",
    bg: "var(--bg-hover)",
    color: "var(--text-secondary)",
    border: "var(--border)",
  },
  "npm-check": {
    label: "npm",
    bg: "#FFF7ED",
    color: "#C05600",
    border: "#FED7AA",
  },
};

function auditHref(audit: RecentAudit): string {
  if (audit.type === "trust-score") {
    const [owner, repo] = audit.slug.split("/");
    return `/report/${owner}/${repo}`;
  }
  if (audit.type === "skill-audit") {
    const [owner, repo] = audit.slug.split("/");
    return `/skill/${owner}/${repo}`;
  }
  return `/npm/${audit.slug}`;
}

function ScoreBadge({ score, label }: { score: number; label: string }) {
  const cfg =
    label === "SAFE"
      ? { bg: "var(--safe-bg)", color: "var(--safe)" }
      : label === "CAUTION"
      ? { bg: "var(--caution-bg)", color: "var(--caution)" }
      : label === "SUSPICIOUS"
      ? { bg: "var(--suspicious-bg)", color: "var(--suspicious)" }
      : label === "NEW"
      ? { bg: "var(--bg-hover)", color: "var(--text-secondary)" }
      : { bg: "var(--dangerous-bg)", color: "var(--dangerous)" };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "2px 10px",
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 600,
        fontFamily: "var(--font-ibm-mono), monospace",
        background: cfg.bg,
        color: cfg.color,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: "currentColor",
          flexShrink: 0,
        }}
      />
      {score}
    </span>
  );
}

function TypeBadge({ type }: { type: RecentAudit["type"] }) {
  const meta = TYPE_META[type];
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 600,
        padding: "2px 7px",
        borderRadius: 20,
        background: meta.bg,
        color: meta.color,
        border: `1px solid ${meta.border}`,
        textTransform: "uppercase" as const,
        letterSpacing: "0.4px",
        flexShrink: 0,
      }}
    >
      {meta.label}
    </span>
  );
}

function RepoAvatar({ letter }: { letter: string }) {
  return (
    <div
      style={{
        width: 28,
        height: 28,
        borderRadius: 6,
        background: "var(--bg-base)",
        border: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 12,
        fontWeight: 600,
        color: "var(--text-secondary)",
        flexShrink: 0,
      }}
    >
      {letter}
    </div>
  );
}

function formatRelativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function RecentAuditsPage() {
  const [tab, setTab] = useState<Tab>("all");
  const [audits, setAudits] = useState<RecentAudit[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const prevIdsRef = useRef<Set<string>>(new Set());
  const [newIds, setNewIds] = useState<Set<string>>(new Set());

  async function fetchAudits(t: Tab) {
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (t !== "all") params.set("type", t);
      const res = await fetch(`/api/recent-audits?${params}`);
      if (!res.ok) return;
      const data = (await res.json()) as { audits: RecentAudit[]; total: number };

      const incoming = new Set(data.audits.map((a) => a.id));
      const fresh = new Set<string>();
      if (prevIdsRef.current.size > 0) {
        for (const id of incoming) {
          if (!prevIdsRef.current.has(id)) fresh.add(id);
        }
      }
      prevIdsRef.current = incoming;
      if (fresh.size > 0) {
        setNewIds(fresh);
        setTimeout(() => setNewIds(new Set()), 2000);
      }

      setAudits(data.audits);
      setTotal(data.total);
      setLastUpdated(new Date());
    } catch {
      // ignore network errors
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    void fetchAudits(tab);
    const id = setInterval(() => void fetchAudits(tab), 30000);
    return () => clearInterval(id);
  }, [tab]);

  const tabs: { id: Tab; label: string }[] = [
    { id: "all", label: "All" },
    { id: "trust-score", label: "Trust Score" },
    { id: "npm-check", label: "npm Check" },
    { id: "skill-audit", label: "Code Scan" },
  ];

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg-base)" }}>
      <div style={{ maxWidth: "var(--max-w)", margin: "0 auto", padding: "32px 24px 48px" }}>

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
            className="link-accent"
          >
            Home
          </Link>
          <span>/</span>
          <span style={{ color: "var(--text-secondary)" }}>Recent Audits</span>
        </div>

        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
            marginBottom: 24,
          }}
        >
          <div>
            <h1
              style={{
                fontSize: 26,
                fontWeight: 700,
                letterSpacing: "-0.7px",
                color: "var(--text-primary)",
                marginBottom: 6,
              }}
            >
              Recent Audits
            </h1>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.5 }}>
              Live community feed — updates every 30 seconds.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 12px",
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              borderRadius: 20,
              fontSize: 12,
              color: "var(--text-secondary)",
              flexShrink: 0,
            }}
          >
            <span
              style={{ width: 7, height: 7, background: "var(--safe)", borderRadius: "50%" }}
              className="sa-pulse"
            />
            Live
            {lastUpdated && (
              <span style={{ color: "var(--text-tertiary)" }}>
                · {formatRelativeTime(lastUpdated.toISOString())}
              </span>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            gap: 4,
            marginBottom: 16,
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            padding: 4,
            width: "fit-content",
          }}
        >
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: "5px 14px",
                borderRadius: "var(--radius)",
                border: "none",
                fontSize: 13,
                fontWeight: 500,
                fontFamily: "inherit",
                cursor: "pointer",
                transition: "all 0.12s",
                background: tab === t.id ? "var(--accent)" : "transparent",
                color: tab === t.id ? "#fff" : "var(--text-secondary)",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            overflow: "hidden",
          }}
        >
          {/* Header row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 70px 90px 90px 70px",
              alignItems: "center",
              padding: "10px 16px",
              borderBottom: "1px solid var(--border-subtle)",
              background: "var(--bg-base)",
            }}
          >
            {["Repository / Package", "Type", "Score", "Verdict", "Time"].map((h) => (
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

          {loading ? (
            <div
              style={{
                padding: "48px 0",
                textAlign: "center",
                color: "var(--text-tertiary)",
                fontSize: 13,
              }}
            >
              Loading…
            </div>
          ) : audits.length === 0 ? (
            <div
              style={{
                padding: "64px 24px",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 0,
              }}
            >
              <img
                src="/14619e05-69a1-41be-86dc-5ecda5629b3a-removebg-preview.png"
                alt="TrustStar"
                width={64}
                height={64}
                style={{ objectFit: "contain", marginBottom: 16, opacity: 0.7 }}
              />
              <p
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  marginBottom: 8,
                  letterSpacing: "-0.3px",
                }}
              >
                No audits yet
              </p>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--text-secondary)",
                  marginBottom: 24,
                  maxWidth: 340,
                  lineHeight: 1.6,
                }}
              >
                Analyze a repository, npm package, or skill to see it appear here in real time.
              </p>
              <Link
                href="/"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "9px 20px",
                  background: "var(--accent)",
                  color: "#fff",
                  borderRadius: "var(--radius)",
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: "none",
                  boxShadow: "0 1px 3px rgba(217,54,54,0.25)",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "var(--accent-hover)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "var(--accent)";
                }}
              >
                Run your first analysis →
              </Link>
            </div>
          ) : (
            audits.map((audit) => {
              const isNew = newIds.has(audit.id);
              const href = auditHref(audit);
              const displayName = audit.slug;
              const letter = (audit.slug.split("/")[0] ?? "?")[0].toUpperCase();

              return (
                <Link
                  key={audit.id}
                  href={href}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 70px 90px 90px 70px",
                    alignItems: "center",
                    padding: "10px 16px",
                    borderBottom: "1px solid var(--border-subtle)",
                    textDecoration: "none",
                    color: "inherit",
                    transition: isNew ? "none" : "background 0.08s",
                    background: isNew ? "var(--safe-bg)" : "transparent",
                    animation: isNew ? "sa-fade-in 0.4s ease" : "none",
                  }}
                  onMouseEnter={(e) => {
                    if (!isNew)
                      (e.currentTarget as HTMLElement).style.background =
                        "var(--bg-hover)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isNew)
                      (e.currentTarget as HTMLElement).style.background =
                        "transparent";
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <RepoAvatar letter={letter} />
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        fontFamily: "var(--font-ibm-mono), monospace",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {displayName}
                    </span>
                  </span>
                  <TypeBadge type={audit.type} />
                  <ScoreBadge score={audit.score} label={audit.label} />
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color:
                        audit.label === "SAFE"
                          ? "var(--safe)"
                          : audit.label === "SUSPICIOUS"
                          ? "var(--suspicious)"
                          : audit.label === "NEW"
                          ? "var(--text-secondary)"
                          : "var(--dangerous)",
                    }}
                  >
                    {audit.label}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                    {formatRelativeTime(audit.analyzedAt)}
                  </span>
                </Link>
              );
            })
          )}
        </div>

        {!loading && audits.length > 0 && (
          <p
            style={{
              marginTop: 12,
              fontSize: 12,
              color: "var(--text-tertiary)",
              textAlign: "right",
            }}
          >
            Showing {audits.length} of {total} audits · auto-refreshes every 30s
          </p>
        )}
      </div>
    </main>
  );
}
