import { NextResponse } from "next/server";

interface CacheEntry { data: unknown; ts: number }
const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 60 * 60 * 1000;

const PACKAGES = [
  "lodash", "chalk", "react", "react-dom", "express", "next", "typescript",
  "axios", "moment", "webpack", "eslint", "prettier", "jest", "dotenv", "uuid",
  "fs-extra", "cors", "yargs", "commander", "debug", "ms", "semver", "glob",
  "rimraf", "underscore", "async", "got", "node-fetch", "socket.io", "mongoose",
  "redis", "pg", "zod", "ajv", "cheerio", "sharp", "jsonwebtoken", "bcryptjs",
  "helmet", "morgan", "winston", "dayjs", "date-fns", "vue", "svelte", "jquery",
  "tailwindcss", "vite", "rollup", "esbuild",
];

interface NpmDownloadPoint {
  downloads: number;
  start: string;
  end: string;
  package: string;
}

interface NpmLatest {
  version?: string;
  description?: string;
}

export async function GET() {
  const hit = cache.get("npm");
  if (hit && Date.now() - hit.ts < CACHE_TTL) {
    return NextResponse.json(hit.data);
  }

  try {
    const pkgList = PACKAGES.join(",");
    const dlRes = await fetch(
      `https://api.npmjs.org/downloads/point/last-week/${pkgList}`
    );
    if (!dlRes.ok) throw new Error("npm downloads fetch failed");
    const dlData = await dlRes.json() as Record<string, NpmDownloadPoint | null>;

    const metaResults = await Promise.allSettled(
      PACKAGES.map((pkg) =>
        fetch(`https://registry.npmjs.org/${encodeURIComponent(pkg)}/latest`, {
          headers: { Accept: "application/json" },
        })
          .then((r) => (r.ok ? (r.json() as Promise<NpmLatest>) : null))
          .catch(() => null)
      )
    );

    const packages = PACKAGES.map((pkg, i) => {
      const downloads = dlData[pkg]?.downloads ?? 0;
      const settled = metaResults[i];
      const meta = settled.status === "fulfilled" ? settled.value : null;
      return {
        name: pkg,
        description: meta?.description ?? "",
        version: meta?.version ?? "",
        weeklyDownloads: downloads,
      };
    }).filter((p) => p.weeklyDownloads > 0);

    packages.sort((a, b) => b.weeklyDownloads - a.weeklyDownloads);

    const result = { packages };
    cache.set("npm", { data: result, ts: Date.now() });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }
}
