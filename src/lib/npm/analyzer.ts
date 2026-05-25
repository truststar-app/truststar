import {
  getWeeklyDownloads,
  getMonthlyDownloads,
  getDailyDownloads,
  getPackageMetadata,
} from "./client";
import { githubFetch, GitHubNotFoundError } from "@/lib/github/client";
import type { RepoInfo } from "@/lib/types";

export type NpmSignal = {
  id: string;
  type: "positive" | "neutral" | "warning";
  label: string;
  detail: string;
};

export type NpmCheckResult = {
  package: string;
  version: string;
  description: string;
  license: string;
  weeklyDownloads: number;
  monthlyDownloads: number;
  stars: number;
  forks: number;
  openIssues: number;
  signals: NpmSignal[];
  downloadTrend: { day: string; downloads: number }[];
  maintainers: { name: string }[];
  versionsCount: number;
  firstPublished: string;
  lastPublished: string;
  repositoryUrl: string | null;
  hasInstallScripts: boolean;
  dependencyCount: number;
  analyzedAt: string;
};

function parseGitHubSlug(url: string): { owner: string; repo: string } | null {
  const m = url.match(/github\.com\/([^/]+)\/([^/\s?#]+)/);
  if (!m) return null;
  return { owner: m[1], repo: m[2].replace(/\.git$/, "") };
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return n.toLocaleString("en-US");
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function monthsAgo(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24 * 30.5);
}

function daysAgo(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24);
}

function computeSignals(p: {
  weeklyDownloads: number;
  stars: number;
  forks: number;
  hasRepo: boolean;
  maintainersCount: number;
  versionsCount: number;
  firstPublished: string;
  lastPublished: string;
  hasInstallScripts: boolean;
}): NpmSignal[] {
  const signals: NpmSignal[] = [];
  const ageMonths = monthsAgo(p.firstPublished);
  const lastPubMonths = monthsAgo(p.lastPublished);
  const ageDays = daysAgo(p.firstPublished);

  // ── Positive ─────────────────────────────────────────────────────────────────

  if (p.weeklyDownloads > 10_000) {
    signals.push({
      id: "P-01",
      type: "positive",
      label: "Widely adopted",
      detail: `${fmt(p.weeklyDownloads)} downloads in the past week`,
    });
  }

  if (ageMonths > 24) {
    signals.push({
      id: "P-02",
      type: "positive",
      label: "Established package",
      detail: `Published since ${fmtDate(p.firstPublished)} — ${Math.floor(ageMonths / 12)}+ year history`,
    });
  }

  if (p.maintainersCount > 1) {
    signals.push({
      id: "P-03",
      type: "positive",
      label: "Multiple maintainers",
      detail: `${p.maintainersCount} registered maintainers on npm`,
    });
  }

  if (p.versionsCount > 10) {
    signals.push({
      id: "P-04",
      type: "positive",
      label: "Actively versioned",
      detail: `${p.versionsCount} versions published over its lifetime`,
    });
  }

  if (p.hasRepo) {
    signals.push({
      id: "P-05",
      type: "positive",
      label: "Source available",
      detail: "Package links to a public source repository",
    });
  }

  if (p.stars > 100) {
    signals.push({
      id: "P-06",
      type: "positive",
      label: "Community endorsed",
      detail: `${fmt(p.stars)} GitHub stars`,
    });
  }

  if (lastPubMonths < 6) {
    signals.push({
      id: "P-07",
      type: "positive",
      label: "Recently maintained",
      detail: `Last update on ${fmtDate(p.lastPublished)}`,
    });
  }

  // ── Neutral ──────────────────────────────────────────────────────────────────

  if (p.weeklyDownloads < 100) {
    signals.push({
      id: "N-01",
      type: "neutral",
      label: "Low adoption",
      detail: `Only ${p.weeklyDownloads} downloads in the past week`,
    });
  }

  if (p.maintainersCount === 1) {
    signals.push({
      id: "N-02",
      type: "neutral",
      label: "Single maintainer",
      detail: "This package is maintained by a single npm account",
    });
  }

  if (!p.hasRepo) {
    signals.push({
      id: "N-03",
      type: "neutral",
      label: "No source repository",
      detail: "No repository field declared in package.json",
    });
  }

  if (lastPubMonths >= 12) {
    signals.push({
      id: "N-04",
      type: "neutral",
      label: "Not recently updated",
      detail: `Last published on ${fmtDate(p.lastPublished)}`,
    });
  }

  // ── Warning (conservative — only clear anomalies) ────────────────────────────

  // Very high downloads with almost zero community presence
  if (p.weeklyDownloads > 100_000 && p.stars < 50 && p.forks < 10) {
    signals.push({
      id: "W-01",
      type: "warning",
      label: "Download/star disparity",
      detail: `${fmt(p.weeklyDownloads)} weekly downloads but very few community signals (${p.stars} stars, ${p.forks} forks). Could indicate automated downloads, CI tooling, or internal company usage — worth verifying.`,
    });
  }

  // Very high stars with almost no actual downloads
  if (p.stars > 10_000 && p.weeklyDownloads < 500) {
    signals.push({
      id: "W-02",
      type: "warning",
      label: "Star/download disparity",
      detail: `${fmt(p.stars)} GitHub stars but only ${p.weeklyDownloads} weekly downloads. Stars may reflect interest rather than production usage.`,
    });
  }

  // Install scripts always worth calling out
  if (p.hasInstallScripts) {
    signals.push({
      id: "W-03",
      type: "warning",
      label: "Install scripts detected",
      detail:
        "This package runs code during npm install (preinstall / install / postinstall). Review the scripts field in package.json before installing.",
    });
  }

  // Brand-new package with abnormally high downloads
  if (ageDays < 30 && p.weeklyDownloads > 50_000) {
    signals.push({
      id: "W-04",
      type: "warning",
      label: "New package with unusual downloads",
      detail: `Published only ${Math.floor(ageDays)} days ago but already has ${fmt(p.weeklyDownloads)} weekly downloads. Verify this package is what you expect.`,
    });
  }

  // Sort: positive → neutral → warning
  const order: Record<string, number> = { positive: 0, neutral: 1, warning: 2 };
  signals.sort((a, b) => order[a.type] - order[b.type]);

  return signals;
}

export async function analyzeNpmPackage(packageName: string): Promise<NpmCheckResult> {
  const [weeklyDownloads, monthlyDownloads, dailyDownloads, metadata] =
    await Promise.all([
      getWeeklyDownloads(packageName),
      getMonthlyDownloads(packageName),
      getDailyDownloads(packageName),
      getPackageMetadata(packageName),
    ]);

  let stars = 0;
  let forks = 0;
  let openIssues = 0;

  if (metadata.repositoryUrl) {
    const slug = parseGitHubSlug(metadata.repositoryUrl);
    if (slug) {
      try {
        const info = await githubFetch<RepoInfo>(
          `/repos/${slug.owner}/${slug.repo}`
        );
        stars = info.stargazers_count ?? 0;
        forks = info.forks_count ?? 0;
        openIssues = info.open_issues_count ?? 0;
      } catch (e) {
        if (!(e instanceof GitHubNotFoundError)) {
          // silently ignore rate limits and transient errors
        }
      }
    }
  }

  const signals = computeSignals({
    weeklyDownloads,
    stars,
    forks,
    hasRepo: !!metadata.repositoryUrl,
    maintainersCount: metadata.maintainers.length,
    versionsCount: metadata.versionsCount,
    firstPublished: metadata.createdAt,
    lastPublished: metadata.lastPublish,
    hasInstallScripts: metadata.hasInstallScripts,
  });

  return {
    package: packageName,
    version: metadata.latestVersion,
    description: metadata.description,
    license: metadata.license,
    weeklyDownloads,
    monthlyDownloads,
    stars,
    forks,
    openIssues,
    signals,
    downloadTrend: dailyDownloads,
    maintainers: metadata.maintainers,
    versionsCount: metadata.versionsCount,
    firstPublished: metadata.createdAt,
    lastPublished: metadata.lastPublish,
    repositoryUrl: metadata.repositoryUrl,
    hasInstallScripts: metadata.hasInstallScripts,
    dependencyCount: metadata.dependencyCount,
    analyzedAt: new Date().toISOString(),
  };
}
