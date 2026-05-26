import { NextRequest, NextResponse } from "next/server";
import { analyzeNpmPackage, type NpmCheckResult } from "@/lib/npm/analyzer";
import { addAudit } from "@/lib/recent-audits";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

const cache = new Map<string, { data: NpmCheckResult; cachedAt: number }>();
const CACHE_TTL = 10 * 60 * 1000;

function isValidPackageName(name: string): boolean {
  return /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.test(name);
}

function timeout(ms: number): Promise<never> {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
  );
}

function roughScore(result: NpmCheckResult): number {
  const warnings = result.signals.filter((s) => s.type === "warning").length;
  const neutrals = result.signals.filter((s) => s.type === "neutral").length;
  return Math.max(0, Math.min(100, 100 - warnings * 18 - neutrals * 4));
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<NpmCheckResult | { error: string; details?: string }>> {
  if (!rateLimit(getClientIp(request), 30, 60_000)) {
    return NextResponse.json(
      { error: "Too many requests. Please try again in a minute." },
      { status: 429 }
    );
  }

  try {
    const body = (await request.json()) as { package?: string };
    const packageName = body.package?.trim().toLowerCase();

    if (!packageName) {
      return NextResponse.json(
        { error: "Missing parameters", details: "Provide a package name" },
        { status: 400 }
      );
    }

    if (!isValidPackageName(packageName)) {
      return NextResponse.json(
        { error: "Invalid package name", details: "Not a valid npm package name" },
        { status: 400 }
      );
    }

    const hit = cache.get(packageName);
    if (hit && Date.now() - hit.cachedAt < CACHE_TTL) {
      return NextResponse.json(hit.data);
    }

    const result = await Promise.race([
      analyzeNpmPackage(packageName),
      timeout(25_000),
    ]);

    cache.set(packageName, { data: result, cachedAt: Date.now() });

    const score = roughScore(result);
    const label: "SAFE" | "SUSPICIOUS" | "DANGEROUS" =
      score >= 70 ? "SAFE" : score >= 40 ? "SUSPICIOUS" : "DANGEROUS";

    addAudit({
      id: crypto.randomUUID(),
      type: "npm-check",
      slug: packageName,
      score,
      label,
      analyzedAt: new Date().toISOString(),
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("npm-check error:", error);

    if (error instanceof Error) {
      if (error.message.includes("404")) {
        return NextResponse.json(
          {
            error: "Package not found on npm",
            details: "Check the package name and try again",
          },
          { status: 404 }
        );
      }
      if (error.message.toLowerCase().includes("timeout")) {
        return NextResponse.json(
          { error: "Timeout", details: "Analysis took too long. Please retry." },
          { status: 504 }
        );
      }
    }

    return NextResponse.json(
      { error: "Internal error", details: "Analysis failed" },
      { status: 500 }
    );
  }
}
