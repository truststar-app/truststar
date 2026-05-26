import type { SkillFile, SkillFinding } from "../types";

const SENSITIVE_PATHS_CRITICAL = [
  { pattern: /~\/\.ssh|\.ssh\//i, label: "~/.ssh" },
  { pattern: /~\/\.aws|\.aws\//i, label: "~/.aws" },
  { pattern: /\/etc\/passwd/i, label: "/etc/passwd" },
  { pattern: /\/etc\/shadow/i, label: "/etc/shadow" },
];

const SENSITIVE_PATHS_HIGH = [
  { pattern: /~\/\.docker|\.docker\//i, label: "~/.docker" },
  { pattern: /~\/\.kube|\.kube\//i, label: "~/.kube" },
  { pattern: /~\/\.env\b/i, label: "~/.env" },
  { pattern: /~\/\.gitconfig/i, label: "~/.gitconfig" },
  { pattern: /~\/\.gnupg|\.gnupg\//i, label: "~/.gnupg" },
  { pattern: /~\/\.npmrc/i, label: "~/.npmrc" },
  { pattern: /~\/\.pypirc/i, label: "~/.pypirc" },
  { pattern: /~\/\.bashrc/i, label: "~/.bashrc" },
  { pattern: /~\/\.zshrc/i, label: "~/.zshrc" },
  // Specific shell history file paths only (not the generic word "history")
  { pattern: /\.(?:bash|zsh|sh|fish)_history\b|HISTFILE\b/, label: "shell history" },
];

const SENSITIVE_PATHS_MEDIUM = [
  { pattern: /~\/\.config/i, label: "~/.config" },
];

// For JS/TS: require a file-access or command-execution keyword on the same line.
// This prevents false positives from pattern-definition code that contains the paths as data.
const JS_FILE_ACCESS_CONTEXT =
  /\b(?:readFile|writeFile|readdir|appendFile|openFile|createReadStream|createWriteStream|fs\s*\.|exec(?:Sync)?|spawn|child_process)\b/i;

const SECRET_ENV_REGEX =
  /process\.env\.(?:.*(?:TOKEN|SECRET|KEY|PASSWORD|CREDENTIALS|API_KEY|PRIVATE))/i;
const SECRET_OS_ENV_REGEX =
  /os\.environ(?:\.get)?\s*\(\s*['"][^'"]*(?:TOKEN|SECRET|KEY|PASSWORD)[^'"]*['"]/i;

export function analyzeFilesystem(files: SkillFile[]): SkillFinding[] {
  const findings: SkillFinding[] = [];
  let counter = 1;

  function id(): string {
    return `FS-${String(counter++).padStart(3, "0")}`;
  }

  for (const file of files) {
    const lines = file.content.split("\n");
    const ext = file.path.split(".").pop()?.toLowerCase() ?? "";
    const isJS = ext === "js" || ext === "ts";
    const isPy = ext === "py";
    const isSh = ext === "sh" || file.path.endsWith(".sh");

    // Per-file dedup tracking
    const seenCriticalPaths = new Set<string>();
    const seenHighPaths = new Set<string>();
    const seenMediumPaths = new Set<string>();
    let hasEnvFinding = false;
    let hasPyEnvFinding = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("//")) {
        continue;
      }

      // For JS/TS: only flag sensitive paths when there's a file-access context on the same line.
      // Shell and Python scripts are checked unconditionally (their syntax is direct enough).
      const requiresContext = isJS && !isSh;
      const hasContext = !requiresContext || JS_FILE_ACCESS_CONTEXT.test(line);

      if (hasContext) {
        // Check critical sensitive paths
        for (const { pattern, label } of SENSITIVE_PATHS_CRITICAL) {
          if (pattern.test(line) && !seenCriticalPaths.has(label)) {
            seenCriticalPaths.add(label);
            findings.push({
              id: id(),
              severity: "CRITICAL",
              category: "filesystem",
              title: `Access to sensitive path ${label}`,
              description: `The code accesses ${label}, a directory containing critical keys or secrets.`,
              file: file.path,
              line: lineNum,
              evidence: trimmed.slice(0, 200),
              recommendation: `Remove all access to ${label}. Use environment variables instead.`,
            });
            break;
          }
        }

        // Check high sensitive paths
        for (const { pattern, label } of SENSITIVE_PATHS_HIGH) {
          if (pattern.test(line) && !seenHighPaths.has(label)) {
            seenHighPaths.add(label);
            findings.push({
              id: id(),
              severity: "HIGH",
              category: "filesystem",
              title: `Access to sensitive configuration file ${label}`,
              description: `The code accesses ${label}, which may contain credentials or sensitive configurations.`,
              file: file.path,
              line: lineNum,
              evidence: trimmed.slice(0, 200),
              recommendation: `Justify access to ${label} in SKILL.md.`,
            });
            break;
          }
        }

        // Check medium sensitive paths
        for (const { pattern, label } of SENSITIVE_PATHS_MEDIUM) {
          if (pattern.test(line) && !seenMediumPaths.has(label)) {
            seenMediumPaths.add(label);
            findings.push({
              id: id(),
              severity: "MEDIUM",
              category: "filesystem",
              title: `Access to configuration directory ${label}`,
              description: `The code accesses ${label}, which may contain application configurations.`,
              file: file.path,
              line: lineNum,
              evidence: trimmed.slice(0, 200),
              recommendation: `Document why access to ${label} is necessary.`,
            });
            break;
          }
        }
      }

      // Secrets via env vars — reading API keys from env is good practice → INFO
      if (isJS && SECRET_ENV_REGEX.test(line) && !hasEnvFinding) {
        hasEnvFinding = true;
        findings.push({
          id: id(),
          severity: "INFO",
          category: "filesystem",
          title: "Reads API credentials from environment",
          description:
            "The code reads credentials from environment variables (token, key, secret).",
          file: file.path,
          line: lineNum,
          evidence: trimmed.slice(0, 200),
          recommendation:
            "This is a recommended practice for secret management.",
        });
      }

      if (isPy && SECRET_OS_ENV_REGEX.test(line) && !hasPyEnvFinding) {
        hasPyEnvFinding = true;
        findings.push({
          id: id(),
          severity: "INFO",
          category: "filesystem",
          title: "Reads API credentials from environment (Python)",
          description:
            "The Python code reads credentials from environment variables.",
          file: file.path,
          line: lineNum,
          evidence: trimmed.slice(0, 200),
          recommendation:
            "This is a recommended practice for secret management.",
        });
      }

      // File write operations
      if (isJS) {
        if (/\bfs\.writeFile\b|\bfs\.appendFile\b/.test(line)) {
          findings.push({
            id: id(),
            severity: "MEDIUM",
            category: "filesystem",
            title: "File write",
            description:
              "The code writes or modifies files on the user's system.",
            file: file.path,
            line: lineNum,
            evidence: trimmed.slice(0, 200),
            recommendation:
              "Document the written files and their paths in SKILL.md.",
          });
          continue;
        }

        if (/\bfs\.readFile\b|\bfs\.readdir\b/.test(line)) {
          findings.push({
            id: id(),
            severity: "INFO",
            category: "filesystem",
            title: "File read",
            description: "The code reads files or directories.",
            file: file.path,
            line: lineNum,
            evidence: trimmed.slice(0, 200),
            recommendation: "Verify that only expected files are read.",
          });
          continue;
        }
      }

      if (isPy) {
        if (/\bshutil\./.test(line)) {
          findings.push({
            id: id(),
            severity: "LOW",
            category: "filesystem",
            title: "File operation via shutil (Python)",
            description:
              "shutil is used for file operations (copy, move, delete).",
            file: file.path,
            line: lineNum,
            evidence: trimmed.slice(0, 200),
            recommendation: "Document the file operations performed.",
          });
          continue;
        }

        if (/\bopen\(/.test(line)) {
          findings.push({
            id: id(),
            severity: "LOW",
            category: "filesystem",
            title: "File open (Python)",
            description: "The code opens a file for reading or writing.",
            file: file.path,
            line: lineNum,
            evidence: trimmed.slice(0, 200),
            recommendation: "Verify that the path is safe and documented.",
          });
          continue;
        }
      }

      if (isSh) {
        if (/\brm\s+-rf\b/.test(line) || /\bchmod\s+777\b/.test(line) || /\bchown\b/.test(line)) {
          const isRmRf = /\brm\s+-rf\b/.test(line);
          findings.push({
            id: id(),
            severity: "HIGH",
            category: "filesystem",
            title: isRmRf
              ? "Recursive file deletion"
              : "Permissions or ownership modification",
            description: isRmRf
              ? "rm -rf is an irreversible destructive operation."
              : "Modifying the permissions or owner of a file.",
            file: file.path,
            line: lineNum,
            evidence: trimmed.slice(0, 200),
            recommendation: isRmRf
              ? "Limit rm -rf to strict, documented paths."
              : "Avoid chmod 777 — use minimal permissions.",
          });
          continue;
        }

        if (/\brm\s+/.test(line)) {
          findings.push({
            id: id(),
            severity: "MEDIUM",
            category: "filesystem",
            title: "File deletion via rm",
            description: "A file is deleted via the rm command.",
            file: file.path,
            line: lineNum,
            evidence: trimmed.slice(0, 200),
            recommendation:
              "Document the deleted files and ensure they belong to the skill.",
          });
          continue;
        }
      }
    }
  }

  return findings;
}
