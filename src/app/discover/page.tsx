"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import type { ClawHubSkill, ClawHubStats } from "@/lib/clawhub/client";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "top-downloads" | "top-stars" | "newest" | "certified";

type ListResult = { skills: ClawHubSkill[]; total: number };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return "today";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function Skeleton({ w, h }: { w?: string | number; h?: number }) {
  return (
    <div
      style={{
        width: w ?? "100%",
        height: h ?? 16,
        borderRadius: 6,
        background: "var(--bg-hover)",
        animation: "sa-pulse 1.4s ease-in-out infinite",
      }}
    />
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  loading,
}: {
  label: string;
  value?: string;
  icon: ReactNode;
  loading: boolean;
}) {
  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: "20px 22px",
        boxShadow: "var(--shadow-xs)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ display: "flex", color: "var(--text-tertiary)" }}>{icon}</span>
        <span style={{ fontSize: 13, color: "var(--text-tertiary)", fontWeight: 500 }}>
          {label}
        </span>
      </div>
      {loading ? (
        <Skeleton w="60%" h={26} />
      ) : (
        <p
          style={{
            fontSize: 26,
            fontWeight: 700,
            fontFamily: "var(--font-ibm-mono), monospace",
            color: "var(--text-primary)",
            letterSpacing: "-0.5px",
          }}
        >
          {value}
        </p>
      )}
    </div>
  );
}

// ─── Row skeleton ─────────────────────────────────────────────────────────────

const COLS = "36px minmax(150px,1.4fr) minmax(180px,2fr) 80px 70px 150px";

function RowSkeleton({ i }: { i: number }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: COLS,
        alignItems: "center",
        padding: "14px 20px",
        borderBottom: "1px solid var(--border)",
        gap: 0,
        opacity: 1 - i * 0.12,
      }}
    >
      <Skeleton w={20} h={13} />
      <div style={{ paddingRight: 16 }}>
        <Skeleton w="70%" h={14} />
        <div style={{ marginTop: 5 }}>
          <Skeleton w="50%" h={11} />
        </div>
      </div>
      <div style={{ paddingRight: 16 }}>
        <Skeleton w="90%" h={13} />
      </div>
      <Skeleton w={36} h={13} />
      <Skeleton w={36} h={13} />
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <Skeleton w={60} h={26} />
      </div>
    </div>
  );
}

// ─── Empty / Error states ─────────────────────────────────────────────────────

function EmptyState({ query }: { query: string }) {
  return (
    <div style={{ padding: "48px 20px", textAlign: "center" }}>
      <p style={{ fontSize: 15, color: "var(--text-secondary)" }}>
        No skill found for &ldquo;{query}&rdquo;
      </p>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div style={{ padding: "48px 20px", textAlign: "center" }}>
      <p style={{ fontSize: 15, color: "var(--text-secondary)", marginBottom: 16 }}>
        Failed to load data. Please retry.
      </p>
      <button
        onClick={onRetry}
        style={{
          padding: "8px 18px",
          background: "var(--accent)",
          color: "#fff",
          border: "none",
          borderRadius: 6,
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        Retry
      </button>
    </div>
  );
}

// ─── Skill row ────────────────────────────────────────────────────────────────

function SkillRow({ skill, index, isLast }: { skill: ClawHubSkill; index: number; isLast: boolean }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: COLS,
        alignItems: "center",
        padding: "14px 20px",
        borderBottom: isLast ? "none" : "1px solid var(--border)",
        background: hovered ? "var(--bg-hover)" : "transparent",
        transition: "background 0.08s",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* # */}
      <span
        style={{
          fontSize: 13,
          fontFamily: "var(--font-ibm-mono), monospace",
          color: "var(--text-tertiary)",
        }}
      >
        {index + 1}
      </span>

      {/* Skill name + slug */}
      <div style={{ paddingRight: 16, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
          <p
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--text-primary)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {skill.display_name}
          </p>
          {skill.is_certified && (
            <span
              title="Certified"
              style={{
                fontSize: 10,
                fontWeight: 600,
                background: "var(--safe-bg)",
                color: "var(--safe)",
                border: "1px solid #bbf7d0",
                borderRadius: 10,
                padding: "1px 6px",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              ✓ Certified
            </span>
          )}
        </div>
        <p
          style={{
            fontSize: 11,
            fontFamily: "var(--font-ibm-mono), monospace",
            color: "var(--text-tertiary)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {skill.slug}
        </p>
      </div>

      {/* Description */}
      <p
        style={{
          fontSize: 13,
          color: "var(--text-secondary)",
          lineHeight: 1.4,
          paddingRight: 16,
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical" as const,
        }}
      >
        {skill.summary}
      </p>

      {/* Downloads */}
      <span
        style={{
          fontSize: 13,
          fontFamily: "var(--font-ibm-mono), monospace",
          color: "var(--text-secondary)",
          textAlign: "right" as const,
          paddingRight: 16,
        }}
      >
        {fmt(skill.downloads)}
      </span>

      {/* Stars */}
      <span
        style={{
          fontSize: 13,
          fontFamily: "var(--font-ibm-mono), monospace",
          color: "var(--text-secondary)",
          textAlign: "right" as const,
          paddingRight: 16,
        }}
      >
        {fmt(skill.stars)}
      </span>

      {/* Actions */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: 8,
        }}
      >
        <a
          href={skill.clawhub_url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            fontSize: 12,
            fontWeight: 500,
            padding: "5px 10px",
            background: "transparent",
            color: "var(--text-secondary)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            textDecoration: "none",
            whiteSpace: "nowrap",
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
          View ↗
        </a>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string }[] = [
  { id: "top-downloads", label: "Top Downloads" },
  { id: "top-stars",     label: "Most Starred" },
  { id: "newest",        label: "Newest" },
  { id: "certified",     label: "Certified Safe" },
];

export default function DiscoverPage() {
  const [activeTab, setActiveTab] = useState<Tab>("top-downloads");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const [skills, setSkills] = useState<ClawHubSkill[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState(false);

  const [stats, setStats] = useState<ClawHubStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const retryCountRef = useRef(0);

  // Debounce search
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(id);
  }, [searchQuery]);

  // Fetch stats once
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/clawhub?view=stats");
        if (!res.ok) throw new Error("stats fetch failed");
        const data = (await res.json()) as ClawHubStats;
        setStats(data);
      } catch {
        // Non-critical, fail silently
      } finally {
        setStatsLoading(false);
      }
    })();
  }, []);

  // Fetch list
  const fetchList = useCallback(async () => {
    setListLoading(true);
    setListError(false);
    try {
      let url: string;
      if (debouncedQuery.trim()) {
        url = `/api/clawhub?view=search&q=${encodeURIComponent(debouncedQuery)}&limit=50`;
      } else {
        url = `/api/clawhub?view=${activeTab}&limit=50`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error("list fetch failed");
      const data = (await res.json()) as ListResult;
      setSkills(data.skills ?? []);
    } catch {
      setListError(true);
    } finally {
      setListLoading(false);
    }
  }, [activeTab, debouncedQuery]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  const isSearching = debouncedQuery.trim().length > 0;

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg-base)" }}>
      <div
        style={{
          maxWidth: "var(--max-w)",
          margin: "0 auto",
          padding: "40px 32px 64px",
        }}
      >
        {/* Breadcrumb */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 32,
            fontSize: 14,
            color: "var(--text-tertiary)",
          }}
        >
          <Link href="/" style={{ color: "var(--text-tertiary)", textDecoration: "none" }}>
            Home
          </Link>
          <span>/</span>
          <span style={{ color: "var(--text-secondary)" }}>Discover</span>
        </div>

        {/* Page header */}
        <div style={{ marginBottom: 32 }}>
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
              marginBottom: 18,
              boxShadow: "var(--shadow-xs)",
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                background: "var(--accent)",
                borderRadius: "50%",
              }}
            />
            ClawHub Registry
          </div>
          <h1
            style={{
              fontSize: 40,
              fontWeight: 700,
              letterSpacing: "-1.5px",
              color: "var(--text-primary)",
              marginBottom: 10,
            }}
          >
            Discover Skills
          </h1>
          <p style={{ fontSize: 16, color: "var(--text-secondary)", lineHeight: 1.65, maxWidth: 560 }}>
            Explore the most popular Claude skills from the ClawHub registry.
            Live data from{" "}
            <a
              href="https://clawhub.ai"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--accent)", textDecoration: "none" }}
            >
              clawhub.ai
            </a>
            .
          </p>
        </div>

        {/* Stats cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 14,
            marginBottom: 32,
          }}
        >
          <StatCard
            label="Listed skills"
            value={stats ? fmt(stats.total_skills) : undefined}
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>}
            loading={statsLoading}
          />
          <StatCard
            label="Certified"
            value={stats ? fmt(stats.certified_skills) : undefined}
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>}
            loading={statsLoading}
          />
          <StatCard
            label="Downloads"
            value={stats ? fmt(stats.total_downloads) : undefined}
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>}
            loading={statsLoading}
          />
          <StatCard
            label="Total stars"
            value={stats ? fmt(stats.total_stars) : undefined}
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>}
            loading={statsLoading}
          />
        </div>

        {/* Tabs + Search */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid var(--border)",
            marginBottom: 0,
            gap: 16,
          }}
        >
          {/* Tabs */}
          <div style={{ display: "flex", gap: 0 }}>
            {TABS.map((tab) => {
              const active = !isSearching && activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setSearchQuery("");
                  }}
                  style={{
                    padding: "10px 16px",
                    fontSize: 14,
                    fontWeight: active ? 600 : 400,
                    color: active ? "var(--accent)" : "var(--text-secondary)",
                    background: "none",
                    border: "none",
                    borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent",
                    cursor: "pointer",
                    transition: "color 0.12s",
                    fontFamily: "inherit",
                    marginBottom: -1,
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div
            style={{
              position: "relative",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-tertiary)",
                pointerEvents: "none",
                display: "flex",
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </span>
            <input
              type="text"
              placeholder="Search skills…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: "7px 12px 7px 30px",
                fontSize: 13,
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                color: "var(--text-primary)",
                outline: "none",
                width: 200,
                fontFamily: "inherit",
                transition: "border-color 0.12s",
              }}
              onFocus={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)";
              }}
              onBlur={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
              }}
            />
          </div>
        </div>

        {/* Table */}
        <div
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderTop: "none",
            borderRadius: "0 0 10px 10px",
            overflow: "hidden",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          {/* Table header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: COLS,
              padding: "10px 20px",
              background: "var(--bg-base)",
              borderBottom: "1px solid var(--border)",
            }}
          >
            {[
              { label: "#",            align: "left"  },
              { label: "Skill",        align: "left"  },
              { label: "Description",  align: "left"  },
              { label: "DL",           align: "right" },
              { label: "Stars",        align: "right" },
              { label: "",             align: "right" },
            ].map(({ label, align }, i) => (
              <span
                key={i}
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--text-tertiary)",
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.5px",
                  textAlign: align as "left" | "right",
                  paddingRight: i === 3 || i === 4 ? 16 : 0,
                }}
              >
                {label}
              </span>
            ))}
          </div>

          {/* Body */}
          {listLoading ? (
            <>
              {Array.from({ length: 8 }).map((_, i) => (
                <RowSkeleton key={i} i={i} />
              ))}
            </>
          ) : listError ? (
            <ErrorState onRetry={() => { retryCountRef.current++; void fetchList(); }} />
          ) : skills.length === 0 && isSearching ? (
            <EmptyState query={debouncedQuery} />
          ) : skills.length === 0 ? (
            <EmptyState query="" />
          ) : (
            skills.map((skill, i) => (
              <SkillRow
                key={skill.slug}
                skill={skill}
                index={i}
                isLast={i === skills.length - 1}
              />
            ))
          )}
        </div>

        {/* Footer note */}
        {!listLoading && !listError && skills.length > 0 && (
          <p
            style={{
              marginTop: 18,
              fontSize: 13,
              color: "var(--text-tertiary)",
              textAlign: "center",
            }}
          >
            {isSearching
              ? `${skills.length} result${skills.length > 1 ? "s" : ""} for "${debouncedQuery}"`
              : `${skills.length} skills · Live data from clawhub.ai`}
          </p>
        )}
      </div>
    </main>
  );
}
