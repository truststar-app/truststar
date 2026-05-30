"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";
import { ReanalyzeButton } from "@/components/ReanalyzeButton";
import ShareCard from "@/components/ShareCard";
import type { TrustScore, TrustLabel } from "@/lib/types";

// ─── Loading overlay ──────────────────────────────────────────────────────────

const STEPS = [
  "Collecting GitHub stargazers…",
  "Analyzing user profiles…",
  "Computing temporal signals…",
  "Evaluating project health…",
  "Aggregating Trust Score…",
];

function LoadingOverlay() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % STEPS.length), 1800);
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
          {STEPS[step]}
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

// ─── Error state ──────────────────────────────────────────────────────────────

function ErrorState({ owner, repo, message }: { owner: string; repo: string; message: string }) {
  return (
    <main
      style={{
        minHeight: "calc(100vh - var(--header-h))",
        background: "var(--bg-base)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 24px",
        textAlign: "center",
        gap: 16,
      }}
    >
      <div
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: "var(--dangerous)",
          background: "var(--dangerous-bg)",
          border: "1px solid #FECACA",
          borderRadius: "var(--radius-lg)",
          padding: "14px 20px",
          maxWidth: 400,
        }}
      >
        {message}
      </div>
      <p style={{ fontSize: 13, color: "var(--text-tertiary)" }}>
        {owner}/{repo}
      </p>
      <Link
        href="/"
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: "#fff",
          background: "var(--accent)",
          padding: "8px 20px",
          borderRadius: "var(--radius)",
          textDecoration: "none",
        }}
      >
        ← Try another repo
      </Link>
    </main>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ReportClientPage({ owner, repo }: { owner: string; repo: string }) {
  const searchParams = useSearchParams();
  const [report, setReport] = useState<TrustScore | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const wa = searchParams.get("wa");
    const wt = searchParams.get("wt");
    const wh = searchParams.get("wh");
    const wu = searchParams.get("wu");
    const weights =
      wa || wt || wh || wu
        ? {
            accounts:     wa ? Number(wa) / 100 : undefined,
            temporal:     wt ? Number(wt) / 100 : undefined,
            health:       wh ? Number(wh) / 100 : undefined,
            authenticity: wu ? Number(wu) / 100 : undefined,
          }
        : undefined;

    fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ owner, repo, weights }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = (await res.json()) as { error?: string };
          throw new Error(data.error ?? "Analysis failed");
        }
        return res.json() as Promise<TrustScore>;
      })
      .then(setReport)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Analysis failed"));
  }, [owner, repo, searchParams]);

  if (error) return <ErrorState owner={owner} repo={repo} message={error} />;
  if (!report) return <LoadingOverlay />;

  const cfg = getLabelConfig(report.label);

  const wa = searchParams.get("wa");
  const wt = searchParams.get("wt");
  const wh = searchParams.get("wh");
  const wu = searchParams.get("wu");
  const hasCustomWeights = !!(wa || wt || wh || wu);

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
          <Link href="/" className="link-accent" style={{ color: "var(--text-tertiary)", textDecoration: "none" }}>
            Home
          </Link>
          <span>/</span>
          <span>Trust Score</span>
          <span>/</span>
          <span style={{ fontFamily: "var(--font-ibm-mono), monospace", color: "var(--text-secondary)" }}>
            {owner}/{repo}
          </span>
          <ReanalyzeButton owner={owner} repo={repo} />
        </div>

        {/* Custom weights banner */}
        {hasCustomWeights && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "#EFF6FF",
              border: "1px solid #BFDBFE",
              borderRadius: "var(--radius-lg)",
              padding: "10px 16px",
              marginBottom: 16,
              fontSize: 12,
              color: "#1D4ED8",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>
            <span>
              Custom scoring weights active: Account Quality {wa ?? "26"}% · Temporal {wt ?? "23"}% · Project Health {wh ?? "26"}% · Authenticity {wu ?? "25"}%
            </span>
            <Link href={`/report/${owner}/${repo}`} style={{ marginLeft: "auto", color: "#1D4ED8", fontSize: 11, textDecoration: "underline", textUnderlineOffset: 2, flexShrink: 0 }}>
              Reset to standard
            </Link>
          </div>
        )}

        {/* Score hero */}
        <div
          className="rpt-score-hero"
          style={{
            background: cfg.bgCard,
            border: `1px solid ${cfg.borderCard}`,
            borderRadius: "var(--radius-xl)",
            padding: "28px 32px",
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 28,
          }}
        >
          <div
            style={{
              flexShrink: 0,
              width: 100,
              height: 100,
              borderRadius: "50%",
              border: `3px solid ${cfg.color}`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 0 0 6px ${cfg.ring}`,
              background: "var(--bg-surface)",
            }}
          >
            <span
              style={{
                fontSize: 30,
                fontWeight: 700,
                fontFamily: "var(--font-ibm-mono), monospace",
                color: cfg.color,
                lineHeight: 1,
              }}
            >
              {report.score}
            </span>
            <span style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 2 }}>/100</span>
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.5px", color: cfg.color }}>
                {cfg.displayLabel ?? report.label}
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
                {report.label === "NEW" ? "NEW" : `Trust Score ${report.score}`}
              </span>
            </div>

            <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6, maxWidth: 520 }}>
              {cfg.description}
            </p>

            {report.labelOverrideReason && (
              <div
                style={{
                  marginTop: 8,
                  padding: "7px 12px",
                  background: cfg.bgCard,
                  border: `1px solid ${cfg.borderCard}`,
                  borderRadius: "var(--radius)",
                  fontSize: 12,
                  color: cfg.color,
                  lineHeight: 1.55,
                  fontWeight: 500,
                  maxWidth: 520,
                }}
              >
                {report.labelOverrideReason}
              </div>
            )}

            <div
              style={{
                marginTop: 12,
                padding: "10px 14px",
                background: "var(--bg-base)",
                borderLeft: "3px solid var(--border)",
                borderRadius: "0 var(--radius) var(--radius) 0",
                fontSize: 12,
                color: "var(--text-secondary)",
                lineHeight: 1.65,
              }}
            >
              This analysis is based on objective, reproducible criteria. All metrics are
              open source and auditable. Unexpected score?{" "}
              <Link href="/how-it-works" style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 500 }}>
                Check our methodology
              </Link>
              .
            </div>
          </div>
        </div>

        {/* NEW info card */}
        {report.label === "NEW" && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              padding: "14px 18px",
              marginBottom: 20,
              fontSize: 13,
              color: "var(--text-secondary)",
              lineHeight: 1.6,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            This project has fewer than 50 stars. Trust Score becomes more accurate as community activity grows.
          </div>
        )}

        {/* Dimensions */}
        <div
          className="rpt-dims-grid"
          style={{
            display: "grid",
            gridTemplateColumns: report.dimensions.authenticity !== undefined ? "repeat(4, 1fr)" : "repeat(3, 1fr)",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <DimensionCard label="Account Quality" score={report.dimensions.accounts} weight={wa ? `${wa}%` : "26%"} icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>} />
          <DimensionCard label="Temporal Behavior" score={report.dimensions.temporal} weight={wt ? `${wt}%` : "23%"} icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>} />
          <DimensionCard label="Project Health" score={report.dimensions.health} weight={wh ? `${wh}%` : "26%"} icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>} />
          {report.dimensions.authenticity !== undefined && (
            <DimensionCard label="Authenticity" score={report.dimensions.authenticity} weight={wu ? `${wu}%` : "25%"} icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>} />
          )}
        </div>

        {/* Signals */}
        <div className="rpt-2col-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
          <SignalsPanel
            title="Account Quality"
            signals={[
              { label: "Accounts created < 30d before starring", value: report.signals.newAccountsRatio, format: "percent", danger: report.signals.newAccountsRatio > 0.3 },
              { label: "Accounts with no public repo", value: report.signals.noRepoRatio, format: "percent", danger: report.signals.noRepoRatio > 0.4 },
              { label: "Accounts with no followers/following", value: report.signals.noFollowersRatio, format: "percent", danger: report.signals.noFollowersRatio > 0.4 },
              { label: "Accounts with no custom avatar", value: report.signals.noAvatarRatio, format: "percent", danger: report.signals.noAvatarRatio > 0.4 },
              { label: "Lockstep score (similar repos)", value: report.signals.lockstepScore, format: "percent", danger: report.signals.lockstepScore > 0.2 },
            ]}
          />
          <SignalsPanel
            title="Temporal Behavior"
            signals={[
              { label: "Maximum Z-score peak detected", value: report.signals.zScorePeak, format: "zscore", danger: report.signals.zScorePeak > 3 },
              { label: "Abnormal velocity score", value: report.signals.velocityScore, format: "percent", danger: report.signals.velocityScore > 0.5 },
              { label: "Concentrated stars (time window)", value: report.signals.recentStarsRatio, format: "percent", danger: report.signals.recentStarsRatio > 0.6 },
            ]}
          />
          <SignalsPanel
            title="Project Health"
            signals={[
              { label: "Fork / star ratio", value: report.signals.forkStarRatio, format: "percent", danger: report.signals.forkStarRatio < 0.05 },
              { label: "Active contributors (13 wk.)", value: report.signals.activeContributorsRatio, format: "percent", danger: report.signals.activeContributorsRatio < 0.2 },
              { label: "Commits per week (13 wk.)", value: report.signals.commitFrequency, format: "commits", danger: report.signals.commitFrequency < 1 },
              { label: "Issue resolution rate", value: report.signals.issueResolutionRatio, format: "percent", danger: report.signals.issueResolutionRatio < 0.5 },
            ]}
          />
          {report.signals.lowActivityRatio !== undefined && (
            <SignalsPanel
              title="Authenticity"
              signals={[
                { label: "Low-activity accounts ratio", value: report.signals.lowActivityRatio, format: "percent", danger: report.signals.lowActivityRatio > 0.3 },
                { label: "Coordinated lockstep score", value: report.signals.coordLockstepScore ?? 0, format: "percent", danger: (report.signals.coordLockstepScore ?? 0) > 0.15 },
                { label: "Burst months dominated by low-activity", value: report.signals.burstLowActivityRatio ?? 0, format: "percent", danger: (report.signals.burstLowActivityRatio ?? 0) > 0.4 },
              ]}
            />
          )}

          {/* Meta */}
          <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: 24 }}>
            <h3 style={{ fontWeight: 600, fontSize: 13, color: "var(--text-primary)", marginBottom: 16 }}>
              Analysis Metadata
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <MetaRow label="Analyzed repo" value={`${report.owner}/${report.repo}`} />
              <MetaRow label="Stargazers analyzed" value={`${report.sampleSize}`} />
              <MetaRow label="Analyzed on" value={new Date(report.analyzedAt).toLocaleString("en-US")} />
              <MetaRow label="Score" value={`${report.score}/100 — ${report.label}`} />
              {report.samplingMethod === "stratified" && report.burstMonthDetected ? (
                <MetaRow label="Sampling" value={`Stratified — burst ${report.burstMonthDetected} (${report.burstGroupSize} burst / ${report.baselineGroupSize} baseline)`} />
              ) : (
                <MetaRow label="Sampling" value="Default (distributed)" />
              )}
            </div>
            <div
              style={{
                marginTop: 16,
                borderTop: "1px solid var(--border-subtle)",
                paddingTop: 10,
                borderLeft: "3px solid var(--border)",
                paddingLeft: 10,
                fontSize: 11,
                color: "var(--text-secondary)",
                lineHeight: 1.65,
              }}
            >
              TrustStar is free and open source. Please use responsibly to keep the service available for everyone.
            </div>
          </div>
        </div>

        {/* Badge */}
        <ShareCard
          url={`https://truststar.co/report/${owner}/${repo}`}
          filename={`${owner}-${repo}`}
          analyzedAt={report.analyzedAt}
          score={report.score}
          label={report.label}
          badge={{ owner, repo }}
        />

        {/* Go Further */}
        <div style={{ marginTop: 24, background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4, letterSpacing: "-0.2px" }}>
            Want to go deeper?
          </h3>
          <p style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 16 }}>
            Complement this Trust Score with a code analysis or npm check.
          </p>
          <div className="go-further-grid">
            <div style={{ background: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: 8, padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Scan this repo&apos;s code</span>
              </div>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 14 }}>
                Analyze source code for dangerous patterns — network calls, file access, obfuscation, and supply chain risks.
              </p>
              <Link href={`/skill/${owner}/${repo}`} style={{ display: "inline-flex", alignItems: "center", fontSize: 12, fontWeight: 500, padding: "7px 14px", borderRadius: "var(--radius)", background: "var(--accent)", color: "#fff", textDecoration: "none" }}>
                Run Code Scan →
              </Link>
            </div>
            <div style={{ background: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: 8, padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Check npm package</span>
              </div>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 14 }}>
                Cross-reference downloads, stars, and maintainer signals for the npm package.
              </p>
              <Link href={`/npm/${repo}`} className="btn-outline" style={{ display: "inline-flex", alignItems: "center", fontSize: 12, fontWeight: 500, padding: "7px 14px", borderRadius: "var(--radius)", background: "none", color: "var(--text-secondary)", textDecoration: "none", border: "1px solid var(--border)" }}>
                Run npm Check →
              </Link>
            </div>
          </div>
        </div>

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

// ─── Label config ─────────────────────────────────────────────────────────────

type LabelConfig = {
  color: string;
  bgCard: string;
  borderCard: string;
  ring: string;
  description: string;
  displayLabel?: string;
};

function getLabelConfig(label: TrustLabel): LabelConfig {
  const configs: Record<TrustLabel, LabelConfig> = {
    SAFE: {
      color: "var(--safe)",
      bgCard: "var(--safe-bg)",
      borderCard: "#BBF7D0",
      ring: "rgba(22,163,74,0.08)",
      description: "This repo shows healthy signals. Popularity appears organic and health metrics are solid.",
    },
    CAUTION: {
      color: "var(--caution)",
      bgCard: "var(--caution-bg)",
      borderCard: "#FEF08A",
      ring: "rgba(202,138,4,0.08)",
      description: "Mixed signals detected. Some stargazer authenticity indicators warrant attention before depending on this project.",
    },
    SUSPICIOUS: {
      color: "var(--suspicious)",
      bgCard: "var(--suspicious-bg)",
      borderCard: "#FDE68A",
      ring: "rgba(217,119,6,0.08)",
      description: "Significant anomalies detected. Multiple stargazer metrics suggest artificial popularity inflation. Investigate further before depending on this project.",
    },
    DANGEROUS: {
      color: "var(--dangerous)",
      bgCard: "var(--dangerous-bg)",
      borderCard: "#FECACA",
      ring: "rgba(220,38,38,0.08)",
      description: "Critical anomalies detected. Stargazer patterns are consistent with known fake star campaigns. Exercise extreme caution.",
    },
    NEW: {
      color: "var(--text-secondary)",
      bgCard: "var(--bg-hover)",
      borderCard: "var(--border)",
      ring: "rgba(107,107,118,0.08)",
      description: "This repository is too new or has too few stars for a reliable trust analysis. The score is based on limited data.",
      displayLabel: "NEW REPOSITORY",
    },
  };
  return configs[label];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DimensionCard({ label, score, weight, icon }: { label: string; score: number; weight: string; icon: ReactNode }) {
  const color = score >= 70 ? "var(--safe)" : score >= 40 ? "var(--suspicious)" : "var(--dangerous)";
  const barColor = score >= 70 ? "#16A34A" : score >= 40 ? "#D97706" : "#DC2626";

  return (
    <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span>{icon}</span>
          <span style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 500 }}>{label}</span>
        </div>
        <span style={{ fontSize: 11, fontFamily: "var(--font-ibm-mono), monospace", color: "var(--text-tertiary)" }}>{weight}</span>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 6, marginBottom: 10 }}>
        <span style={{ fontSize: 32, fontWeight: 700, fontFamily: "var(--font-ibm-mono), monospace", color, lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 4, fontFamily: "var(--font-ibm-mono), monospace" }}>/100</span>
      </div>
      <div style={{ height: 4, background: "var(--bg-hover)", borderRadius: 999, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${score}%`, background: barColor, borderRadius: 999, transition: "width 0.6s ease" }} />
      </div>
    </div>
  );
}

type SignalRow = { label: string; value: number; format: "percent" | "zscore" | "commits"; danger: boolean };

function SignalsPanel({ title, signals }: { title: string; signals: SignalRow[] }) {
  return (
    <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: 24 }}>
      <h3 style={{ fontWeight: 600, fontSize: 13, color: "var(--text-primary)", marginBottom: 16 }}>{title}</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {signals.map((s) => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
            <span style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5, flex: 1 }}>{s.label}</span>
            <span
              style={{
                fontSize: 12,
                fontFamily: "var(--font-ibm-mono), monospace",
                fontWeight: 600,
                padding: "2px 8px",
                borderRadius: "var(--radius)",
                flexShrink: 0,
                background: s.danger ? "var(--dangerous-bg)" : "var(--safe-bg)",
                color: s.danger ? "var(--dangerous)" : "var(--safe)",
                border: `1px solid ${s.danger ? "#FECACA" : "#BBF7D0"}`,
              }}
            >
              {formatValue(s.value, s.format)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
      <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{label}</span>
      <span style={{ fontSize: 12, fontFamily: "var(--font-ibm-mono), monospace", color: "var(--text-secondary)", textAlign: "right" }}>{value}</span>
    </div>
  );
}

function formatValue(value: number, format: SignalRow["format"]): string {
  switch (format) {
    case "percent": return `${Math.round(value * 100)}%`;
    case "zscore":  return value.toFixed(2);
    case "commits": return `${value.toFixed(1)}/wk.`;
  }
}
