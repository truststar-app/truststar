#!/usr/bin/env npx tsx
/**
 * audit-ai-repos.ts — TrustStar Investigation
 * Identifies AI GitHub repos with artificially inflated stars.
 *
 * Implements all 4 TrustStar scoring dimensions natively (no internal API).
 * Methodology: He et al. ICSE 2026 — Six Million (Suspected) Fake Stars on GitHub
 *
 * Usage: npx tsx scripts/audit-ai-repos.ts
 * Output: scripts/audit-results.json
 */

import * as fs from "fs";
import * as path from "path";

// ─── Config ────────────────────────────────────────────────────────────────────

const GITHUB_TOKEN = (() => {
  try {
    const env = fs.readFileSync(path.join(__dirname, "../.env.local"), "utf-8");
    const match = env.match(/GITHUB_TOKEN=([^\n\r]+)/);
    return match?.[1]?.trim() ?? process.env.GITHUB_TOKEN ?? "";
  } catch {
    return process.env.GITHUB_TOKEN ?? "";
  }
})();

if (!GITHUB_TOKEN) {
  console.error("GITHUB_TOKEN not found in .env.local or environment");
  process.exit(1);
}

const API_BASE = "https://api.github.com";
const OUT_FILE = path.join(__dirname, "audit-results.json");
const PARTIAL_FILE = path.join(__dirname, ".audit-partial.json");

// ─── Rate limit state ──────────────────────────────────────────────────────────

let rlRemaining = 5000;
let rlReset = Math.floor(Date.now() / 1000) + 3600;

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

// ─── GitHub API client (rate-limit-aware) ──────────────────────────────────────

async function ghFetch<T>(
  endpoint: string,
  opts: { star?: boolean; retries?: number } = {}
): Promise<T | null> {
  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE}${endpoint}`;
  const retries = opts.retries ?? 3;

  if (rlRemaining < 20) {
    const wait = Math.max(0, rlReset * 1000 - Date.now()) + 12_000;
    process.stdout.write(`\n  ⏳ rate-limit (${rlRemaining} left) — sleeping ${Math.ceil(wait / 1000)}s\n`);
    await sleep(wait);
  }

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: opts.star
            ? "application/vnd.github.v3.star+json"
            : "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      });

      const rem = res.headers.get("X-RateLimit-Remaining");
      const rst = res.headers.get("X-RateLimit-Reset");
      const lim = res.headers.get("X-RateLimit-Limit");
      // Only update core rate-limit state (search API has limit=30; core has limit=5000).
      // Search responses would otherwise corrupt rlRemaining and trigger spurious sleeps.
      if (rem != null && lim !== "30") rlRemaining = parseInt(rem, 10);
      if (rst != null && lim !== "30") rlReset = parseInt(rst, 10);

      if (res.status === 202) {
        // GitHub stats API is computing — retry after a pause
        if (attempt < retries - 1) { await sleep(5000); continue; }
        return null;
      }
      if (res.status === 404) return null;
      if (res.status === 403 && rlRemaining === 0) {
        const wait = Math.max(0, rlReset * 1000 - Date.now()) + 12_000;
        process.stdout.write(`\n  ⏳ 403/rate-limit — sleeping ${Math.ceil(wait / 1000)}s\n`);
        await sleep(wait);
        continue;
      }
      if (!res.ok) {
        if (attempt < retries - 1) { await sleep(2000 * (attempt + 1)); continue; }
        return null;
      }
      return res.json() as Promise<T>;
    } catch {
      if (attempt < retries - 1) { await sleep(2000 * (attempt + 1)); continue; }
      return null;
    }
  }
  return null;
}

// ─── Types ─────────────────────────────────────────────────────────────────────

type RawRepo = {
  name: string;
  full_name: string;
  owner: { login: string };
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  created_at: string;
  pushed_at: string;
  description: string | null;
  language: string | null;
  topics?: string[];
  archived?: boolean;
};

type RawStargazer = {
  starred_at: string;
  user: { login: string; id: number };
};

type UserDetail = {
  login: string;
  id: number;
  created_at: string;
  public_repos: number;
  followers: number;
  following: number;
  starred_at: string;
};

type LockstepCluster = {
  size: number;
  window: string;
  shared_repos: string[];
};

export type AuditResult = {
  owner: string;
  repo: string;
  full_name: string;
  stars: number;
  forks: number;
  score: number;
  label: TrustLabel;
  dimensions: {
    accountQuality: number;
    temporalBehavior: number;
    projectHealth: number;
    authenticity: number;
  };
  signals: {
    newAccountsRatio: number;
    noRepoRatio: number;
    noFollowersRatio: number;
    ghostAccountsRatio: number;
    lockstepScore: number;
    zScorePeak: number;
    velocityAnomaly: number;
    concentration48h: number;
    forkStarRatio: number;
    commitsPerWeek: number;
    lowActivityRatio: number;
    coordLockstepScore: number;
    burstLowActivityRatio: number;
  };
  burst_months: string[];
  lockstep_clusters: LockstepCluster[];
  verification_notes: string;
  confidence: "HIGH" | "MEDIUM" | "LOW" | "UNVERIFIED";
  convergent_signals: number;
  sample_size: number;
  sampling_method: "stratified" | "default";
  analyzed_at: string;
};

// ─── SCORING ENGINE ────────────────────────────────────────────────────────────
// Faithful port of src/lib/scoring/ — all 4 TrustStar dimensions.

// Account Quality (weight 26.25%)
function scoreAccounts(users: UserDetail[]): {
  score: number;
  signals: Pick<AuditResult["signals"], "newAccountsRatio" | "noRepoRatio" | "noFollowersRatio" | "ghostAccountsRatio" | "lockstepScore">;
} {
  if (users.length < 10) {
    return { score: 50, signals: { newAccountsRatio: 0, noRepoRatio: 0, noFollowersRatio: 0, ghostAccountsRatio: 0, lockstepScore: 0 } };
  }

  const n = users.length;
  const newAccounts = users.filter((u) => {
    const diff = (new Date(u.starred_at).getTime() - new Date(u.created_at).getTime()) / 86_400_000;
    return diff < 30;
  }).length / n;

  const noRepo = users.filter((u) => u.public_repos === 0).length / n;
  const noFollowers = users.filter((u) => u.followers === 0 && u.following === 0).length / n;
  const ghost = users.filter((u) => u.public_repos === 0 && u.followers === 0 && u.following === 0).length / n;

  // lockstepScore added later via lockstep detection — start at 0
  const suspicion = 0.35 * newAccounts + 0.30 * noRepo + 0.20 * noFollowers;
  const score = Math.round(Math.max(0, Math.min(100, (1 - suspicion) * 100)));

  return { score, signals: { newAccountsRatio: newAccounts, noRepoRatio: noRepo, noFollowersRatio: noFollowers, ghostAccountsRatio: ghost, lockstepScore: 0 } };
}

// Temporal Behavior (weight 22.5%)
function scoreTemporal(
  users: UserDetail[],
  totalStars: number,
  createdAt: string
): {
  score: number;
  signals: Pick<AuditResult["signals"], "zScorePeak" | "velocityAnomaly" | "concentration48h">;
  burstMonths: string[];
} {
  if (users.length < 10) {
    return { score: 70, signals: { zScorePeak: 0, velocityAnomaly: 0, concentration48h: 0 }, burstMonths: [] };
  }

  // Daily curve
  const daily = new Map<string, number>();
  for (const u of users) {
    const day = u.starred_at.substring(0, 10);
    daily.set(day, (daily.get(day) ?? 0) + 1);
  }

  // Z-score peak
  const counts = Array.from(daily.values());
  const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
  const variance = counts.reduce((s, v) => s + (v - mean) ** 2, 0) / counts.length;
  const std = Math.sqrt(variance);
  const zScorePeak = std > 0 ? Math.max(0, ...counts.map((v) => (v - mean) / std)) : 0;

  // Velocity anomaly
  const ageInDays = (Date.now() - new Date(createdAt).getTime()) / 86_400_000;
  const avgPerDay = ageInDays > 0 ? totalStars / ageInDays : 0;
  const maxDay = Math.max(...counts);
  const velocityAnomaly = avgPerDay > 0 ? Math.min(1, maxDay / (avgPerDay * 10)) : 0;

  // 48h concentration (densest window)
  const ts = users.map((u) => new Date(u.starred_at).getTime()).sort((a, b) => a - b);
  const W48 = 48 * 3_600_000;
  let maxInWindow = 0;
  for (let i = 0; i < ts.length; i++) {
    let j = i;
    while (j < ts.length && ts[j] <= ts[i] + W48) j++;
    if (j - i > maxInWindow) maxInWindow = j - i;
  }
  const concentration48h = maxInWindow / users.length;

  // Concentration penalty (adaptive by repo size)
  const threshold =
    totalStars > 10_000 ? 0.20 :
    totalStars > 1_000  ? 0.30 :
    totalStars > 100    ? 0.50 :
    2; // <100 stars: never penalize
  const concPenalty = concentration48h <= threshold ? 0 : (concentration48h - threshold) / (1 - threshold);

  let score = 100;
  score -= velocityAnomaly * 40;
  score -= concPenalty * 35;
  score -= Math.min(zScorePeak / 10, 1) * 25;

  // Burst months (Z-score on monthly distribution)
  const monthly = new Map<string, number>();
  for (const u of users) {
    const m = u.starred_at.substring(0, 7);
    monthly.set(m, (monthly.get(m) ?? 0) + 1);
  }
  const mCounts = Array.from(monthly.values()).sort((a, b) => a - b);
  const monthlyMedian = mCounts.length >= 3 ? mCounts[Math.floor(mCounts.length / 2)] : 0;
  const burstMonths = monthlyMedian > 0
    ? Array.from(monthly.entries())
        .filter(([, c]) => c > monthlyMedian * 3)
        .sort(([, a], [, b]) => b - a)
        .map(([m]) => m)
    : [];

  return {
    score: Math.max(0, Math.round(score)),
    signals: { zScorePeak, velocityAnomaly, concentration48h },
    burstMonths,
  };
}

// Project Health (weight 26.25%)
function scoreHealth(
  repo: RawRepo,
  commitsPerWeek: number,
  activeContributors: number
): {
  score: number;
  signals: Pick<AuditResult["signals"], "forkStarRatio" | "commitsPerWeek">;
} {
  const { stargazers_count: stars, forks_count: forks, created_at } = repo;
  const forkStarRatio = stars > 0 ? forks / stars : 0;
  const ageInDays = (Date.now() - new Date(created_at).getTime()) / 86_400_000;

  const forkScore =
    forkStarRatio >= 0.2  ? 95 :
    forkStarRatio >= 0.1  ? 85 :
    forkStarRatio >= 0.05 ? 70 :
    forkStarRatio >= 0.03 ? 55 :
    stars > 50_000 ? 30 :
    stars > 10_000 ? 40 :
    stars > 1_000  ? 50 : 55;

  const commitScore =
    ageInDays < 30        ? 50 :
    commitsPerWeek >= 10  ? 100 :
    commitsPerWeek >= 3   ? 85 :
    commitsPerWeek >= 1   ? 70 :
    commitsPerWeek >= 0.5 ? 55 :
    commitsPerWeek >= 0.1 ? 35 : 25;

  const contribScore =
    activeContributors >= 10 ? 100 :
    activeContributors >= 5  ? 85 :
    activeContributors >= 2  ? 65 :
    activeContributors === 1 ? 40 : 15;

  const score = Math.round(
    forkScore * 0.25 + contribScore * 0.25 + commitScore * 0.30 + 60 * 0.20 // issue resolution: neutral 60 (no extra API call)
  );

  return { score, signals: { forkStarRatio, commitsPerWeek } };
}

// Authenticity (weight 25%)
function scoreAuthenticity(
  lowActivityRatio: number,
  coordLockstepScore: number,
  burstLowActivityRatio: number
): number {
  return Math.round(
    Math.max(0, Math.min(100,
      (1 - lowActivityRatio) * 40 +
      (1 - coordLockstepScore) * 35 +
      (1 - burstLowActivityRatio) * 25
    ))
  );
}

// Label resolution
type TrustLabel = "SAFE" | "CAUTION" | "SUSPICIOUS" | "DANGEROUS" | "NEW";

function resolveLabel(score: number, authScore: number, stars: number, createdAt: string): TrustLabel {
  const ageInDays = (Date.now() - new Date(createdAt).getTime()) / 86_400_000;
  if (stars < 50) return "NEW";
  if (stars < 200 && ageInDays < 90) return "NEW";
  if (score < 30) return "DANGEROUS";
  if (score < 50 && authScore < 50) return "SUSPICIOUS";
  if (score >= 70 && authScore >= 60) return "SAFE";
  return "CAUTION";
}

// Label overrides (can only escalate severity, never de-escalate)
function applyOverrides(
  label: TrustLabel,
  s: {
    noFollowersRatio: number; noRepoRatio: number; lowActivityRatio: number;
    burstLowActivityRatio: number; lockstepScore: number;
    forkStarRatio: number; stars: number; ghostAccountsRatio: number;
  }
): TrustLabel {
  if (label === "NEW") return label;
  const sev: Record<TrustLabel, number> = { NEW: -1, SAFE: 0, CAUTION: 1, SUSPICIOUS: 2, DANGEROUS: 3 };
  let cur: TrustLabel = label;
  const esc = (t: TrustLabel) => { if (sev[t] > sev[cur]) cur = t; };

  if (cur === "SAFE") {
    if (s.noFollowersRatio >= 0.35 || s.lowActivityRatio >= 0.25 || s.noRepoRatio >= 0.20)
      cur = "CAUTION";
  }

  const cautionHits = [
    s.noFollowersRatio > 0.40,
    s.lowActivityRatio > 0.30,
    s.noRepoRatio > 0.20,
    s.burstLowActivityRatio > 0.15,
    s.forkStarRatio < 0.03 && s.stars > 10_000,
  ].filter(Boolean).length;
  if (cautionHits >= 2) esc("CAUTION");

  const suspHits = [
    s.noFollowersRatio > 0.60,
    s.lowActivityRatio > 0.45,
    s.noRepoRatio > 0.35,
    s.lockstepScore > 0.30,
  ].filter(Boolean).length;
  if (suspHits >= 2) esc("SUSPICIOUS");

  const dangHits = [
    s.noFollowersRatio > 0.75,
    s.lowActivityRatio > 0.55,
    s.noRepoRatio > 0.40,
    s.ghostAccountsRatio > 0.30,
  ].filter(Boolean).length;
  if (dangHits >= 3) esc("DANGEROUS");

  return cur;
}

// ─── STARGAZER SAMPLING (stratified burst-aware) ───────────────────────────────

async function fetchStargazerPages(
  owner: string, repo: string, pages: number[]
): Promise<RawStargazer[]> {
  const all: RawStargazer[] = [];
  for (const page of pages) {
    const data = await ghFetch<RawStargazer[]>(
      `${API_BASE}/repos/${owner}/${repo}/stargazers?per_page=100&page=${page}`,
      { star: true }
    );
    if (!data || data.length === 0) break;
    all.push(...data);
    await sleep(150); // be gentle on stargazer endpoint
  }
  return all;
}

function scanPages(totalPages: number): number[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const mid = Math.ceil(totalPages / 2);
  const last5 = [totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages].filter((p) => p > mid);
  return Array.from(new Set([1, mid, ...last5])).sort((a, b) => a - b);
}

function distributedPages(totalPages: number): number[] {
  if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
  return Array.from(new Set([
    1,
    Math.max(2, Math.floor(totalPages * 0.25)),
    Math.max(3, Math.floor(totalPages * 0.5)),
    Math.max(4, Math.floor(totalPages * 0.75)),
    totalPages,
  ]));
}

async function fetchSampledStargazers(
  owner: string, repo: string, totalStars: number
): Promise<{ users: { login: string; starred_at: string }[]; burstMonth: string | null; method: "stratified" | "default" }> {
  if (totalStars === 0) return { users: [], burstMonth: null, method: "default" };

  const totalPages = Math.ceil(totalStars / 100);

  if (totalStars < 5_000) {
    const pages = distributedPages(totalPages);
    const raw = await fetchStargazerPages(owner, repo, pages);
    return { users: raw.map((r) => ({ login: r.user.login, starred_at: r.starred_at })), burstMonth: null, method: "default" };
  }

  // Pass 1: scan for burst month
  const sp = scanPages(totalPages);
  const scanRaw = await fetchStargazerPages(owner, repo, sp);
  if (scanRaw.length === 0) return { users: [], burstMonth: null, method: "default" };

  // Detect burst month
  const monthly = new Map<string, number>();
  for (const s of scanRaw) {
    const m = s.starred_at.substring(0, 7);
    monthly.set(m, (monthly.get(m) ?? 0) + 1);
  }
  const mVals = Array.from(monthly.values()).sort((a, b) => a - b);
  const median = mVals.length >= 3 ? mVals[Math.floor(mVals.length / 2)] : 0;
  let burstMonth: string | null = null;
  if (median > 0) {
    let peak = 0, pm = "";
    Array.from(monthly.entries()).forEach(([m, c]) => { if (c > peak) { peak = c; pm = m; } });
    if (peak > median * 3) burstMonth = pm;
  }

  if (!burstMonth) {
    // Recency-biased sample: most recent 100 + 50 historical
    const desc = [...scanRaw].sort((a, b) => b.starred_at.localeCompare(a.starred_at));
    const recent = desc.slice(0, 100);
    const historical = desc.slice(100).filter((_, i) => i % Math.max(1, Math.floor((desc.length - 100) / 50)) === 0).slice(0, 50);
    return {
      users: [...recent, ...historical].map((r) => ({ login: r.user.login, starred_at: r.starred_at })),
      burstMonth: null,
      method: "default",
    };
  }

  // Pass 2: fetch pages around the burst month
  const sorted = [...scanRaw].sort((a, b) => a.starred_at.localeCompare(b.starred_at));
  const fraction = sorted.filter((s) => s.starred_at < `${burstMonth}-01`).length / sorted.length;
  const burstStart = Math.max(1, Math.floor(fraction * totalPages));
  const burstPages = [burstStart, burstStart + 1, burstStart + 2, burstStart + 3]
    .filter((p) => p > 0 && p <= totalPages && !sp.includes(p));

  let pass2: RawStargazer[] = [];
  if (burstPages.length > 0) pass2 = await fetchStargazerPages(owner, repo, burstPages);

  const allBurst = [...scanRaw, ...pass2].filter((s) => s.starred_at.startsWith(burstMonth!));
  const baseline = scanRaw.filter((s) => !s.starred_at.startsWith(burstMonth!));

  const burstSample = allBurst.slice(0, 100);
  const step = Math.max(1, Math.floor(baseline.length / 50));
  const baselineSample = baseline.filter((_, i) => i % step === 0).slice(0, 50);

  return {
    users: [...burstSample, ...baselineSample].map((r) => ({ login: r.user.login, starred_at: r.starred_at })),
    burstMonth,
    method: "stratified",
  };
}

// ─── USER DETAILS ──────────────────────────────────────────────────────────────

async function fetchUserDetails(refs: { login: string; starred_at: string }[]): Promise<UserDetail[]> {
  const BATCH = 8;
  const results: UserDetail[] = [];

  for (let i = 0; i < refs.length; i += BATCH) {
    const batch = refs.slice(i, i + BATCH);
    const details = await Promise.all(
      batch.map(async (u) => {
        const d = await ghFetch<{
          login: string; id: number; created_at: string;
          public_repos: number; followers: number; following: number;
        }>(`/users/${u.login}`);
        if (!d) return null;
        return { ...d, starred_at: u.starred_at } as UserDetail;
      })
    );
    results.push(...details.filter((d): d is UserDetail => d !== null));
    await sleep(100);
  }

  return results;
}

// ─── COMMIT & CONTRIBUTOR STATS ────────────────────────────────────────────────

async function fetchCommitStats(owner: string, repo: string, retries = 3): Promise<{
  commitsPerWeek: number;
  activeContributors: number;
}> {
  for (let attempt = 0; attempt < retries; attempt++) {
    const activity = await ghFetch<{ total: number }[]>(`/repos/${owner}/${repo}/stats/commit_activity`);
    if (activity && Array.isArray(activity) && activity.length > 0) {
      const last13 = activity.slice(-13);
      const commitsPerWeek = last13.reduce((s, w) => s + w.total, 0) / 13;

      const contribs = await ghFetch<{
        author: { login: string };
        weeks: { w: number; c: number }[];
      }[]>(`/repos/${owner}/${repo}/stats/contributors`);

      let activeContributors = 0;
      if (contribs && Array.isArray(contribs)) {
        const cutoff = Date.now() / 1000 - 13 * 7 * 86400;
        activeContributors = contribs.filter((c) => c.weeks?.some((w) => w.w >= cutoff && w.c > 0)).length;
      }

      return { commitsPerWeek, activeContributors };
    }
    // 202 or empty — wait for GitHub to compute
    if (attempt < retries - 1) await sleep(6000);
  }
  return { commitsPerWeek: 0, activeContributors: 0 };
}

// ─── LOCKSTEP CLUSTER DETECTION ────────────────────────────────────────────────
// Adapted from computeCoordLockstepScore in src/lib/scoring/authenticity.ts.
// Fetches starred repos for up to 25 users (burst-period first) and detects
// clusters that starred the same obscure repos within a 14-day window.

async function detectLockstepClusters(
  users: UserDetail[],
  targetOwner: string,
  targetRepo: string
): Promise<{ score: number; clusters: LockstepCluster[] }> {
  const sample = users.slice(0, 25); // burst-period users are first (stratified sampling)
  const BATCH = 5;

  // Fetch starred repos for each sampled user
  const starredMap = new Map<string, string[]>();
  for (let i = 0; i < sample.length; i += BATCH) {
    await Promise.all(
      sample.slice(i, i + BATCH).map(async (u) => {
        const repos = await ghFetch<{ full_name: string }[]>(`/users/${u.login}/starred?per_page=100`);
        if (repos && Array.isArray(repos)) {
          starredMap.set(
            u.login,
            repos.map((r) => r.full_name).filter((r) => r !== `${targetOwner}/${targetRepo}`)
          );
        }
      })
    );
    await sleep(300);
  }

  // Filter out popular repos (≥5000 stars) to avoid false positives from
  // legitimate projects (react, tensorflow, etc.) triggering overlap.
  const repoCounts = new Map<string, number>();
  Array.from(starredMap.values()).forEach((repos) => {
    repos.forEach((r) => repoCounts.set(r, (repoCounts.get(r) ?? 0) + 1));
  });

  // Fetch star counts for repos appearing in ≥2 users' lists (top 30 candidates)
  const candidates = Array.from(repoCounts.entries())
    .filter(([, n]) => n >= 2)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 30)
    .map(([r]) => r);

  const popularRepos = new Set<string>();
  for (let i = 0; i < candidates.length; i += 5) {
    await Promise.all(
      candidates.slice(i, i + 5).map(async (fullName) => {
        const info = await ghFetch<{ stargazers_count: number }>(`/repos/${fullName}`);
        if (info && info.stargazers_count >= 5_000) popularRepos.add(fullName);
      })
    );
    await sleep(200);
  }

  const obscureMap = new Map<string, string[]>();
  Array.from(starredMap.entries()).forEach(([login, repos]) => {
    obscureMap.set(login, repos.filter((r) => !popularRepos.has(r)));
  });

  // Coordinated lockstep: ≥3 shared obscure repos within a 14-day starring window
  const WINDOW_MS = 14 * 24 * 3_600_000;
  const MIN_SHARED = 3;
  const MIN_CLUSTER = 4;

  const entries = Array.from(obscureMap.entries());
  const inCluster = new Set<string>();
  const pairShared = new Map<string, string[]>(); // loginA+loginB → shared repos

  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const [loginA, reposA] = entries[i];
      const [loginB, reposB] = entries[j];
      if (reposA.length === 0 || reposB.length === 0) continue;

      const uA = sample.find((u) => u.login === loginA);
      const uB = sample.find((u) => u.login === loginB);
      if (uA && uB) {
        const dt = Math.abs(new Date(uA.starred_at).getTime() - new Date(uB.starred_at).getTime());
        if (dt > WINDOW_MS) continue;
      }

      const setA = new Set(reposA);
      const shared = reposB.filter((r) => setA.has(r));
      if (shared.length >= MIN_SHARED) {
        inCluster.add(loginA);
        inCluster.add(loginB);
        pairShared.set(`${loginA}|||${loginB}`, shared);
      }
    }
  }

  const coordScore = inCluster.size >= MIN_CLUSTER && obscureMap.size > 0
    ? inCluster.size / obscureMap.size
    : 0;

  if (inCluster.size < MIN_CLUSTER) return { score: 0, clusters: [] };

  // Build cluster report
  const topSharedCounts = new Map<string, number>();
  Array.from(pairShared.values()).forEach((shared) => {
    shared.forEach((r) => topSharedCounts.set(r, (topSharedCounts.get(r) ?? 0) + 1));
  });

  const topRepos = Array.from(topSharedCounts.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([r]) => r);

  const clusterTimes = sample
    .filter((u) => inCluster.has(u.login))
    .map((u) => u.starred_at.substring(0, 10))
    .sort();

  const cluster: LockstepCluster = {
    size: inCluster.size,
    window: clusterTimes.length >= 2 ? `${clusterTimes[0]} → ${clusterTimes[clusterTimes.length - 1]}` : clusterTimes[0] ?? "",
    shared_repos: topRepos,
  };

  return { score: coordScore, clusters: [cluster] };
}

// ─── CONVERGENT SIGNAL COUNTER ─────────────────────────────────────────────────
// Counts independent signals that all point to fake stars.
// Requires ≥3 for SUSPICIOUS, ≥4 for DANGEROUS — zero false positive policy.

function countConvergentSignals(s: AuditResult["signals"]): number {
  let n = 0;
  if (s.newAccountsRatio > 0.20) n++;
  if (s.noRepoRatio > 0.30) n++;
  if (s.noFollowersRatio > 0.40) n++;
  if (s.ghostAccountsRatio > 0.15) n++;
  if (s.zScorePeak > 5) n++;
  if (s.velocityAnomaly > 0.50) n++;
  if (s.concentration48h > 0.40) n++;
  if (s.coordLockstepScore > 0.20) n++;
  if (s.burstLowActivityRatio > 0.30) n++;
  if (s.lowActivityRatio > 0.30) n++;
  return n;
}

// ─── PHASE 1: REPO DISCOVERY ───────────────────────────────────────────────────

async function discoverAIRepos(): Promise<RawRepo[]> {
  const queries = [
    "topic:llm stars:>1000",
    "topic:llm-inference stars:>500",
    "topic:llm-agent stars:>300",
    "topic:chatgpt stars:>500",
    "topic:ai-agent stars:>300",
    "topic:rag stars:>300",
    "topic:stable-diffusion stars:>500",
    "topic:text-to-image stars:>500",
    "topic:langchain stars:>300",
    "topic:ollama stars:>300",
    "topic:openai stars:>1000",
    "topic:huggingface stars:>500",
    "topic:fine-tuning stars:>300",
    "topic:ai-tools stars:>300",
    "topic:generative-ai stars:>300",
    "topic:computer-vision stars:>2000",
    "topic:natural-language-processing stars:>2000",
    "topic:machine-learning stars:>3000",
    "topic:deep-learning stars:>2000",
    "topic:neural-network stars:>1000",
  ];

  const seen = new Set<string>();
  const repos: RawRepo[] = [];

  console.log(`  Searching ${queries.length} AI topic queries...`);

  for (const q of queries) {
    for (const page of [1, 2]) {
      const data = await ghFetch<{ items: RawRepo[]; total_count: number }>(
        `/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=30&page=${page}`
      );
      if (!data?.items) break;
      for (const r of data.items) {
        if (!seen.has(r.full_name) && !r.archived) {
          seen.add(r.full_name);
          repos.push(r);
        }
      }
      // GitHub search: 30 req/min authenticated — respect secondary limit
      await sleep(2200);
    }
    process.stdout.write(".");
  }

  console.log(`\n  Discovered ${repos.length} unique non-archived AI repos`);
  return repos;
}

// Quick suspicion heuristic — runs before expensive API calls.
// High score = likely suspect; used to prioritize the audit queue.
function quickSuspicionScore(r: RawRepo): number {
  const stars = r.stargazers_count;
  const forks = r.forks_count;
  const ageInDays = (Date.now() - new Date(r.created_at).getTime()) / 86_400_000;
  const forkStarRatio = stars > 0 ? forks / stars : 1;
  const starsPerDay = ageInDays > 0 ? stars / ageInDays : 0;

  let score = 0;

  // Suspiciously low fork/star ratio given the star count
  if (forkStarRatio < 0.015 && stars > 5_000)  score += 45;
  else if (forkStarRatio < 0.025 && stars > 5_000)  score += 30;
  else if (forkStarRatio < 0.03  && stars > 10_000) score += 20;
  else if (forkStarRatio < 0.05  && stars > 20_000) score += 15;

  // Extreme star velocity (star farming typically bursts in days/weeks)
  if (starsPerDay > 300 && ageInDays < 365) score += 35;
  else if (starsPerDay > 150 && ageInDays < 180) score += 25;
  else if (starsPerDay > 80  && ageInDays < 90)  score += 15;

  // Young repo with outsized star counts
  if (ageInDays < 60  && stars > 3_000)  score += 25;
  else if (ageInDays < 120 && stars > 8_000)  score += 15;
  else if (ageInDays < 180 && stars > 15_000) score += 10;

  return score;
}

// ─── PHASE 2: FULL AUDIT ───────────────────────────────────────────────────────

async function auditRepo(repoInfo: RawRepo): Promise<AuditResult | null> {
  const owner = repoInfo.owner.login;
  const repo = repoInfo.name;
  const stars = repoInfo.stargazers_count;

  // Stargazer sampling
  const { users: refs, burstMonth, method } = await fetchSampledStargazers(owner, repo, stars);
  if (refs.length === 0) return null;

  process.stdout.write(` [${refs.length} samples, ${method}${burstMonth ? `, burst:${burstMonth}` : ""}]`);

  // User details
  const users = await fetchUserDetails(refs);
  if (users.length < 10) return null;

  // Dimension 1: Account Quality
  const aqResult = scoreAccounts(users);

  // Dimension 2: Temporal Behavior
  const tbResult = scoreTemporal(users, stars, repoInfo.created_at);

  // Dimension 3: Project Health
  const { commitsPerWeek, activeContributors } = await fetchCommitStats(owner, repo);
  const phResult = scoreHealth(repoInfo, commitsPerWeek, activeContributors);

  // Dimension 4: Authenticity (low-activity proxy, no lockstep yet — added in Phase 3)
  const lowActivityRatio = users.filter((u) => u.public_repos <= 1 && u.followers === 0 && u.following === 0).length / users.length;

  let burstLowActivityRatio = 0;
  if (burstMonth) {
    const burstUsers = users.filter((u) => u.starred_at.startsWith(burstMonth));
    if (burstUsers.length >= 5) {
      burstLowActivityRatio = burstUsers.filter((u) => u.public_repos <= 1 && u.followers === 0 && u.following === 0).length / burstUsers.length;
    }
  }

  const authScore = scoreAuthenticity(lowActivityRatio, 0, burstLowActivityRatio);

  // Final weighted score
  const rawScore =
    aqResult.score * 0.2625 +
    tbResult.score * 0.225 +
    phResult.score * 0.2625 +
    authScore * 0.25;
  const finalScore = Math.round(Math.max(0, Math.min(100, rawScore)));

  const baseLabel = resolveLabel(finalScore, authScore, stars, repoInfo.created_at);
  const label = applyOverrides(baseLabel, {
    noFollowersRatio: aqResult.signals.noFollowersRatio,
    noRepoRatio: aqResult.signals.noRepoRatio,
    lowActivityRatio,
    burstLowActivityRatio,
    lockstepScore: 0,
    forkStarRatio: phResult.signals.forkStarRatio,
    stars,
    ghostAccountsRatio: aqResult.signals.ghostAccountsRatio,
  });

  const signals: AuditResult["signals"] = {
    ...aqResult.signals,
    ...tbResult.signals,
    ...phResult.signals,
    lowActivityRatio,
    coordLockstepScore: 0,
    burstLowActivityRatio,
  };

  return {
    owner,
    repo,
    full_name: repoInfo.full_name,
    stars,
    forks: repoInfo.forks_count,
    score: finalScore,
    label,
    dimensions: {
      accountQuality: aqResult.score,
      temporalBehavior: tbResult.score,
      projectHealth: phResult.score,
      authenticity: authScore,
    },
    signals,
    burst_months: tbResult.burstMonths,
    lockstep_clusters: [],
    verification_notes: "",
    confidence: "UNVERIFIED",
    convergent_signals: countConvergentSignals(signals),
    sample_size: users.length,
    sampling_method: method,
    analyzed_at: new Date().toISOString(),
  };
}

// ─── PHASE 3: VERIFICATION ─────────────────────────────────────────────────────
// Only runs for SUSPICIOUS and DANGEROUS repos.
// Adds lockstep cluster detection (20 API calls for starred repos) and
// re-evaluates confidence. If convergent signals < 3 → downgrade to CAUTION.

async function verifyRepo(result: AuditResult, repoInfo: RawRepo): Promise<AuditResult> {
  const { owner, repo } = result;

  // Fetch a fresh burst-focused user sample (20-30 accounts to analyze individually)
  const { users: refs, burstMonth } = await fetchSampledStargazers(owner, repo, result.stars);
  const verifyRefs = burstMonth
    ? refs.filter((r) => r.starred_at.startsWith(burstMonth)).slice(0, 30)
    : refs.slice(0, 30);
  const verifyUsers = await fetchUserDetails(verifyRefs);

  // Lockstep detection using starred repos
  const { score: coordScore, clusters } = await detectLockstepClusters(verifyUsers, owner, repo);

  // Update signals and dimensions
  result.signals.coordLockstepScore = coordScore;
  result.signals.lockstepScore = Math.max(result.signals.lockstepScore, coordScore);
  result.lockstep_clusters = clusters;

  const authScore = scoreAuthenticity(
    result.signals.lowActivityRatio,
    coordScore,
    result.signals.burstLowActivityRatio
  );
  result.dimensions.authenticity = authScore;

  const rawScore =
    result.dimensions.accountQuality * 0.2625 +
    result.dimensions.temporalBehavior * 0.225 +
    result.dimensions.projectHealth * 0.2625 +
    authScore * 0.25;
  result.score = Math.round(Math.max(0, Math.min(100, rawScore)));

  const baseLabel = resolveLabel(result.score, authScore, result.stars, repoInfo.created_at);
  result.label = applyOverrides(baseLabel, {
    noFollowersRatio: result.signals.noFollowersRatio,
    noRepoRatio: result.signals.noRepoRatio,
    lowActivityRatio: result.signals.lowActivityRatio,
    burstLowActivityRatio: result.signals.burstLowActivityRatio,
    lockstepScore: coordScore,
    forkStarRatio: result.signals.forkStarRatio,
    stars: result.stars,
    ghostAccountsRatio: result.signals.ghostAccountsRatio,
  });

  // Convergent signals
  const conv = countConvergentSignals(result.signals);
  result.convergent_signals = conv;

  // Zero false positive policy: require ≥3 convergent signals for SUSPICIOUS,
  // ≥4 for DANGEROUS. Downgrade otherwise.
  if (result.label === "DANGEROUS" && conv < 4) {
    result.label = "SUSPICIOUS";
    result.confidence = "MEDIUM";
  }
  if (result.label === "SUSPICIOUS" && conv < 3) {
    result.label = "CAUTION";
    result.confidence = "LOW";
  } else if (result.label === "SUSPICIOUS") {
    result.confidence = conv >= 4 ? "HIGH" : "MEDIUM";
  } else if (result.label === "DANGEROUS") {
    result.confidence = conv >= 5 ? "HIGH" : "MEDIUM";
  }

  // Evidence summary
  const s = result.signals;
  const notes: string[] = [];
  if (s.newAccountsRatio > 0.20) notes.push(`${pct(s.newAccountsRatio)} accounts created <30d before starring`);
  if (s.noRepoRatio > 0.30) notes.push(`${pct(s.noRepoRatio)} accounts with 0 public repos`);
  if (s.noFollowersRatio > 0.40) notes.push(`${pct(s.noFollowersRatio)} accounts with 0 followers/following`);
  if (s.ghostAccountsRatio > 0.15) notes.push(`${pct(s.ghostAccountsRatio)} fully empty ghost accounts`);
  if (s.zScorePeak > 5) notes.push(`Z-score peak: ${s.zScorePeak.toFixed(1)} σ (anomalous burst)`);
  if (s.velocityAnomaly > 0.50) notes.push(`Velocity: ${pct(s.velocityAnomaly)} of 10× daily average`);
  if (s.concentration48h > 0.40) notes.push(`${pct(s.concentration48h)} of sample concentrated in 48h window`);
  if (coordScore > 0.20) notes.push(`Coordinated lockstep: ${pct(coordScore)} of sampled accounts in synchronized clusters`);
  if (s.burstLowActivityRatio > 0.30) notes.push(`${pct(s.burstLowActivityRatio)} burst stars from low-activity accounts`);
  if (result.burst_months.length > 0) notes.push(`Burst months: ${result.burst_months.join(", ")}`);
  if (clusters.length > 0) {
    const cl = clusters[0];
    notes.push(`Lockstep cluster: ${cl.size} accounts in window ${cl.window}, sharing repos: ${cl.shared_repos.slice(0, 3).join(", ")}`);
  }

  result.verification_notes = notes.join(". ") + ".";
  process.stdout.write(` [verified: ${result.label}, ${conv} signals, ${result.confidence}]`);

  return result;
}

function pct(r: number) {
  return `${Math.round(r * 100)}%`;
}

// ─── MAIN ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  TrustStar Investigation — Fake Stars in AI GitHub Repos");
  console.log("  Methodology: He et al. ICSE 2026 (arXiv:2412.13459)");
  console.log("═══════════════════════════════════════════════════════════════\n");

  // Resume from partial run if available
  let partial: AuditResult[] = [];
  if (fs.existsSync(PARTIAL_FILE)) {
    try {
      partial = JSON.parse(fs.readFileSync(PARTIAL_FILE, "utf-8"));
      console.log(`Resuming — ${partial.length} repos already audited\n`);
    } catch { /* start fresh */ }
  }
  const alreadyDone = new Set(partial.map((r) => r.full_name));

  // ── Phase 1: Discovery ──────────────────────────────────────────────────────
  console.log("Phase 1 — Discovering AI repos...");
  const discovered = await discoverAIRepos();

  // Sort by quick suspicion heuristic (highest suspicion first)
  const sorted = [...discovered].sort((a, b) => quickSuspicionScore(b) - quickSuspicionScore(a));

  // Build audit queue: top 100 not yet done
  const queue = sorted.filter((r) => !alreadyDone.has(r.full_name)).slice(0, 100 - partial.length);
  console.log(`\nPhase 1 complete — ${queue.length} repos queued for full audit\n`);

  // ── Phase 2: Full audit ─────────────────────────────────────────────────────
  console.log("Phase 2 — Full 4-dimension audit...\n");
  const results: AuditResult[] = [...partial];

  for (let i = 0; i < queue.length; i++) {
    const repoInfo = queue[i];
    process.stdout.write(`[${i + 1}/${queue.length}] ${repoInfo.full_name} (${repoInfo.stargazers_count.toLocaleString()}★)`);

    try {
      const result = await auditRepo(repoInfo);
      if (result) {
        results.push(result);
        process.stdout.write(` → ${result.label} (${result.score})\n`);
      } else {
        process.stdout.write(` → skipped (no data)\n`);
      }
    } catch (err) {
      process.stdout.write(` → error: ${err}\n`);
    }

    // Save incremental progress after every repo
    fs.writeFileSync(PARTIAL_FILE, JSON.stringify(results, null, 2));
    await sleep(400);
  }

  // ── Phase 3: Verification ───────────────────────────────────────────────────
  const suspects = results.filter((r) => r.label === "SUSPICIOUS" || r.label === "DANGEROUS");
  console.log(`\nPhase 3 — Verifying ${suspects.length} suspect repos...\n`);

  for (const result of suspects) {
    const repoInfo = discovered.find((r) => r.full_name === result.full_name);
    if (!repoInfo) continue;

    process.stdout.write(`Verify ${result.full_name}`);
    try {
      const verified = await verifyRepo(result, repoInfo);
      const idx = results.findIndex((r) => r.full_name === result.full_name);
      if (idx !== -1) results[idx] = verified;
    } catch (err) {
      process.stdout.write(` → verification error: ${err}`);
    }
    process.stdout.write("\n");

    // Save after each verification
    fs.writeFileSync(PARTIAL_FILE, JSON.stringify(results, null, 2));
    await sleep(800);
  }

  // ── Finalize ────────────────────────────────────────────────────────────────

  // Sort: most suspicious first, then by convergent signals
  const sevMap: Record<string, number> = { DANGEROUS: 4, SUSPICIOUS: 3, CAUTION: 2, NEW: 1, SAFE: 0 };
  results.sort((a, b) => {
    const ds = (sevMap[b.label] ?? 0) - (sevMap[a.label] ?? 0);
    return ds !== 0 ? ds : b.convergent_signals - a.convergent_signals;
  });

  // Summary counts
  const counts = { DANGEROUS: 0, SUSPICIOUS: 0, CAUTION: 0, SAFE: 0, NEW: 0 };
  for (const r of results) counts[r.label] = (counts[r.label] ?? 0) + 1;

  const output = {
    generated_at: new Date().toISOString(),
    total: results.length,
    summary: counts,
    methodology: {
      dimensions: {
        accountQuality: "26.25% — new accounts, ghost accounts, no-repo ratio, no-followers ratio",
        temporalBehavior: "22.5% — Z-score burst, velocity anomaly, 48h concentration",
        projectHealth: "26.25% — fork/star ratio, commit frequency, active contributors",
        authenticity: "25% — low activity ratio, coordinated lockstep, burst low-activity ratio",
      },
      reference: "He et al. ICSE 2026 — Six Million (Suspected) Fake Stars on GitHub. arXiv:2412.13459",
      zeroFalsePositive: "SUSPICIOUS requires ≥3 convergent signals; DANGEROUS requires ≥4. Downgraded to CAUTION otherwise.",
    },
    results,
  };

  fs.writeFileSync(OUT_FILE, JSON.stringify(output, null, 2));

  // Clean up partial file
  if (fs.existsSync(PARTIAL_FILE)) fs.unlinkSync(PARTIAL_FILE);

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  Results Summary");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`  Total repos analyzed : ${results.length}`);
  console.log(`  DANGEROUS            : ${counts.DANGEROUS}`);
  console.log(`  SUSPICIOUS           : ${counts.SUSPICIOUS}`);
  console.log(`  CAUTION              : ${counts.CAUTION}`);
  console.log(`  SAFE                 : ${counts.SAFE}`);
  console.log(`  NEW                  : ${counts.NEW}`);
  console.log(`\n  → ${OUT_FILE}`);

  // Print top suspects
  const topSuspects = results.filter((r) => r.label === "SUSPICIOUS" || r.label === "DANGEROUS").slice(0, 10);
  if (topSuspects.length > 0) {
    console.log("\n  Top suspects:");
    for (const r of topSuspects) {
      const cls = r.lockstep_clusters[0];
      const burst = r.burst_months[0] ?? "—";
      console.log(`  ${r.label.padEnd(10)} ${r.full_name.padEnd(45)} score:${r.score} signals:${r.convergent_signals} burst:${burst}${cls ? ` cluster:${cls.size}` : ""}`);
    }
  }
}

main().catch((err) => {
  console.error("\nFatal error:", err);
  process.exit(1);
});
