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

// ─── Sampling helpers ─────────────────────────────────────────────────────────

function buildDistributedPages(totalPages: number): number[] {
  if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const p25 = Math.max(2, Math.floor(totalPages * 0.25));
  const p50 = Math.max(3, Math.floor(totalPages * 0.5));
  const p75 = Math.max(4, Math.floor(totalPages * 0.75));
  const pPrev = Math.max(5, totalPages - 1);
  return [...new Set([1, p25, p50, p75, pPrev, totalPages])];
}

function rawToGitHubUsers(raw: RawStargazer[]): GitHubUser[] {
  return raw.map((item) => ({
    login: item.user.login,
    id: item.user.id,
    avatar_url: item.user.avatar_url,
    starred_at: item.starred_at,
  }));
}

function subsampleRaw(raw: RawStargazer[], maxCount: number): RawStargazer[] {
  const step = Math.max(1, Math.floor(raw.length / maxCount));
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

// ─── Burst detection ──────────────────────────────────────────────────────────
// Returns the YYYY-MM string of the peak month if it is clearly a burst (3x+ median).
// Returns null for repos with organic growth (no dominant spike).

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

// Same as detectBurstMonth but for GitHubUserDetail[] (used in authenticity)
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

// Estimates the first page number where the burst month's stars begin.
// Uses the temporal distribution of the pass-1 sample as a proxy for the full history.
function estimateBurstPageStart(
  burstMonth: string,
  pass1Sample: RawStargazer[],
  totalPages: number
): number {
  const sorted = [...pass1Sample].sort(
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
): Promise<GitHubUser[]> {
  if (totalStars === 0) return [];

  const totalPages = Math.ceil(totalStars / PER_PAGE);

  // Small repos: simple distributed sampling (no two-pass overhead)
  if (totalStars < SMALL_REPO_THRESHOLD) {
    const pages = buildDistributedPages(totalPages);
    const raw = (await fetchStargazers(owner, repo, pages)) as RawStargazer[];
    return rawToGitHubUsers(subsampleRaw(raw, MAX_SAMPLE_SIZE));
  }

  // ── Large repos: two-pass burst-aware sampling ────────────────────────────

  // Pass 1: distributed probe to detect burst month (~6 API calls)
  const pass1Pages = buildDistributedPages(totalPages);
  const pass1Raw = (await fetchStargazers(owner, repo, pass1Pages)) as RawStargazer[];
  if (pass1Raw.length === 0) return [];

  const burstMonth = detectBurstMonth(pass1Raw);

  // No burst detected: organic growth, distributed sample is sufficient
  if (!burstMonth) {
    return rawToGitHubUsers(subsampleRaw(pass1Raw, MAX_SAMPLE_SIZE));
  }

  // Pass 2: fetch pages concentrated around the burst month (~3 API calls)
  const burstStart = estimateBurstPageStart(burstMonth, pass1Raw, totalPages);
  const burstPagesCount = totalStars >= 50_000 ? 3 : 2;
  const burstPages = Array.from({ length: burstPagesCount }, (_, i) =>
    Math.min(totalPages, burstStart + i)
  );
  const newBurstPages = burstPages.filter((p) => !pass1Pages.includes(p));

  let pass2Raw: RawStargazer[] = [];
  if (newBurstPages.length > 0) {
    pass2Raw = (await fetchStargazers(owner, repo, newBurstPages)) as RawStargazer[];
  }

  // Stratified sample: burst-period stars heavy + baseline stars light
  const burstTarget = totalStars >= 50_000 ? 150 : 100;
  const baselineTarget = 50;

  const burstFromPass1 = pass1Raw.filter((s) => s.starred_at.startsWith(burstMonth));
  const burstFromPass2 = pass2Raw.filter((s) => s.starred_at.startsWith(burstMonth));
  const allBurstStars = dedupByLogin([...burstFromPass1, ...burstFromPass2]);
  const baselineStars = pass1Raw.filter((s) => !s.starred_at.startsWith(burstMonth));

  const burstSample = allBurstStars.slice(0, burstTarget);
  const baselineSample = subsampleRaw(baselineStars, baselineTarget);

  return rawToGitHubUsers([...burstSample, ...baselineSample]);
}

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
): Promise<GitHubUserDetail[]> {
  const sample = await fetchStargazersSample(owner, repo, totalStars);

  const BATCH_SIZE = 50;
  const details: GitHubUserDetail[] = [];

  for (let i = 0; i < sample.length; i += BATCH_SIZE) {
    const batch = sample.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map((user) => fetchUserDetails(user.login, user.starred_at))
    );
    details.push(
      ...batchResults.filter((d): d is GitHubUserDetail => d !== null)
    );
  }

  return details;
}

// ─── Popular repo filter for lockstep ────────────────────────────────────────
// Strips repos with ≥ 5 000 stars from the starredMap so that popular repos
// (React, Vue, Next.js…) cannot fake-trigger the coordinated lockstep signal.

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
  const POPULAR_THRESHOLD = 5_000;
  const BATCH = 10;
  for (let i = 0; i < candidates.length; i += BATCH) {
    await Promise.all(
      candidates.slice(i, i + BATCH).map(async (fullName) => {
        try {
          const info = await githubFetch<{ stargazers_count: number }>(
            `/repos/${fullName}`
          );
          if (info.stargazers_count >= POPULAR_THRESHOLD) popularRepos.add(fullName);
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
// coordLockstepScore: always computed (uses starredMap in memory + ~40 repo lookups)
// lowActivityRatio + burstLowActivityRatio: only when fetchEvents=true
// burstVsBaselineDelta: computed from events data to amplify concentrated campaign signal

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

  // ── Events API: low-activity + shallow-activity detection ────────────────
  // Sample burst users first (they're at the start of the array in two-pass output)
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

  // ── Burst-vs-baseline delta ───────────────────────────────────────────────
  // If burst-period accounts are significantly more suspicious than baseline accounts,
  // amplify the lowActivityRatio to reflect the concentrated campaign pattern.
  const burstMonth = detectBurstMonthFromUsers(users);
  if (burstMonth) {
    const burstGroup = sample.filter((u) => u.starred_at.startsWith(burstMonth));
    const baselineGroup = sample.filter((u) => !u.starred_at.startsWith(burstMonth));
    if (burstGroup.length >= 5 && baselineGroup.length >= 5) {
      const burstRatio = computeLowActivityRatio(burstGroup, userEventTypes);
      const baselineRatio = computeLowActivityRatio(baselineGroup, userEventTypes);
      const delta = burstRatio - baselineRatio;
      if (delta > 0.20) {
        // Amplify: burst is clearly worse than baseline — boost the overall signal
        lowActivityRatio = Math.min(1, lowActivityRatio + delta * 0.5);
      }
    }
  }

  const lowActivityLogins = new Set(
    sample
      .filter((u) => {
        const events = userEventTypes.get(u.login) ?? [];
        const nonPassive = events.filter(
          (t) => t !== "WatchEvent" && t !== "ForkEvent"
        );
        return u.public_repos <= 1 && nonPassive.length === 0;
      })
      .map((u) => u.login)
  );
  const burstLowActivityRatio = computeBurstLowActivityRatio(users, lowActivityLogins);

  return { lowActivityRatio, coordLockstepScore, burstLowActivityRatio };
}

// ─── Lockstep starred-repos data ─────────────────────────────────────────────
// Fetches the full list of OTHER repos starred by a sample of users.
// With two-pass sampling, the first half of users are burst-period accounts —
// the "first 15" slice naturally targets the most suspicious group.

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
