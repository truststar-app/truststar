import type { FetchedSkillData, SkillFile, SkillMetadata } from "./types";

const GITHUB_API_BASE = "https://api.github.com";

const RELEVANT_EXTENSIONS = [
  "SKILL.md",
  ".py",
  ".js",
  ".ts",
  ".sh",
  "package.json",
  "requirements.txt",
  "pyproject.toml",
  "setup.py",
];

const MAX_FILES = 50;
const MAX_FILE_SIZE = 100 * 1024; // 100KB

type GitHubRepoResponse = {
  full_name: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  created_at: string;
  pushed_at: string;
  default_branch: string;
  owner: { login: string };
};

type GitHubUserResponse = {
  login: string;
  created_at: string;
  public_repos: number;
};

type GitHubTreeResponse = {
  tree: Array<{
    path: string;
    type: string;
    size?: number;
    sha: string;
  }>;
  truncated: boolean;
};

type GitHubContentsResponse = {
  content: string;
  encoding: string;
  size: number;
};

async function ghFetch<T>(path: string): Promise<T> {
  const token = process.env.GITHUB_TOKEN;
  const url = `${GITHUB_API_BASE}${path}`;

  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, { headers, next: { revalidate: 300 } });

  if (response.status === 404) {
    throw new Error(`GitHub resource not found: ${path}`);
  }

  if (response.status === 403) {
    const remaining = response.headers.get("X-RateLimit-Remaining");
    if (remaining === "0") {
      throw new Error("GitHub API rate limit exceeded");
    }
    throw new Error(`GitHub API forbidden: ${path}`);
  }

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub API error ${response.status} on ${path}: ${body}`);
  }

  return response.json() as Promise<T>;
}

function parseInput(input: string): { owner: string; repo: string } {
  // Handle full GitHub URLs
  const urlMatch = input.match(/github\.com\/([^/]+)\/([^/\s?#]+)/);
  if (urlMatch) {
    return {
      owner: urlMatch[1],
      repo: urlMatch[2].replace(/\.git$/, ""),
    };
  }

  // Handle owner/repo slug
  const slugMatch = input.trim().match(/^([^/\s]+)\/([^/\s]+)$/);
  if (slugMatch) {
    return {
      owner: slugMatch[1],
      repo: slugMatch[2].replace(/\.git$/, ""),
    };
  }

  throw new Error(`Cannot parse input as GitHub repo: ${input}`);
}

function isRelevantFile(path: string): boolean {
  const filename = path.split("/").pop() ?? "";

  // Only fetch root-level SKILL.md — nested ones waste file slots in large repos
  if (path === "SKILL.md") return true;
  if (filename === "package.json") return true;
  if (filename === "requirements.txt") return true;
  if (filename === "pyproject.toml") return true;
  if (filename === "setup.py") return true;

  for (const ext of [".py", ".js", ".ts", ".sh"]) {
    if (filename.endsWith(ext)) return true;
  }

  return false;
}

function buildMetadata(
  owner: string,
  files: SkillFile[],
  repoInfo: GitHubRepoResponse,
  authorInfo: GitHubUserResponse
): SkillMetadata {
  const filePaths = files.map((f) => f.path);
  const totalLinesOfCode = files.reduce(
    (sum, f) => sum + f.content.split("\n").length,
    0
  );

  const authorCreatedAt = new Date(authorInfo.created_at);
  const now = new Date();
  const authorAccountAge = Math.floor(
    (now.getTime() - authorCreatedAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  const skillMdFile = files.find(
    (f) =>
      f.path.toUpperCase() === "SKILL.MD" ||
      f.path.toUpperCase().endsWith("/SKILL.MD")
  );
  const hasSkillMd = !!skillMdFile;
  const skillContent = skillMdFile?.content ?? "";

  // Extract name from SKILL.md frontmatter or fall back to repo name
  const nameMatch = skillContent.match(/^name:\s*(.+)$/m);
  const descMatch = skillContent.match(/^description:\s*(.+)$/m);

  return {
    name: nameMatch ? nameMatch[1].trim() : repoInfo.full_name.split("/")[1],
    description: descMatch
      ? descMatch[1].trim()
      : repoInfo.description ?? "",
    author: owner,
    authorAccountAge,
    authorPublicRepos: authorInfo.public_repos,
    files: filePaths,
    hasSkillMd,
    hasInstallerScript: filePaths.some(
      (p) =>
        p.includes("install") &&
        (p.endsWith(".sh") || p.endsWith(".py") || p.endsWith(".js"))
    ),
    hasBashScripts: filePaths.some((p) => p.endsWith(".sh")),
    hasPythonScripts: filePaths.some((p) => p.endsWith(".py")),
    hasNodeScripts:
      filePaths.some((p) => p.endsWith(".js") || p.endsWith(".ts")) ||
      filePaths.includes("package.json"),
    totalLinesOfCode,
    lastCommitDate: repoInfo.pushed_at,
    stars: repoInfo.stargazers_count,
    forks: repoInfo.forks_count,
  };
}

export async function fetchSkillData(input: string): Promise<FetchedSkillData> {
  const { owner, repo } = parseInput(input);

  const [repoInfo, authorInfo] = await Promise.all([
    ghFetch<GitHubRepoResponse>(`/repos/${owner}/${repo}`),
    ghFetch<GitHubUserResponse>(`/users/${owner}`),
  ]);

  const treeData = await ghFetch<GitHubTreeResponse>(
    `/repos/${owner}/${repo}/git/trees/${repoInfo.default_branch}?recursive=1`
  );

  const relevantNodes = treeData.tree
    .filter(
      (node) =>
        node.type === "blob" &&
        isRelevantFile(node.path) &&
        (node.size ?? 0) <= MAX_FILE_SIZE
    )
    // Prioritize shallow files (depth = slash count): root and first-level dirs first.
    // Within the same depth, keep alphabetical order.
    .sort((a, b) => {
      const da = (a.path.match(/\//g) ?? []).length;
      const db = (b.path.match(/\//g) ?? []).length;
      if (da !== db) return da - db;
      return a.path.localeCompare(b.path);
    })
    .slice(0, MAX_FILES);

  const fetchedFiles = await Promise.all(
    relevantNodes.map(async (node): Promise<SkillFile | null> => {
      try {
        const data = await ghFetch<GitHubContentsResponse>(
          `/repos/${owner}/${repo}/contents/${node.path}`
        );

        if (data.encoding !== "base64") return null;

        const content = Buffer.from(
          data.content.replace(/\n/g, ""),
          "base64"
        ).toString("utf-8");

        return {
          path: node.path,
          content,
          size: data.size,
        };
      } catch {
        return null;
      }
    })
  );

  const files = fetchedFiles.filter((f): f is SkillFile => f !== null);

  const metadata = buildMetadata(owner, files, repoInfo, authorInfo);

  return {
    owner,
    repo,
    repoUrl: `https://github.com/${owner}/${repo}`,
    files,
    metadata,
    repoInfo: {
      stars: repoInfo.stargazers_count,
      forks: repoInfo.forks_count,
      created_at: repoInfo.created_at,
      pushed_at: repoInfo.pushed_at,
      description: repoInfo.description,
      default_branch: repoInfo.default_branch,
    },
    authorInfo: {
      login: authorInfo.login,
      created_at: authorInfo.created_at,
      public_repos: authorInfo.public_repos,
    },
  };
}
