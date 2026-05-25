import type { SkillFile, SkillFinding } from "../types";

const POPULAR_NPM = [
  "react", "react-dom", "next", "express", "lodash", "axios", "moment",
  "webpack", "babel-core", "typescript", "eslint", "prettier", "jest",
  "mocha", "chai", "passport", "mongoose", "sequelize", "knex", "pg",
  "mysql2", "redis", "socket.io", "cors", "helmet", "dotenv", "uuid",
  "chalk", "commander", "inquirer", "yargs", "minimist", "glob", "rimraf",
  "mkdirp", "async", "bluebird", "rxjs", "ramda", "underscore", "jquery",
  "vue", "angular", "svelte", "tailwindcss", "bootstrap", "sass", "less",
  "nodemon", "concurrently",
];

const POPULAR_PIP = [
  "requests", "flask", "django", "numpy", "pandas", "scipy", "matplotlib",
  "scikit-learn", "tensorflow", "pytorch", "keras", "pillow", "sqlalchemy",
  "celery", "redis", "pymongo", "boto3", "paramiko", "cryptography", "pytest",
  "black", "flake8", "mypy", "pydantic", "fastapi", "uvicorn", "aiohttp",
  "httpx", "click", "rich",
];

function levenshtein(a: string, b: string): number {
  // DP algorithm capped at 20x20 for performance
  if (a.length > 20 || b.length > 20) return Math.abs(a.length - b.length) + 1;
  if (a === b) return 0;

  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

function detectTyposquatting(
  pkgName: string,
  popularList: string[]
): string | null {
  const lower = pkgName.toLowerCase();
  for (const popular of popularList) {
    if (lower === popular) return null; // Exact match — not typosquatting
    const dist = levenshtein(lower, popular);
    if (dist <= 2 && dist > 0) {
      return popular;
    }
  }
  return null;
}

function isUnpinnedNpm(version: string): boolean {
  const v = version.trim();
  return (
    v.startsWith("^") ||
    v.startsWith("~") ||
    v === "*" ||
    v === "latest" ||
    v === "x" ||
    v === ""
  );
}

function isUnpinnedPip(spec: string): boolean {
  // Pinned = has ==
  // Not pinned = no ==, or only >=
  return !spec.includes("==");
}

type PackageDeps = Record<string, string>;

function parsePackageJson(content: string): PackageDeps {
  try {
    const parsed = JSON.parse(content) as {
      dependencies?: PackageDeps;
      devDependencies?: PackageDeps;
    };
    return {
      ...(parsed.dependencies ?? {}),
      ...(parsed.devDependencies ?? {}),
    };
  } catch {
    return {};
  }
}

function parseRequirementsTxt(content: string): string[] {
  return content
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#") && !l.startsWith("-"));
}

export function analyzeDependencies(files: SkillFile[]): SkillFinding[] {
  const findings: SkillFinding[] = [];
  let counter = 1;

  function id(): string {
    return `DEP-${String(counter++).padStart(3, "0")}`;
  }

  for (const file of files) {
    const filename = file.path.split("/").pop() ?? "";

    if (filename === "package.json") {
      const deps = parsePackageJson(file.content);
      const entries = Object.entries(deps);

      // Typosquatting check
      for (const [pkg] of entries) {
        const similar = detectTyposquatting(pkg, POPULAR_NPM);
        if (similar) {
          findings.push({
            id: id(),
            severity: "CRITICAL",
            category: "dependencies",
            title: `Potential typosquatting: "${pkg}" looks like "${similar}"`,
            description: `The package "${pkg}" is very similar in spelling to the popular package "${similar}" — possible typosquatting attempt.`,
            file: file.path,
            evidence: `"${pkg}" vs "${similar}" (Levenshtein distance: ${levenshtein(pkg, similar)})`,
            recommendation: `Verify that "${pkg}" is the intended package and not a malicious one.`,
          });
        }
      }

      // Unpinned versions — group into max 3 findings
      const unpinned = entries.filter(([, v]) => isUnpinnedNpm(v));
      if (unpinned.length > 0) {
        const examples = unpinned.slice(0, 5).map(([p, v]) => `${p}@${v}`);
        findings.push({
          id: id(),
          severity: "MEDIUM",
          category: "dependencies",
          title: `${unpinned.length} npm dependency/ies with unpinned version`,
          description: `Some npm dependencies use floating versions (^, ~, *, latest) — supply chain attack risk.`,
          file: file.path,
          evidence: examples.join(", ") + (unpinned.length > 5 ? ` (+${unpinned.length - 5} more)` : ""),
          recommendation:
            "Pin exact versions (e.g. \"react\": \"18.2.0\" without ^ or ~).",
        });
      }

      // Too many dependencies
      if (entries.length > 20) {
        findings.push({
          id: id(),
          severity: "MEDIUM",
          category: "dependencies",
          title: `High number of dependencies (${entries.length})`,
          description:
            "A simple skill with more than 20 dependencies increases the supply chain attack surface.",
          file: file.path,
          evidence: `${entries.length} dependencies declared`,
          recommendation:
            "Minimize the number of dependencies. Check whether some can be replaced by native code.",
        });
      }
    }

    if (filename === "requirements.txt") {
      const specs = parseRequirementsTxt(file.content);

      // Typosquatting check
      for (const spec of specs) {
        const pkgName = spec.split(/[=<>!;[\s]/)[0].trim();
        if (!pkgName) continue;

        const similar = detectTyposquatting(pkgName, POPULAR_PIP);
        if (similar) {
          findings.push({
            id: id(),
            severity: "CRITICAL",
            category: "dependencies",
            title: `Potential typosquatting: "${pkgName}" looks like "${similar}"`,
            description: `The Python package "${pkgName}" is very similar to "${similar}" — possible typosquatting attempt.`,
            file: file.path,
            evidence: `"${pkgName}" vs "${similar}" (Levenshtein distance: ${levenshtein(pkgName, similar)})`,
            recommendation: `Verify that "${pkgName}" is the intended package.`,
          });
        }
      }

      // Unpinned pip packages
      const unpinned = specs.filter((s) => {
        const pkgName = s.split(/[=<>!;[\s]/)[0].trim();
        return pkgName && isUnpinnedPip(s);
      });

      if (unpinned.length > 0) {
        const examples = unpinned.slice(0, 5);
        findings.push({
          id: id(),
          severity: "MEDIUM",
          category: "dependencies",
          title: `${unpinned.length} pip dependency/ies without exact version`,
          description:
            "Some Python dependencies are not pinned to an exact version — supply chain attack risk.",
          file: file.path,
          evidence: examples.join(", ") + (unpinned.length > 5 ? ` (+${unpinned.length - 5} more)` : ""),
          recommendation:
            "Use exact versions in requirements.txt (e.g. requests==2.31.0).",
        });
      }
    }
  }

  return findings;
}
