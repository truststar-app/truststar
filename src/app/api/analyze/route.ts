import { NextRequest, NextResponse } from "next/server";
import { fetchRepoInfo, fetchCommitActivity, fetchContributorStats } from "@/lib/github/commits";
import { fetchStargazersWithDetails, fetchLockstepData } from "@/lib/github/stargazers";
import { fetchIssueStats } from "@/lib/github/issues";
import { computeTrustScore } from "@/lib/scoring/engine";
import type { TrustScore, ApiError } from "@/lib/types";

// Cache en mémoire simple pour la V0
const analysisCache = new Map<string, { data: TrustScore; cachedAt: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function getCacheKey(owner: string, repo: string): string {
  return `${owner}/${repo}`.toLowerCase();
}

function parseGitHubUrl(input: string): { owner: string; repo: string } | null {
  // Accepte : https://github.com/owner/repo ou owner/repo
  const urlPattern = /github\.com\/([^/]+)\/([^/\s?#]+)/;
  const shortPattern = /^([^/]+)\/([^/\s]+)$/;

  const urlMatch = input.match(urlPattern);
  if (urlMatch) {
    return {
      owner: urlMatch[1],
      repo: urlMatch[2].replace(/\.git$/, ""),
    };
  }

  const shortMatch = input.trim().match(shortPattern);
  if (shortMatch) {
    return {
      owner: shortMatch[1],
      repo: shortMatch[2].replace(/\.git$/, ""),
    };
  }

  return null;
}

export async function POST(request: NextRequest): Promise<NextResponse<TrustScore | ApiError>> {
  try {
    const body = await request.json() as { url?: string; owner?: string; repo?: string };

    let owner: string;
    let repo: string;

    // Résolution owner/repo depuis URL ou champs directs
    if (body.url) {
      const parsed = parseGitHubUrl(body.url);
      if (!parsed) {
        return NextResponse.json(
          { error: "URL GitHub invalide", details: "Format attendu : https://github.com/owner/repo" },
          { status: 400 }
        );
      }
      owner = parsed.owner;
      repo = parsed.repo;
    } else if (body.owner && body.repo) {
      owner = body.owner;
      repo = body.repo;
    } else {
      return NextResponse.json(
        { error: "Paramètres manquants", details: "Fournir une URL GitHub ou owner + repo" },
        { status: 400 }
      );
    }

    // Vérification cache
    const cacheKey = getCacheKey(owner, repo);
    const cached = analysisCache.get(cacheKey);

    if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
      return NextResponse.json(cached.data);
    }

    // ── Fetch parallèle des données GitHub ───────────────────────────────────

    const [repoInfo, commitActivity, contributorStats, issueStats] =
      await Promise.all([
        fetchRepoInfo(owner, repo),
        fetchCommitActivity(owner, repo),
        fetchContributorStats(owner, repo),
        fetchIssueStats(owner, repo),
      ]);

    // ── Fetch stargazers (séquentiel car dépend du total) ────────────────────

    const users = await fetchStargazersWithDetails(
      owner,
      repo,
      repoInfo.stargazers_count
    );

    // ── Lockstep (échantillon réduit) ────────────────────────────────────────

    const starredMap = await fetchLockstepData(users, owner, repo);

    // ── Calcul du score ──────────────────────────────────────────────────────

    const trustScore = computeTrustScore({
      owner,
      repo,
      users,
      starredMap,
      repoInfo,
      commitActivity,
      contributorStats,
      issueStats,
    });

    // Mise en cache
    analysisCache.set(cacheKey, { data: trustScore, cachedAt: Date.now() });

    return NextResponse.json(trustScore);

  } catch (error) {
    console.error("Analysis error:", error);

    if (error instanceof Error) {
      if (error.name === "GitHubNotFoundError") {
        return NextResponse.json(
          { error: "Repo introuvable", details: "Vérifiez l'URL GitHub" },
          { status: 404 }
        );
      }
      if (error.name === "GitHubRateLimitError") {
        return NextResponse.json(
          { error: "Rate limit GitHub atteint", details: "Réessayez dans quelques minutes" },
          { status: 429 }
        );
      }
    }

    return NextResponse.json(
      { error: "Erreur interne", details: "L'analyse a échoué" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest): Promise<NextResponse<TrustScore | ApiError>> {
  const { searchParams } = new URL(request.url);
  const owner = searchParams.get("owner");
  const repo = searchParams.get("repo");

  if (!owner || !repo) {
    return NextResponse.json(
      { error: "Paramètres owner et repo requis" },
      { status: 400 }
    );
  }

  // Vérification cache uniquement pour GET
  const cacheKey = getCacheKey(owner, repo);
  const cached = analysisCache.get(cacheKey);

  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return NextResponse.json(cached.data);
  }

  return NextResponse.json(
    { error: "Aucun résultat en cache", details: "Lancez d'abord une analyse via POST" },
    { status: 404 }
  );
}
