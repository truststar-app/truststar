const NPM_DOWNLOADS = "https://api.npmjs.org";
const NPM_REGISTRY = "https://registry.npmjs.org";
const CACHE_TTL = 10 * 60 * 1000;
const TIMEOUT = 10_000;

// NEW #3: Cap cache size to prevent OOM from many unique package URLs
const MAX_CACHE_SIZE = 200;
const cache = new Map<string, { data: unknown; cachedAt: number }>();

async function timedFetch(url: string): Promise<Response> {
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    return await fetch(url, { signal: ctrl.signal, next: { revalidate: 0 } } as RequestInit);
  } finally {
    clearTimeout(tid);
  }
}

async function npmFetch<T>(url: string): Promise<T> {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.cachedAt < CACHE_TTL) return hit.data as T;
  const res = await timedFetch(url);
  if (!res.ok) throw new Error(`npm fetch ${res.status}`);
  const data = (await res.json()) as T;
  if (cache.size >= MAX_CACHE_SIZE) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(url, { data, cachedAt: Date.now() });
  return data;
}

export async function getWeeklyDownloads(pkg: string): Promise<number> {
  try {
    const data = await npmFetch<{ downloads: number }>(
      `${NPM_DOWNLOADS}/downloads/point/last-week/${encodeURIComponent(pkg)}`
    );
    return data.downloads ?? 0;
  } catch {
    return 0;
  }
}

export async function getMonthlyDownloads(pkg: string): Promise<number> {
  try {
    const data = await npmFetch<{ downloads: number }>(
      `${NPM_DOWNLOADS}/downloads/point/last-month/${encodeURIComponent(pkg)}`
    );
    return data.downloads ?? 0;
  } catch {
    return 0;
  }
}

export async function getDailyDownloads(pkg: string): Promise<{ day: string; downloads: number }[]> {
  try {
    const data = await npmFetch<{ downloads: { day: string; downloads: number }[] }>(
      `${NPM_DOWNLOADS}/downloads/range/last-month/${encodeURIComponent(pkg)}`
    );
    return data.downloads ?? [];
  } catch {
    return [];
  }
}

export type NpmPackageMetadata = {
  name: string;
  description: string;
  license: string;
  maintainers: { name: string }[];
  versionsCount: number;
  latestVersion: string;
  repositoryUrl: string | null;
  createdAt: string;
  lastPublish: string;
  hasInstallScripts: boolean;
  dependencyCount: number;
};

type NpmVersionDoc = {
  version?: string;
  description?: string;
  license?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  repository?: { type?: string; url?: string } | string;
};

type NpmRegistryDoc = {
  name?: string;
  description?: string;
  license?: string;
  "dist-tags"?: Record<string, string>;
  versions?: Record<string, NpmVersionDoc>;
  maintainers?: { name: string; email?: string }[];
  time?: Record<string, string>;
  repository?: { type?: string; url?: string } | string;
};

export async function getPackageMetadata(pkg: string): Promise<NpmPackageMetadata> {
  const data = await npmFetch<NpmRegistryDoc>(
    `${NPM_REGISTRY}/${encodeURIComponent(pkg)}`
  );

  const latestVersion = data["dist-tags"]?.latest ?? "";
  const versionDoc: NpmVersionDoc = data.versions?.[latestVersion] ?? {};

  const deps: Record<string, string> = {
    ...(versionDoc.dependencies ?? {}),
    ...(versionDoc.peerDependencies ?? {}),
    ...(versionDoc.optionalDependencies ?? {}),
  };

  const INSTALL_SCRIPT_KEYS = ["preinstall", "install", "postinstall"];
  const hasInstallScripts = INSTALL_SCRIPT_KEYS.some(
    (k) => versionDoc.scripts?.[k] !== undefined
  );

  let repositoryUrl: string | null = null;
  const repoField = data.repository ?? versionDoc.repository;
  if (repoField) {
    const raw = typeof repoField === "string" ? repoField : (repoField.url ?? "");
    repositoryUrl = raw
      .replace(/^git\+/, "")
      .replace(/\.git$/, "")
      .replace(/^git:\/\/github\.com/, "https://github.com");
    if (!repositoryUrl.startsWith("http")) repositoryUrl = null;
  }

  return {
    name: data.name ?? pkg,
    description: data.description ?? versionDoc.description ?? "",
    license: data.license ?? (typeof versionDoc.license === "string" ? versionDoc.license : "") ?? "",
    maintainers: (data.maintainers ?? []).map((m) => ({ name: m.name ?? "" })),
    versionsCount: Object.keys(data.versions ?? {}).length,
    latestVersion,
    repositoryUrl,
    createdAt: data.time?.created ?? "",
    lastPublish: data.time?.modified ?? "",
    hasInstallScripts,
    dependencyCount: Object.keys(deps).length,
  };
}
