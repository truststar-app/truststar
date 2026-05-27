import { fetchStargazers, githubFetch } from "./client";
import type { GitHubUser, GitHubUserDetail } from "../types";
import { fetchUserEventData } from "./events";
import {
  estimateLowActivityRatio,
  computeLowActivityRatio,
  computeCoordLockstepScore,
  computeBurstLowActivityRatio,
  type AuthenticitySignals,
} from "../scoring/authenticity";

const MAX_SAMPLE_SIZE = 150;
const PER_PAGE = 100;
const SMALL_REPO_THRESHOLD = 5_000;

type RawStargazer = {
  starred_at: string;
  user: {
    login: string;
    id: number;
    avatar_url: string;
  };
};

type RawUserDetail = {
  login: string;
  id: number;
  avatar_url: string;
  created_at: string;
  public_repos: number;
  followers: number;
  following: number;
};

export type SamplingMeta = {
  burstMonth: string | null;
  method: "stratified" | "default";
  burstGroupSize: number;
  baselineGroupSize: number;
};

// ─── Low-level helpers ────────────────────────────────────────────────────────

function rawToGitHubUsers(raw: RawStargazer[]): GitHubUser[] {
  return raw.map((item) => ({
    login: item.user.login,
    id: item.user.id,
    avatar_url: item.user.avatar_url,
    starred_at: item.starred_at,
  }));
}

function subsampleRaw(raw: RawStargazer[], maxCount: number): RawStargazer[] {
  if (raw.length <= maxCount) return raw;
  const step = Math.floor(raw.length / maxCount);
  return raw.filter((_, i) => i % step === 0).slice(0, maxCount);
}

function dedupByLogin(raw: RawStargazer[]): RawStargazer[] {
  const seen = new Set<string>();
  return raw.filter((item) => {
    if (seen.has(item.user.login)) return false;
    seen.add(item.user.login);
    return true;
  });
}

// ─── Scan page selection ──────────────────────────────────────────────────────
// For large repos: page 1 (oldest) + middle page + last 5 pages (most recent).
// The last 5 pages ensure recent fake star campaigns are always in the probe sample.

function buildScanPages(totalPages: number): number[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const mid = Math.ceil(totalPages / 2);
  const last5 = [
    totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages,
  ].filter((p) => p > mid);
  return [...new Set([1, mid, ...last5])].sort((a, b) => a - b);
}

// For small repos: evenly distributed pages across full history.
function buildDistributedPages(totalPages: number): number[] {
  if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const p25 = Math.max(2, Math.floor(totalPages * 0.25));
  const p50 = Math.max(3, Math.floor(totalPages * 0.5));
  const p75 = Math.max(4, Math.floor(totalPages * 0.75));
  return [...new Set([1, p25, p50, p75, totalPages])];
}

// ─── Burst month detection ────────────────────────────────────────────────────
// Returns the YYYY-MM of the peak month if it is clearly anomalous (3× median).
// The scan sample always includes the last 5 pages, so recent spikes are captured.

function detectBurstMonth(sample: RawStargazer[]): string | null {
  if (sample.length < 10) return null;

  const monthCounts = new Map<string, number>();
  for (const s of sample) {
    const m = s.starred_at.substring(0, 7);
    monthCounts.set(m, (monthCounts.get(m) ?? 0) + 1);
  }
  if (monthCounts.size < 3) return null;

  const counts = Array.from(monthCounts.values()).sort((a, b) => a - b);
  const median = counts[Math.floor(counts.length / 2)];
  if (median === 0) return null;

  let peak = 0;
  let peakMonth = "";
  for (const [month, count] of monthCounts.entries()) {
    if (count > peak) { peak = count; peakMonth = month; }
  }
  return peak > median * 3 ? peakMonth : null;
}

// Same algorithm for GitHubUserDetail[] (used inside engine & authenticity).
export function detectBurstMonthFromUsers(users: GitHubUserDetail[]): string | null {
  if (users.length < 10) return null;

  const monthCounts = new Map<string, number>();
  for (const u of users) {
    const m = u.starred_at.substring(0, 7);
    monthCounts.set(m, (monthCounts.get(m) ?? 0) + 1);
  }
  if (monthCounts.size < 3) return null;

  const counts = Array.from(monthCounts.values()).sort((a, b) => a - b);
  const median = counts[Math.floor(counts.length / 2)];
  if (median === 0) return null;

  let peak = 0;
  let peakMonth = "";
  for (const [month, count] of monthCounts.entries()) {
    if (count > peak) { peak = count; peakMonth = month; }
  }
  return peak > median * 3 ? peakMonth : null;
}

// Estimates the first page number for the burst month by interpolating the
// pass-1 sample's timestamp distribution against total pages.
function estimateBurstPageStart(
  burstMonth: string,
  scanSample: RawStargazer[],
  totalPages: number
): number {
  const sorted = [...scanSample].sort(
    (a, b) => new Date(a.starred_at).getTime() - new Date(b.starred_at).getTime()
  );
  const burstStartIso = `${burstMonth}-01`;
  const countBefore = sorted.filter((s) => s.starred_at < burstStartIso).length;
  const fraction = countBefore / sorted.length;
  return Math.max(1, Math.floor(fraction * totalPages));
}

// ─── Main sampling function ───────────────────────────────────────────────────

export async function fetchStargazersSample(
  owner: string,
  repo: string,
  totalStars: number
): Promise<{ users: GitHubUser[]; meta: SamplingMeta }> {
  if (totalStars === 0) {
    return { users: [], meta: { burstMonth: null, method: "default", burstGroupSize: 0, baselineGroupSize: 0 } };
  }

  const totalPages = Math.ceil(totalStars / PER_PAGE);

  // ── Small repos: evenly distributed pages, no burst analysis needed ─────────
  if (totalStars < SMALL_REPO_THRESHOLD) {
    const pages = buildDistributedPages(totalPages);
    const raw = (await fetchStargazers(owner, repo, pages)) as RawStargazer[];
    const subsampled = subsampleRaw(raw, MAX_SAMPLE_SIZE);
    return {
      users: rawToGitHubUsers(subsampled),
      meta: { burstMonth: null, method: "default", burstGroupSize: 0, baselineGroupSize: subsampled.length },
    };
  }

  // ── Large repos: two-pass burst-aware sampling ────────────────────────────

  // Pass 1 — scan: page 1 + middle + last 5 pages (~7 API calls = ~700 stars)
  // The last 5 pages guarantee recent campaigns are always represented.
  let scanRaw: RawStargazer[];
  try {
    const scanPages = buildScanPages(totalPages);
    scanRaw = (await fetchStargazers(owner, repo, scanPages)) as RawStargazer[];
  } catch {
    // Fallback to distributed sampling if scan fails
    const pages = buildDistributedPages(totalPages);
    const raw = (await fetchStargazers(owner, repo, pages)) as RawStargazer[];
    const subsampled = subsampleRaw(raw, MAX_SAMPLE_SIZE);
    return {
      users: rawToGitHubUsers(subsampled),
      meta: { burstMonth: null, method: "default", burstGroupSize: 0, baselineGroupSize: subsampled.length },
    };
  }

  if (scanRaw.length === 0) {
    return { users: [], meta: { burstMonth: null, method: "default", burstGroupSize: 0, baselineGroupSize: 0 } };
  }

  const burstMonth = detectBurstMonth(scanRaw);

  // ── No burst: recency-biased sample ──────────────────────────────────────
  // Even without a spike, we prefer recent stars over old ones because:
  //   a) Fake star services target recent visibility
  //   b) Recent accounts haven't had time to build organic profiles
  if (!burstMonth) {
    const sortedDesc = [...scanRaw].sort(
      (a, b) => new Date(b.starred_at).getTime() - new Date(a.starred_at).getTime()
    );
    // Most recent 500 stars = from last 5 scan pages
    const recent = sortedDesc.slice(0, 500);
    const historical = sortedDesc.slice(500);

    const recentSample = subsampleRaw(recent, 100);
    const historicalSample = subsampleRaw(historical, 50);
    const combined = [...recentSample, ...historicalSample];

    return {
      users: rawToGitHubUsers(combined),
      meta: {
        burstMonth: null,
        method: "default",
        burstGroupSize: 0,
        baselineGroupSize: combined.length,
      },
    };
  }

  // ── Burst detected: pass 2 — targeted pages around the burst month ────────
  const burstPageStart = estimateBurstPageStart(burstMonth, scanRaw, totalPages);
  const burstPageCount = totalStars >= 50_000 ? 5 : 3;
  const scanPages = buildScanPages(totalPages);
  const burstPages = Array.from({ length: burstPageCount }, (_, i) =>
    Math.min(totalPages, burstPageStart + i)
  );
  const newBurstPages = burstPages.filter((p) => !scanPages.includes(p));

  let pass2Raw: RawStargazer[] = [];
  if (newBurstPages.length > 0) {
    try {
      pass2Raw = (await fetchStargazers(owner, repo, newBurstPages)) as RawStargazer[];
    } catch { /* proceed with scan data only */ }
  }

  // Stratified sample: burst-period stars (majority) + baseline stars (minority)
  const burstTarget = totalStars >= 50_000 ? 150 : 100;
  const baselineTarget = 50;

  const allBurstStars = dedupByLogin([
    ...scanRaw.filter((s) => s.starred_at.startsWith(burstMonth)),
    ...pass2Raw.filter((s) => s.starred_at.startsWith(burstMonth)),
  ]);
  const baselineStars = scanRaw.filter((s) => !s.starred_at.startsWith(burstMonth));

  const burstSample = allBurstStars.slice(0, burstTarget);
  const baselineSample = subsampleRaw(baselineStars, baselineTarget);

  return {
    users: rawToGitHubUsers([...burstSample, ...baselineSample]),
    meta: {
      burstMonth,
      method: "stratified",
      burstGroupSize: burstSample.length,
      baselineGroupSize: baselineSample.length,
    },
  };
}

// ─── User details fetch ───────────────────────────────────────────────────────

export async function fetchUserDetails(
  login: string,
  starredAt: string
): Promise<GitHubUserDetail | null> {
  try {
    const user = await githubFetch<RawUserDetail>(`/users/${login}`);
    return {
      login: user.login,
      id: user.id,
      avatar_url: user.avatar_url,
      created_at: user.created_at,
      public_repos: user.public_repos,
      followers: user.followers,
      following: user.following,
      starred_at: starredAt,
    };
  } catch (error) {
    console.error(`Failed to fetch user details for ${login}:`, error);
    return null;
  }
}

export async function fetchUserStarredRepos(login: string): Promise<string[]> {
  try {
    const starred = await githubFetch<{ full_name: string }[]>(
      `/users/${login}/starred?per_page=100`
    );
    return starred.map((r) => r.full_name);
  } catch {
    return [];
  }
}

export async function fetchStargazersWithDetails(
  owner: string,
  repo: string,
  totalStars: number
): Promise<{ users: GitHubUserDetail[]; meta: SamplingMeta }> {
  const { users: sample, meta } = await fetchStargazersSample(owner, repo, totalStars);

  const BATCH_SIZE = 50;
  const details: GitHubUserDetail[] = [];

  for (let i = 0; i < sample.length; i += BATCH_SIZE) {
    const batch = sample.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map((user) => fetchUserDetails(user.login, user.starred_at))
    );
    details.push(...batchResults.filter((d): d is GitHubUserDetail => d !== null));
  }

  return { users: details, meta };
}

// ─── Popular repo filter (for lockstep false-positive prevention) ─────────────
// Strips repos with ≥5 000 stars before the lockstep comparison so that
// popular projects (React, Vue, Next.js…) don't fake-trigger clustering.

async function buildObscureStarredMap(
  starredMap: Map<string, string[]>
): Promise<Map<string, string[]>> {
  const freq = new Map<string, number>();
  for (const repos of starredMap.values()) {
    for (const r of repos) freq.set(r, (freq.get(r) ?? 0) + 1);
  }

  const candidates = Array.from(freq.entries())
    .filter(([, n]) => n >= 2)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 40)
    .map(([repo]) => repo);

  if (candidates.length === 0) return starredMap;

  const popularRepos = new Set<string>();
  const BATCH = 10;
  for (let i = 0; i < candidates.length; i += BATCH) {
    await Promise.all(
      candidates.slice(i, i + BATCH).map(async (fullName) => {
        try {
          const info = await githubFetch<{ stargazers_count: number }>(`/repos/${fullName}`);
          if (info.stargazers_count >= 5_000) popularRepos.add(fullName);
        } catch { /* leave in map — conservative */ }
      })
    );
  }

  if (popularRepos.size === 0) return starredMap;

  const filtered = new Map<string, string[]>();
  for (const [login, repos] of starredMap.entries()) {
    filtered.set(login, repos.filter((r) => !popularRepos.has(r)));
  }
  return filtered;
}

// ─── Authenticity data fetch ──────────────────────────────────────────────────

export async function fetchAuthenticityData(
  users: GitHubUserDetail[],
  starredMap: Map<string, string[]>,
  fetchEvents: boolean
): Promise<AuthenticitySignals> {
  const obscureStarredMap = await buildObscureStarredMap(starredMap);
  const userTimestamps = new Map(
    users.map((u) => [u.login, new Date(u.starred_at).getTime()])
  );
  const coordLockstepScore = computeCoordLockstepScore(obscureStarredMap, userTimestamps);

  if (!fetchEvents) {
    return {
      lowActivityRatio: estimateLowActivityRatio(users),
      coordLockstepScore,
      burstLowActivityRatio: 0,
    };
  }

  // Events API — low-activity + shallow-activity detection
  // Burst users are first in the array (stratified sampling output), so we
  // naturally oversample the suspicious period when taking the first 50.
  const SAMPLE_SIZE = 50;
  const BATCH_SIZE = 10;
  const sample = users.slice(0, SAMPLE_SIZE);

  const userEventTypes = new Map<string, string[]>();
  for (let i = 0; i < sample.length; i += BATCH_SIZE) {
    await Promise.all(
      sample.slice(i, i + BATCH_SIZE).map(async (user) => {
        const data = await fetchUserEventData(user.login);
        userEventTypes.set(user.login, data.eventTypes);
      })
    );
  }

  let lowActivityRatio = computeLowActivityRatio(sample, userEventTypes);

  // Burst-vs-baseline delta amplification:
  // If burst-period accounts are ≥20pp more suspicious than baseline,
  // boost the final ratio to avoid dilution by legitimate baseline users.
  const burstMonth = detectBurstMonthFromUsers(users);
  if (burstMonth) {
    const burstGroup = sample.filter((u) => u.starred_at.startsWith(burstMonth));
    const baselineGroup = sample.filter((u) => !u.starred_at.startsWith(burstMonth));
    if (burstGroup.length >= 5 && baselineGroup.length >= 5) {
      const burstRatio = computeLowActivityRatio(burstGroup, userEventTypes);
      const baselineRatio = computeLowActivityRatio(baselineGroup, userEventTypes);
      const delta = burstRatio - baselineRatio;
      if (delta > 0.20) {
        lowActivityRatio = Math.min(1, lowActivityRatio + delta * 0.5);
      }
    }
  }

  const lowActivityLogins = new Set(
    sample
      .filter((u) => {
        const events = userEventTypes.get(u.login) ?? [];
        const nonPassive = events.filter((t) => t !== "WatchEvent" && t !== "ForkEvent");
        return u.public_repos <= 1 && nonPassive.length === 0;
      })
      .map((u) => u.login)
  );
  const burstLowActivityRatio = computeBurstLowActivityRatio(users, lowActivityLogins);

  return { lowActivityRatio, coordLockstepScore, burstLowActivityRatio };
}

// ─── Lockstep starred-repos data ─────────────────────────────────────────────
// With stratified sampling, burst users are first in the array — so taking
// "first 15" naturally targets the most suspicious group.

export async function fetchLockstepData(
  users: GitHubUserDetail[],
  owner: string,
  repo: string
): Promise<Map<string, string[]>> {
  const HALF = 15;
  const first = users.slice(0, HALF);
  const last = users.slice(-HALF);
  const seen = new Set<string>();
  const sample: GitHubUserDetail[] = [];
  for (const u of [...first, ...last]) {
    if (!seen.has(u.login)) { seen.add(u.login); sample.push(u); }
  }

  const starredMap = new Map<string, string[]>();
  const BATCH_SIZE = 5;
  for (let i = 0; i < sample.length; i += BATCH_SIZE) {
    await Promise.all(
      sample.slice(i, i + BATCH_SIZE).map(async (user) => {
        const repos = await fetchUserStarredRepos(user.login);
        starredMap.set(user.login, repos.filter((r) => r !== `${owner}/${repo}`));
      })
    );
  }

  return starredMap;
}
