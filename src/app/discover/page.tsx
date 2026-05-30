"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import type { ClawHubSkill, ClawHubStats } from "@/lib/clawhub/client";

// ─── Types ──────────────────────────────────────────────────────────────────

type MainTab = "github" | "npm" | "clawhub";
type ClawSubTab = "top-downloads" | "top-stars" | "newest" | "certified";

interface GithubRepo {
  id: number;
  name: string;
  full_name: string;
  owner: string;
  description: string | null;
  stars: number;
  language: string | null;
  created_at: string;
  topics: string[];
}

interface NpmPackage {
  name: string;
  description: string;
  version: string;
  weeklyDownloads: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

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

// ─── Breakpoint hook ────────────────────────────────────────────────────────

function useBreakpoint() {
  const [bp, setBp] = useState<"mobile" | "tablet" | "desktop">("desktop");
  useEffect(() => {
    const check = () => {
      const w = window.innerWidth;
      setBp(w < 640 ? "mobile" : w < 1024 ? "tablet" : "desktop");
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return bp;
}

// ─── Skeleton ───────────────────────────────────────────────────────────────

function Sk({ w, h }: { w?: string | number; h?: number }) {
  return (
    <div style={{ width: w ?? "100%", height: h ?? 16, borderRadius: 6, background: "var(--bg-hover)", animation: "sa-pulse 1.4s ease-in-out infinite" }} />
  );
}

// ─── StatCard ───────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, loading }: { label: string; value?: string; icon: ReactNode; loading: boolean }) {
  return (
    <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "20px 22px", boxShadow: "var(--shadow-xs)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ display: "flex", color: "var(--text-tertiary)" }}>{icon}</span>
        <span style={{ fontSize: 13, color: "var(--text-tertiary)", fontWeight: 500 }}>{label}</span>
      </div>
      {loading ? <Sk w="60%" h={26} /> : (
        <p style={{ fontSize: 26, fontWeight: 700, fontFamily: "var(--font-ibm-mono), monospace", color: "var(--text-primary)", letterSpacing: "-0.5px" }}>
          {value ?? "—"}
        </p>
      )}
    </div>
  );
}

// ─── Icons ──────────────────────────────────────────────────────────────────

const IcoBox   = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>;
const IcoCheck = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
const IcoDl    = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>;
const IcoStar  = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
const IcoRepo  = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>;
const IcoLang  = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>;
const IcoAvg   = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>;
const IcoSearch = <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;

// ─── Shared components ───────────────────────────────────────────────────────

function AccentBtn({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} style={{ display: "inline-flex", alignItems: "center", fontSize: 12, fontWeight: 600, padding: "5px 10px", background: "var(--accent)", color: "#fff", borderRadius: 6, textDecoration: "none", whiteSpace: "nowrap" }}>
      {label}
    </Link>
  );
}

function LangBadge({ lang }: { lang: string | null }) {
  if (!lang) return <span style={{ color: "var(--text-tertiary)", fontSize: 13 }}>—</span>;
  return (
    <span style={{ display: "inline-block", fontSize: 11, fontWeight: 500, padding: "2px 8px", background: "var(--bg-hover)", color: "var(--text-secondary)", borderRadius: 20, whiteSpace: "nowrap" }}>
      {lang}
    </span>
  );
}

function ErrState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div style={{ padding: "48px 20px", textAlign: "center" }}>
      <p style={{ fontSize: 15, color: "var(--text-secondary)", marginBottom: 16 }}>{message}</p>
      <button onClick={onRetry} style={{ padding: "8px 18px", background: "var(--accent)", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
        Retry
      </button>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div style={{ padding: "48px 20px", textAlign: "center" }}>
      <p style={{ fontSize: 15, color: "var(--text-secondary)" }}>{message}</p>
    </div>
  );
}

const SELECT_STYLE: React.CSSProperties = { padding: "7px 10px", fontSize: 13, background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-primary)", outline: "none", cursor: "pointer", fontFamily: "inherit" };
const SEARCH_STYLE: React.CSSProperties = { padding: "7px 12px 7px 30px", fontSize: 13, background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-primary)", outline: "none", fontFamily: "inherit", width: "100%" };

// ─── GitHub components ───────────────────────────────────────────────────────

const GH_GRID     = "36px minmax(160px,1.5fr) minmax(200px,2fr) 80px 110px 110px";
const GH_GRID_TAB = "36px minmax(160px,1.5fr) 80px 110px 110px";

function GhHeader({ tab }: { tab: boolean }) {
  const cols  = tab ? ["#","Repo","Stars","Language",""] : ["#","Repo","Description","Stars","Language",""];
  const right = tab ? [false,false,true,false,true]    : [false,false,false,true,false,true];
  return (
    <div style={{ display: "grid", gridTemplateColumns: tab ? GH_GRID_TAB : GH_GRID, padding: "10px 20px", background: "var(--bg-base)", borderBottom: "1px solid var(--border)" }}>
      {cols.map((label, i) => (
        <span key={i} style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.5px", textAlign: right[i] ? "right" : "left", paddingRight: right[i] && label ? 16 : 0 }}>
          {label}
        </span>
      ))}
    </div>
  );
}

function GhRow({ repo, index, isLast, tab }: { repo: GithubRepo; index: number; isLast: boolean; tab: boolean }) {
  const [hov, setHov] = useState(false);
  return (
    <div style={{ display: "grid", gridTemplateColumns: tab ? GH_GRID_TAB : GH_GRID, alignItems: "center", padding: "14px 20px", borderBottom: isLast ? "none" : "1px solid var(--border)", background: hov ? "var(--bg-hover)" : "transparent", transition: "background 0.08s" }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      <span style={{ fontSize: 13, fontFamily: "var(--font-ibm-mono), monospace", color: "var(--text-tertiary)" }}>{index + 1}</span>
      <div style={{ paddingRight: 16, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--font-ibm-mono), monospace", color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {repo.owner}/{repo.name}
        </p>
        <p style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 2 }}>{timeAgo(repo.created_at)}</p>
      </div>
      {!tab && (
        <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.4, paddingRight: 16, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>
          {repo.description ?? "—"}
        </p>
      )}
      <span style={{ fontSize: 13, fontFamily: "var(--font-ibm-mono), monospace", color: "var(--text-secondary)", textAlign: "right", paddingRight: 16 }}>{fmt(repo.stars)}</span>
      <div style={{ paddingRight: 16 }}><LangBadge lang={repo.language} /></div>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <AccentBtn href={`/report/${repo.owner}/${repo.name}`} label="Analyze →" />
      </div>
    </div>
  );
}

function GhCard({ repo }: { repo: GithubRepo }) {
  return (
    <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 10, padding: 16, marginBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
        <div style={{ minWidth: 0, flex: 1, paddingRight: 8 }}>
          <p style={{ fontSize: 14, fontWeight: 700, fontFamily: "var(--font-ibm-mono), monospace", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {repo.owner}/{repo.name}
          </p>
          <p style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 2 }}>{timeAgo(repo.created_at)}</p>
        </div>
        <span style={{ fontSize: 12, fontFamily: "var(--font-ibm-mono), monospace", color: "var(--text-secondary)", flexShrink: 0 }}>{fmt(repo.stars)} *</span>
      </div>
      {repo.description && (
        <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, marginBottom: 10 }}>
          {repo.description}
        </p>
      )}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <LangBadge lang={repo.language} />
        <AccentBtn href={`/report/${repo.owner}/${repo.name}`} label="Analyze →" />
      </div>
    </div>
  );
}

function GhRowSk({ i, tab }: { i: number; tab: boolean }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: tab ? GH_GRID_TAB : GH_GRID, alignItems: "center", padding: "14px 20px", borderBottom: "1px solid var(--border)", opacity: 1 - i * 0.1 }}>
      <Sk w={20} h={13} />
      <div style={{ paddingRight: 16 }}><Sk w="75%" h={14} /><div style={{ marginTop: 5 }}><Sk w="35%" h={11} /></div></div>
      {!tab && <div style={{ paddingRight: 16 }}><Sk w="90%" h={13} /></div>}
      <Sk w={40} h={13} />
      <Sk w={64} h={20} />
      <div style={{ display: "flex", justifyContent: "flex-end" }}><Sk w={80} h={26} /></div>
    </div>
  );
}

// ─── npm components ──────────────────────────────────────────────────────────

const NPM_GRID     = "36px minmax(130px,1.3fr) minmax(200px,2fr) 120px 80px 90px";
const NPM_GRID_TAB = "36px minmax(130px,1.3fr) 120px 80px 90px";

function NpmHeader({ tab }: { tab: boolean }) {
  const cols  = tab ? ["#","Package","Downloads/wk","Version",""] : ["#","Package","Description","Downloads/wk","Version",""];
  const right = tab ? [false,false,true,false,true]               : [false,false,false,true,false,true];
  return (
    <div style={{ display: "grid", gridTemplateColumns: tab ? NPM_GRID_TAB : NPM_GRID, padding: "10px 20px", background: "var(--bg-base)", borderBottom: "1px solid var(--border)" }}>
      {cols.map((label, i) => (
        <span key={i} style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.5px", textAlign: right[i] ? "right" : "left", paddingRight: right[i] && label ? 16 : 0 }}>
          {label}
        </span>
      ))}
    </div>
  );
}

function NpmRow({ pkg, index, isLast, tab }: { pkg: NpmPackage; index: number; isLast: boolean; tab: boolean }) {
  const [hov, setHov] = useState(false);
  return (
    <div style={{ display: "grid", gridTemplateColumns: tab ? NPM_GRID_TAB : NPM_GRID, alignItems: "center", padding: "14px 20px", borderBottom: isLast ? "none" : "1px solid var(--border)", background: hov ? "var(--bg-hover)" : "transparent", transition: "background 0.08s" }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      <span style={{ fontSize: 13, fontFamily: "var(--font-ibm-mono), monospace", color: "var(--text-tertiary)" }}>{index + 1}</span>
      <div style={{ paddingRight: 16, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--font-ibm-mono), monospace", color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {pkg.name}
        </p>
      </div>
      {!tab && (
        <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.4, paddingRight: 16, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>
          {pkg.description || "—"}
        </p>
      )}
      <span style={{ fontSize: 13, fontFamily: "var(--font-ibm-mono), monospace", color: "var(--text-secondary)", textAlign: "right", paddingRight: 16 }}>{fmt(pkg.weeklyDownloads)}</span>
      <span style={{ fontSize: 12, color: "var(--text-tertiary)", fontFamily: "var(--font-ibm-mono), monospace", paddingRight: 16 }}>{pkg.version ? `v${pkg.version}` : "—"}</span>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <AccentBtn href={`/npm/${pkg.name}`} label="Check →" />
      </div>
    </div>
  );
}

function NpmCard({ pkg }: { pkg: NpmPackage }) {
  return (
    <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 10, padding: 16, marginBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, fontFamily: "var(--font-ibm-mono), monospace", color: "var(--text-primary)" }}>{pkg.name}</p>
          {pkg.version && <p style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 2, fontFamily: "var(--font-ibm-mono), monospace" }}>v{pkg.version}</p>}
        </div>
        <span style={{ fontSize: 12, fontFamily: "var(--font-ibm-mono), monospace", color: "var(--text-secondary)", flexShrink: 0 }}>{fmt(pkg.weeklyDownloads)}/wk</span>
      </div>
      {pkg.description && (
        <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, marginBottom: 10 }}>
          {pkg.description}
        </p>
      )}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <AccentBtn href={`/npm/${pkg.name}`} label="Check →" />
      </div>
    </div>
  );
}

function NpmRowSk({ i, tab }: { i: number; tab: boolean }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: tab ? NPM_GRID_TAB : NPM_GRID, alignItems: "center", padding: "14px 20px", borderBottom: "1px solid var(--border)", opacity: 1 - i * 0.1 }}>
      <Sk w={20} h={13} />
      <div style={{ paddingRight: 16 }}><Sk w="70%" h={14} /></div>
      {!tab && <div style={{ paddingRight: 16 }}><Sk w="90%" h={13} /></div>}
      <Sk w={50} h={13} />
      <Sk w={36} h={13} />
      <div style={{ display: "flex", justifyContent: "flex-end" }}><Sk w={70} h={26} /></div>
    </div>
  );
}

// ─── ClawHub components ──────────────────────────────────────────────────────

const CL_GRID     = "36px minmax(150px,1.4fr) minmax(180px,2fr) 80px 70px 90px";
const CL_GRID_TAB = "36px minmax(150px,1.4fr) 80px 70px 90px";

function ClHeader({ tab }: { tab: boolean }) {
  const cols  = tab ? ["#","Skill","DL","Stars",""] : ["#","Skill","Description","DL","Stars",""];
  const right = tab ? [false,false,true,true,true] : [false,false,false,true,true,true];
  return (
    <div style={{ display: "grid", gridTemplateColumns: tab ? CL_GRID_TAB : CL_GRID, padding: "10px 20px", background: "var(--bg-base)", borderBottom: "1px solid var(--border)" }}>
      {cols.map((label, i) => (
        <span key={i} style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.5px", textAlign: right[i] ? "right" : "left", paddingRight: right[i] && label ? 16 : 0 }}>
          {label}
        </span>
      ))}
    </div>
  );
}

function ClRow({ skill, index, isLast, tab }: { skill: ClawHubSkill; index: number; isLast: boolean; tab: boolean }) {
  const [hov, setHov] = useState(false);
  return (
    <div style={{ display: "grid", gridTemplateColumns: tab ? CL_GRID_TAB : CL_GRID, alignItems: "center", padding: "14px 20px", borderBottom: isLast ? "none" : "1px solid var(--border)", background: hov ? "var(--bg-hover)" : "transparent", transition: "background 0.08s" }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      <span style={{ fontSize: 13, fontFamily: "var(--font-ibm-mono), monospace", color: "var(--text-tertiary)" }}>{index + 1}</span>
      <div style={{ paddingRight: 16, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{skill.display_name}</p>
          {skill.is_certified && (
            <span style={{ fontSize: 10, fontWeight: 600, background: "var(--safe-bg)", color: "var(--safe)", border: "1px solid #bbf7d0", borderRadius: 10, padding: "1px 6px", whiteSpace: "nowrap", flexShrink: 0 }}>Certified</span>
          )}
        </div>
        <p style={{ fontSize: 11, fontFamily: "var(--font-ibm-mono), monospace", color: "var(--text-tertiary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{skill.slug}</p>
      </div>
      {!tab && (
        <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.4, paddingRight: 16, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>
          {skill.summary}
        </p>
      )}
      <span style={{ fontSize: 13, fontFamily: "var(--font-ibm-mono), monospace", color: "var(--text-secondary)", textAlign: "right", paddingRight: 16 }}>{fmt(skill.downloads)}</span>
      <span style={{ fontSize: 13, fontFamily: "var(--font-ibm-mono), monospace", color: "var(--text-secondary)", textAlign: "right", paddingRight: 16 }}>{fmt(skill.stars)}</span>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <a href={skill.clawhub_url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", fontSize: 12, fontWeight: 500, padding: "5px 10px", background: "transparent", color: "var(--text-secondary)", border: "1px solid var(--border)", borderRadius: 6, textDecoration: "none", whiteSpace: "nowrap" }}>
          View ↗
        </a>
      </div>
    </div>
  );
}

function ClCard({ skill }: { skill: ClawHubSkill }) {
  return (
    <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 10, padding: 16, marginBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
        <div style={{ minWidth: 0, flex: 1, paddingRight: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{skill.display_name}</p>
            {skill.is_certified && (
              <span style={{ fontSize: 10, fontWeight: 600, background: "var(--safe-bg)", color: "var(--safe)", border: "1px solid #bbf7d0", borderRadius: 10, padding: "1px 6px", whiteSpace: "nowrap", flexShrink: 0 }}>Certified</span>
            )}
          </div>
          <p style={{ fontSize: 11, fontFamily: "var(--font-ibm-mono), monospace", color: "var(--text-tertiary)", marginTop: 2 }}>{skill.slug}</p>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <p style={{ fontSize: 12, fontFamily: "var(--font-ibm-mono), monospace", color: "var(--text-secondary)" }}>{fmt(skill.downloads)} DL</p>
          <p style={{ fontSize: 12, fontFamily: "var(--font-ibm-mono), monospace", color: "var(--text-secondary)" }}>{fmt(skill.stars)} *</p>
        </div>
      </div>
      {skill.summary && (
        <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, marginBottom: 10 }}>
          {skill.summary}
        </p>
      )}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <a href={skill.clawhub_url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", fontSize: 12, fontWeight: 500, padding: "5px 10px", background: "transparent", color: "var(--text-secondary)", border: "1px solid var(--border)", borderRadius: 6, textDecoration: "none", whiteSpace: "nowrap" }}>
          View ↗
        </a>
      </div>
    </div>
  );
}

function ClRowSk({ i, tab }: { i: number; tab: boolean }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: tab ? CL_GRID_TAB : CL_GRID, alignItems: "center", padding: "14px 20px", borderBottom: "1px solid var(--border)", opacity: 1 - i * 0.1 }}>
      <Sk w={20} h={13} />
      <div style={{ paddingRight: 16 }}><Sk w="70%" h={14} /><div style={{ marginTop: 5 }}><Sk w="50%" h={11} /></div></div>
      {!tab && <div style={{ paddingRight: 16 }}><Sk w="90%" h={13} /></div>}
      <Sk w={36} h={13} />
      <Sk w={36} h={13} />
      <div style={{ display: "flex", justifyContent: "flex-end" }}><Sk w={60} h={26} /></div>
    </div>
  );
}

// ─── Constants ───────────────────────────────────────────────────────────────

const MAIN_TABS = [
  { id: "github"  as MainTab, label: "GitHub Trending" },
  { id: "npm"     as MainTab, label: "npm Popular"     },
  { id: "clawhub" as MainTab, label: "OpenClaw Skills" },
];

const CLAW_SUBTABS: { id: ClawSubTab; label: string }[] = [
  { id: "top-downloads", label: "Top Downloads"  },
  { id: "top-stars",     label: "Most Starred"   },
  { id: "newest",        label: "Newest"         },
  { id: "certified",     label: "Certified Safe" },
];

const GH_PERIODS   = [{ value: "week", label: "This Week" }, { value: "month", label: "This Month" }, { value: "quarter", label: "This Quarter" }];
const GH_LANGUAGES = [
  { value: "",           label: "All Languages" },
  { value: "JavaScript", label: "JavaScript"    },
  { value: "TypeScript", label: "TypeScript"    },
  { value: "Python",     label: "Python"        },
  { value: "Go",         label: "Go"            },
  { value: "Rust",       label: "Rust"          },
  { value: "Java",       label: "Java"          },
  { value: "C++",        label: "C++"           },
  { value: "C",          label: "C"             },
];

// ─── Page ────────────────────────────────────────────────────────────────────

export default function DiscoverPage() {
  const bp       = useBreakpoint();
  const isMobile = bp === "mobile";
  const isTablet = bp === "tablet";

  // main tab
  const [mainTab, setMainTab] = useState<MainTab>("github");

  // GitHub
  const [ghPeriod,   setGhPeriod]   = useState("month");
  const [ghLanguage, setGhLanguage] = useState("");
  const [ghData,     setGhData]     = useState<{ items: GithubRepo[]; total: number } | null>(null);
  const [ghLoading,  setGhLoading]  = useState(false);
  const [ghError,    setGhError]    = useState<"rate_limit" | "fetch_failed" | null>(null);
  const [ghRetry,    setGhRetry]    = useState(0);

  // npm
  const [npmSearch,   setNpmSearch]   = useState("");
  const [npmDebounced,setNpmDebounced]= useState("");
  const [npmSort,     setNpmSort]     = useState<"downloads" | "name">("downloads");
  const [npmData,     setNpmData]     = useState<NpmPackage[] | null>(null);
  const [npmLoading,  setNpmLoading]  = useState(false);
  const [npmError,    setNpmError]    = useState(false);
  const npmFetchedRef = useRef(false);
  const [npmRetry,    setNpmRetry]    = useState(0);

  // ClawHub
  const [clawSub,          setClawSub]          = useState<ClawSubTab>("top-downloads");
  const [clawSearch,       setClawSearch]       = useState("");
  const [clawDebounced,    setClawDebounced]    = useState("");
  const [clawSkills,       setClawSkills]       = useState<ClawHubSkill[]>([]);
  const [clawLoading,      setClawLoading]      = useState(false);
  const [clawError,        setClawError]        = useState(false);
  const [clawStats,        setClawStats]        = useState<ClawHubStats | null>(null);
  const [clawStatsLoading, setClawStatsLoading] = useState(true);
  const [clawRetry,        setClawRetry]        = useState(0);

  // debounce
  useEffect(() => { const id = setTimeout(() => setNpmDebounced(npmSearch), 300); return () => clearTimeout(id); }, [npmSearch]);
  useEffect(() => { const id = setTimeout(() => setClawDebounced(clawSearch), 300); return () => clearTimeout(id); }, [clawSearch]);

  // fetch GitHub
  useEffect(() => {
    if (mainTab !== "github") return;
    let cancelled = false;
    setGhLoading(true); setGhError(null);
    (async () => {
      try {
        const p = new URLSearchParams({ period: ghPeriod });
        if (ghLanguage) p.set("language", ghLanguage);
        const res = await fetch(`/api/discover/github?${p}`);
        if (cancelled) return;
        if (res.status === 429) { setGhError("rate_limit"); return; }
        if (!res.ok) throw new Error();
        setGhData(await res.json() as { items: GithubRepo[]; total: number });
      } catch { if (!cancelled) setGhError("fetch_failed"); }
      finally  { if (!cancelled) setGhLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [mainTab, ghPeriod, ghLanguage, ghRetry]);

  // fetch npm (once, with retry)
  useEffect(() => {
    if (mainTab !== "npm") return;
    if (npmFetchedRef.current && npmRetry === 0) return;
    let cancelled = false;
    setNpmLoading(true); setNpmError(false);
    (async () => {
      try {
        const res = await fetch("/api/discover/npm");
        if (cancelled) return;
        if (!res.ok) throw new Error();
        const d = await res.json() as { packages: NpmPackage[] };
        setNpmData(d.packages);
        npmFetchedRef.current = true;
      } catch { if (!cancelled) { setNpmError(true); npmFetchedRef.current = false; } }
      finally  { if (!cancelled) setNpmLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [mainTab, npmRetry]);

  // ClawHub stats (once)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/clawhub?view=stats");
        if (!res.ok) throw new Error();
        setClawStats(await res.json() as ClawHubStats);
      } catch { /* non-critical */ }
      finally { setClawStatsLoading(false); }
    })();
  }, []);

  // fetch ClawHub list
  useEffect(() => {
    if (mainTab !== "clawhub") return;
    let cancelled = false;
    setClawLoading(true); setClawError(false);
    (async () => {
      try {
        const url = clawDebounced.trim()
          ? `/api/clawhub?view=search&q=${encodeURIComponent(clawDebounced)}&limit=50`
          : `/api/clawhub?view=${clawSub}&limit=50`;
        const res = await fetch(url);
        if (cancelled) return;
        if (!res.ok) throw new Error();
        const d = await res.json() as { skills: ClawHubSkill[] };
        setClawSkills(d.skills ?? []);
      } catch { if (!cancelled) setClawError(true); }
      finally  { if (!cancelled) setClawLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [mainTab, clawSub, clawDebounced, clawRetry]);

  // computed
  const filteredNpm = useMemo(() => {
    if (!npmData) return [];
    let list = [...npmData];
    if (npmDebounced.trim()) {
      const q = npmDebounced.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
    }
    if (npmSort === "name") list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [npmData, npmDebounced, npmSort]);

  const ghStats = useMemo(() => {
    if (!ghData) return null;
    const langs = new Set(ghData.items.map(r => r.language).filter(Boolean));
    return { repos: ghData.items.length, totalStars: ghData.items.reduce((s, r) => s + r.stars, 0), languages: langs.size };
  }, [ghData]);

  const npmStats = useMemo(() => {
    if (!filteredNpm.length) return null;
    const total = filteredNpm.reduce((s, p) => s + p.weeklyDownloads, 0);
    return { count: filteredNpm.length, total, avg: Math.round(total / filteredNpm.length) };
  }, [filteredNpm]);

  // ─── Render ────────────────────────────────────────────────────────────────

  const padX = isMobile ? "16px" : "32px";

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg-base)" }}>
      <div style={{ maxWidth: "var(--max-w)", margin: "0 auto", padding: isMobile ? `24px ${padX} 48px` : `40px ${padX} 64px` }}>

        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 28, fontSize: 14, color: "var(--text-tertiary)" }}>
          <Link href="/" style={{ color: "var(--text-tertiary)", textDecoration: "none" }}>Home</Link>
          <span>/</span>
          <span style={{ color: "var(--text-secondary)" }}>Discover</span>
        </div>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: isMobile ? 30 : 40, fontWeight: 700, letterSpacing: "-1.5px", color: "var(--text-primary)", marginBottom: 10 }}>
            Discover
          </h1>
          <p style={{ fontSize: 16, color: "var(--text-secondary)", lineHeight: 1.65, maxWidth: 560 }}>
            Trending GitHub repos, popular npm packages, and top OpenClaw skills — all in one place.
          </p>
        </div>

        {/* Main tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid var(--border)", marginBottom: 28, overflowX: "auto", WebkitOverflowScrolling: "touch" as React.CSSProperties["WebkitOverflowScrolling"] }}>
          {MAIN_TABS.map(tab => {
            const active = mainTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setMainTab(tab.id)} style={{ padding: isMobile ? "10px 14px" : "10px 20px", fontSize: isMobile ? 13 : 15, fontWeight: active ? 600 : 400, color: active ? "var(--accent)" : "var(--text-secondary)", background: "none", border: "none", borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent", cursor: "pointer", fontFamily: "inherit", marginBottom: -1, whiteSpace: "nowrap", transition: "color 0.12s", flexShrink: 0 }}>
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Stats cards */}
        <div style={{ display: "grid", gridTemplateColumns: mainTab === "clawhub" ? (isMobile ? "1fr 1fr" : "repeat(4,1fr)") : (isMobile ? "1fr 1fr" : "repeat(3,1fr)"), gap: 14, marginBottom: 28 }}>
          {mainTab === "github" && (<>
            <StatCard label="Repos found"  value={ghStats ? String(ghStats.repos)      : undefined} icon={IcoRepo}  loading={ghLoading} />
            <StatCard label="Total stars"  value={ghStats ? fmt(ghStats.totalStars)     : undefined} icon={IcoStar}  loading={ghLoading} />
            <StatCard label="Languages"    value={ghStats ? String(ghStats.languages)   : undefined} icon={IcoLang}  loading={ghLoading} />
          </>)}
          {mainTab === "npm" && (<>
            <StatCard label="Packages"               value={npmStats ? String(npmStats.count) : undefined} icon={IcoBox}  loading={npmLoading} />
            <StatCard label="Total weekly downloads" value={npmStats ? fmt(npmStats.total)    : undefined} icon={IcoDl}   loading={npmLoading} />
            <StatCard label="Avg downloads"          value={npmStats ? fmt(npmStats.avg)      : undefined} icon={IcoAvg}  loading={npmLoading} />
          </>)}
          {mainTab === "clawhub" && (<>
            <StatCard label="Listed skills" value={clawStats ? fmt(clawStats.total_skills)    : undefined} icon={IcoBox}   loading={clawStatsLoading} />
            <StatCard label="Certified"     value={clawStats ? fmt(clawStats.certified_skills): undefined} icon={IcoCheck} loading={clawStatsLoading} />
            <StatCard label="Downloads"     value={clawStats ? fmt(clawStats.total_downloads) : undefined} icon={IcoDl}    loading={clawStatsLoading} />
            <StatCard label="Total stars"   value={clawStats ? fmt(clawStats.total_stars)     : undefined} icon={IcoStar}  loading={clawStatsLoading} />
          </>)}
        </div>

        {/* ── GitHub Trending ─────────────────────────────────────────────── */}
        {mainTab === "github" && (<>
          <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: 10, alignItems: isMobile ? "stretch" : "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <select value={ghPeriod} onChange={e => setGhPeriod(e.target.value)} style={{ ...SELECT_STYLE, width: isMobile ? "100%" : "auto" }}>
                {GH_PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
              <select value={ghLanguage} onChange={e => setGhLanguage(e.target.value)} style={{ ...SELECT_STYLE, width: isMobile ? "100%" : "auto" }}>
                {GH_LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
            {ghData && !ghLoading && (
              <p style={{ fontSize: 13, color: "var(--text-tertiary)", whiteSpace: "nowrap" }}>{ghData.items.length} repos</p>
            )}
          </div>

          {isMobile ? (
            <div>
              {ghLoading ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 10, padding: 16, marginBottom: 8, opacity: 1 - i * 0.1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}><Sk w="60%" h={16} /><Sk w={40} h={13} /></div>
                  <Sk w="90%" h={13} /><div style={{ marginTop: 8 }}><Sk w="40%" h={20} /></div>
                </div>
              )) : ghError ? (
                <ErrState message={ghError === "rate_limit" ? "GitHub API limit reached. Data will refresh shortly." : "Failed to load repositories."} onRetry={() => setGhRetry(n => n + 1)} />
              ) : !ghData || ghData.items.length === 0 ? (
                <EmptyState message="No repositories found." />
              ) : ghData.items.map(repo => <GhCard key={repo.id} repo={repo} />)}
            </div>
          ) : (
            <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
              <GhHeader tab={isTablet} />
              {ghLoading ? Array.from({ length: 8 }).map((_, i) => <GhRowSk key={i} i={i} tab={isTablet} />) : ghError ? (
                <ErrState message={ghError === "rate_limit" ? "GitHub API limit reached. Data will refresh shortly." : "Failed to load repositories."} onRetry={() => setGhRetry(n => n + 1)} />
              ) : !ghData || ghData.items.length === 0 ? (
                <EmptyState message="No repositories found for this filter." />
              ) : ghData.items.map((repo, i, arr) => <GhRow key={repo.id} repo={repo} index={i} isLast={i === arr.length - 1} tab={isTablet} />)}
            </div>
          )}

          {!ghLoading && !ghError && ghData && ghData.items.length > 0 && (
            <p style={{ marginTop: 14, fontSize: 13, color: "var(--text-tertiary)", textAlign: "center" }}>
              {ghData.items.length} trending repos · sorted by stars
            </p>
          )}
        </>)}

        {/* ── npm Popular ─────────────────────────────────────────────────── */}
        {mainTab === "npm" && (<>
          <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: 10, alignItems: isMobile ? "stretch" : "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ display: "flex", gap: 10, flex: 1, flexWrap: "wrap" }}>
              <div style={{ position: "relative", flex: isMobile ? 1 : "0 0 220px" }}>
                <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)", pointerEvents: "none", display: "flex" }}>{IcoSearch}</span>
                <input type="text" placeholder="Search packages..." value={npmSearch} onChange={e => setNpmSearch(e.target.value)} style={SEARCH_STYLE} />
              </div>
              <select value={npmSort} onChange={e => setNpmSort(e.target.value as "downloads" | "name")} style={{ ...SELECT_STYLE, width: isMobile ? "100%" : "auto" }}>
                <option value="downloads">Most downloaded</option>
                <option value="name">Name A-Z</option>
              </select>
            </div>
            {npmStats && !npmLoading && (
              <p style={{ fontSize: 13, color: "var(--text-tertiary)", whiteSpace: "nowrap" }}>{npmStats.count} packages</p>
            )}
          </div>

          {isMobile ? (
            <div>
              {npmLoading ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 10, padding: 16, marginBottom: 8, opacity: 1 - i * 0.1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}><Sk w="50%" h={16} /><Sk w={50} h={13} /></div>
                  <Sk w="85%" h={13} />
                </div>
              )) : npmError ? (
                <ErrState message="npm data temporarily unavailable." onRetry={() => setNpmRetry(n => n + 1)} />
              ) : filteredNpm.length === 0 ? (
                <EmptyState message={npmDebounced ? `No packages found for "${npmDebounced}"` : "No data yet."} />
              ) : filteredNpm.map(pkg => <NpmCard key={pkg.name} pkg={pkg} />)}
            </div>
          ) : (
            <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
              <NpmHeader tab={isTablet} />
              {npmLoading ? Array.from({ length: 8 }).map((_, i) => <NpmRowSk key={i} i={i} tab={isTablet} />) : npmError ? (
                <ErrState message="npm data temporarily unavailable." onRetry={() => setNpmRetry(n => n + 1)} />
              ) : filteredNpm.length === 0 ? (
                <EmptyState message={npmDebounced ? `No packages found for "${npmDebounced}"` : "No data yet."} />
              ) : filteredNpm.map((pkg, i) => <NpmRow key={pkg.name} pkg={pkg} index={i} isLast={i === filteredNpm.length - 1} tab={isTablet} />)}
            </div>
          )}

          {!npmLoading && !npmError && filteredNpm.length > 0 && (
            <p style={{ marginTop: 14, fontSize: 13, color: "var(--text-tertiary)", textAlign: "center" }}>
              {npmDebounced ? `${filteredNpm.length} result${filteredNpm.length !== 1 ? "s" : ""}` : `${filteredNpm.length} packages · weekly downloads from npm registry`}
            </p>
          )}
        </>)}

        {/* ── OpenClaw Skills ─────────────────────────────────────────────── */}
        {mainTab === "clawhub" && (<>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 16, maxWidth: 560 }}>
            <a href="https://clawhub.ai" target="_blank" rel="noopener noreferrer" style={{ color: "var(--text-primary)", fontWeight: 600, textDecoration: "none" }}>OpenClaw</a>
            {" "}is an open marketplace for Claude AI skills — small, composable tools that extend Claude&apos;s capabilities. Each skill can be scanned for security risks via our Code Scan engine.
          </p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border)", gap: 16, flexWrap: isMobile ? "wrap" : "nowrap" }}>
            <div style={{ display: "flex", overflowX: "auto", WebkitOverflowScrolling: "touch" as React.CSSProperties["WebkitOverflowScrolling"] }}>
              {CLAW_SUBTABS.map(st => {
                const active = !clawDebounced.trim() && clawSub === st.id;
                return (
                  <button key={st.id} onClick={() => { setClawSub(st.id); setClawSearch(""); }} style={{ padding: isMobile ? "8px 12px" : "10px 16px", fontSize: isMobile ? 13 : 14, fontWeight: active ? 600 : 400, color: active ? "var(--accent)" : "var(--text-secondary)", background: "none", border: "none", borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent", cursor: "pointer", fontFamily: "inherit", marginBottom: -1, whiteSpace: "nowrap", transition: "color 0.12s" }}>
                    {st.label}
                  </button>
                );
              })}
            </div>
            <div style={{ position: "relative", flexShrink: 0, width: isMobile ? "100%" : "auto" }}>
              <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)", pointerEvents: "none", display: "flex" }}>{IcoSearch}</span>
              <input type="text" placeholder="Search skills..." value={clawSearch} onChange={e => setClawSearch(e.target.value)}
                style={{ ...SEARCH_STYLE, width: isMobile ? "100%" : 200 }}
                onFocus={e => { (e.currentTarget as HTMLInputElement).style.borderColor = "var(--accent)"; }}
                onBlur={e  => { (e.currentTarget as HTMLInputElement).style.borderColor = "var(--border)"; }}
              />
            </div>
          </div>

          {isMobile ? (
            <div style={{ marginTop: 16 }}>
              {clawLoading ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 10, padding: 16, marginBottom: 8, opacity: 1 - i * 0.1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}><Sk w="60%" h={16} /><Sk w={50} h={13} /></div>
                  <Sk w="90%" h={13} />
                </div>
              )) : clawError ? (
                <ErrState message="OpenClaw data temporarily unavailable. Try GitHub Trending or npm Popular." onRetry={() => setClawRetry(n => n + 1)} />
              ) : clawSkills.length === 0 ? (
                <EmptyState message={clawDebounced ? `No skills found for "${clawDebounced}"` : "No skills found."} />
              ) : clawSkills.map(skill => <ClCard key={skill.slug} skill={skill} />)}
            </div>
          ) : (
            <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderTop: "none", borderRadius: "0 0 10px 10px", overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
              <ClHeader tab={isTablet} />
              {clawLoading ? Array.from({ length: 8 }).map((_, i) => <ClRowSk key={i} i={i} tab={isTablet} />) : clawError ? (
                <ErrState message="OpenClaw data temporarily unavailable. Try GitHub Trending or npm Popular." onRetry={() => setClawRetry(n => n + 1)} />
              ) : clawSkills.length === 0 ? (
                <EmptyState message={clawDebounced ? `No skills found for "${clawDebounced}"` : "No skills found."} />
              ) : clawSkills.map((skill, i) => <ClRow key={skill.slug} skill={skill} index={i} isLast={i === clawSkills.length - 1} tab={isTablet} />)}
            </div>
          )}

          {!clawLoading && !clawError && clawSkills.length > 0 && (
            <p style={{ marginTop: 14, fontSize: 13, color: "var(--text-tertiary)", textAlign: "center" }}>
              {clawDebounced ? `${clawSkills.length} result${clawSkills.length !== 1 ? "s" : ""} for "${clawDebounced}"` : `${clawSkills.length} skills · Live data from clawhub.ai`}
            </p>
          )}
        </>)}

      </div>
    </main>
  );
}
