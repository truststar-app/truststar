import type { SkillFile, SkillFinding } from "../types";

function hasVariableArg(line: string, funcName: string): boolean {
  // Check if the argument to a function is a variable (not a string literal)
  const regex = new RegExp(`${funcName}\\s*\\(\\s*(['"\`])`);
  return !regex.test(line);
}

export function analyzeExecution(files: SkillFile[]): SkillFinding[] {
  const findings: SkillFinding[] = [];
  let counter = 1;

  function id(): string {
    return `EXEC-${String(counter++).padStart(3, "0")}`;
  }

  for (const file of files) {
    const lines = file.content.split("\n");
    const ext = file.path.split(".").pop()?.toLowerCase() ?? "";
    const isJS = ext === "js" || ext === "ts";
    const isPy = ext === "py";
    const isSh = ext === "sh" || file.path.endsWith(".sh");

    // Per-file dedup: track which finding types have been emitted
    const seen = new Set<string>();

    function once(key: string): boolean {
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith("//")) continue;
      if (isSh && trimmed.startsWith("#")) continue;

      if (isJS) {
        // eval() — CRITICAL if with variable, MEDIUM if literal
        if (/\beval\s*\(/.test(line)) {
          const isLiteral = /\beval\s*\(['"`][^'"`]*['"`]\s*\)/.test(line);
          const key = isLiteral ? "eval-literal" : "eval-dynamic";
          if (once(key)) {
            findings.push({
              id: id(),
              severity: isLiteral ? "MEDIUM" : "CRITICAL",
              category: "execution",
              title: isLiteral
                ? "eval() with string literal"
                : "eval() with dynamic argument",
              description: isLiteral
                ? "eval() is used with a string literal — limited risk but discouraged practice."
                : "eval() is used with a dynamic argument — allows arbitrary code execution.",
              file: file.path,
              line: lineNum,
              evidence: trimmed.slice(0, 200),
              recommendation:
                "Avoid eval(). Use JSON.parse() for data or an alternative approach.",
            });
          }
          continue;
        }

        // new Function(
        if (/\bnew\s+Function\s*\(/.test(line) && once("new-function")) {
          findings.push({
            id: id(),
            severity: "HIGH",
            category: "execution",
            title: "new Function() — dynamic code execution",
            description:
              "new Function() creates a function from a string, allowing arbitrary code execution.",
            file: file.path,
            line: lineNum,
            evidence: trimmed.slice(0, 200),
            recommendation: "Avoid new Function(). Refactor to a static approach.",
          });
          continue;
        }

        // child_process.exec / execSync
        if (/\bchild_process\.exec\b|\bexecSync\b/.test(line)) {
          const dyn = hasVariableArg(line, "(?:child_process\\.exec|execSync)");
          const key = dyn ? "exec-dynamic" : "exec-static";
          if (once(key)) {
            findings.push({
              id: id(),
              severity: dyn ? "HIGH" : "MEDIUM",
              category: "execution",
              title: dyn
                ? "child_process.exec with dynamic argument"
                : "child_process.exec with static command",
              description: dyn
                ? "Shell command execution with a non-literal argument — command injection risk."
                : "Shell command execution with a static command.",
              file: file.path,
              line: lineNum,
              evidence: trimmed.slice(0, 200),
              recommendation: dyn
                ? "Sanitize all inputs before passing them to exec(). Prefer spawn() with an argument array."
                : "Document the executed command in SKILL.md.",
            });
          }
          continue;
        }

        // child_process.spawn
        if (/\bchild_process\.spawn\b|\bspawn\s*\(/.test(line) && once("spawn")) {
          findings.push({
            id: id(),
            severity: "MEDIUM",
            category: "execution",
            title: "child_process.spawn — process execution",
            description:
              "A child process is launched via spawn(). Safer than exec() but should be documented.",
            file: file.path,
            line: lineNum,
            evidence: trimmed.slice(0, 200),
            recommendation:
              "Document the launched processes and ensure arguments do not come from unsanitized user input.",
          });
          continue;
        }
      }

      if (isPy) {
        // subprocess with shell=True
        if (
          /\bsubprocess\.run\b|\bsubprocess\.Popen\b/.test(line) &&
          /shell\s*=\s*True/.test(line) &&
          once("subprocess-shell-true")
        ) {
          findings.push({
            id: id(),
            severity: "HIGH",
            category: "execution",
            title: "subprocess with shell=True",
            description:
              "subprocess is called with shell=True, allowing shell command injection.",
            file: file.path,
            line: lineNum,
            evidence: trimmed.slice(0, 200),
            recommendation:
              "Use shell=False with an argument list to prevent command injection.",
          });
          continue;
        }

        // os.system
        if (/\bos\.system\s*\(/.test(line) && once("os-system")) {
          findings.push({
            id: id(),
            severity: "HIGH",
            category: "execution",
            title: "os.system() — shell command execution",
            description:
              "os.system() executes a shell command without argument control.",
            file: file.path,
            line: lineNum,
            evidence: trimmed.slice(0, 200),
            recommendation:
              "Prefer subprocess.run() with shell=False and an argument list.",
          });
          continue;
        }

        // os.popen
        if (/\bos\.popen\s*\(/.test(line) && once("os-popen")) {
          findings.push({
            id: id(),
            severity: "HIGH",
            category: "execution",
            title: "os.popen() — shell command execution",
            description: "os.popen() opens a pipe to a shell command.",
            file: file.path,
            line: lineNum,
            evidence: trimmed.slice(0, 200),
            recommendation: "Prefer subprocess.run() with shell=False.",
          });
          continue;
        }

        // exec() or compile()
        if (/\bexec\s*\(|\bcompile\s*\(/.test(line) && once("exec-compile")) {
          findings.push({
            id: id(),
            severity: "MEDIUM",
            category: "execution",
            title: "exec() or compile() in Python",
            description:
              "exec() or compile() allows dynamic Python code execution.",
            file: file.path,
            line: lineNum,
            evidence: trimmed.slice(0, 200),
            recommendation: "Avoid exec() and compile() with dynamic inputs.",
          });
          continue;
        }

        // __import__ with variable
        if (/\b__import__\s*\(\s*(?!['"])/.test(line) && once("import-dynamic")) {
          findings.push({
            id: id(),
            severity: "CRITICAL",
            category: "execution",
            title: "__import__() with dynamic argument",
            description:
              "__import__() is called with a dynamic argument — allows loading arbitrary modules.",
            file: file.path,
            line: lineNum,
            evidence: trimmed.slice(0, 200),
            recommendation: "Use static imports at the top of the file.",
          });
          continue;
        }
      }

      if (isSh) {
        // curl|bash or wget|sh → CRITICAL, emit per occurrence
        if (
          /curl\s+[^|]+\|\s*(bash|sh)\b/.test(line) ||
          /wget\s+[^|]+\|\s*(bash|sh)\b/.test(line)
        ) {
          findings.push({
            id: id(),
            severity: "CRITICAL",
            category: "execution",
            title: "Remote script execution (curl|bash / wget|sh)",
            description:
              "A script is downloaded and executed directly without integrity verification.",
            file: file.path,
            line: lineNum,
            evidence: trimmed.slice(0, 200),
            recommendation:
              "Download the script, verify its signature/hash, then execute it.",
          });
          continue;
        }

        // rm -rf / or ~
        if (/\brm\s+-rf\s+(\/|~)/.test(line) && once("rm-rf-root")) {
          findings.push({
            id: id(),
            severity: "CRITICAL",
            category: "execution",
            title: "Recursive deletion of root or home directory",
            description:
              "rm -rf / or rm -rf ~ would destroy the entire filesystem or home directory.",
            file: file.path,
            line: lineNum,
            evidence: trimmed.slice(0, 200),
            recommendation: "Remove this command immediately.",
          });
          continue;
        }

        // chmod 777
        if (/\bchmod\s+777\b/.test(line) && once("chmod-777")) {
          findings.push({
            id: id(),
            severity: "MEDIUM",
            category: "execution",
            title: "chmod 777 — overly broad permissions",
            description: "chmod 777 grants all rights to all users.",
            file: file.path,
            line: lineNum,
            evidence: trimmed.slice(0, 200),
            recommendation: "Use minimal permissions (e.g. 755 or 644).",
          });
          continue;
        }

        // dd if=
        if (/\bdd\s+if=/.test(line) && once("dd-if")) {
          findings.push({
            id: id(),
            severity: "HIGH",
            category: "execution",
            title: "Usage of dd",
            description:
              "dd is used to copy raw data — can overwrite partitions or disks.",
            file: file.path,
            line: lineNum,
            evidence: trimmed.slice(0, 200),
            recommendation: "Precisely document the usage of dd.",
          });
          continue;
        }

        // pip install without version pin
        if (/\bpip\s+install\b/.test(line) && !/==/.test(line) && once("pip-unpinned")) {
          findings.push({
            id: id(),
            severity: "MEDIUM",
            category: "execution",
            title: "pip install without pinned version",
            description:
              "Installing a Python package without a pinned version — supply chain attack risk.",
            file: file.path,
            line: lineNum,
            evidence: trimmed.slice(0, 200),
            recommendation: "Pin versions (e.g. pip install requests==2.31.0).",
          });
          continue;
        }

        // Command substitution with variable
        if (
          (/\$\(.*\$\{/.test(line) || /`[^`]*\$[{(]/.test(line)) &&
          once("cmd-substitution-var")
        ) {
          findings.push({
            id: id(),
            severity: "HIGH",
            category: "execution",
            title: "Command substitution with variable",
            description:
              "A shell command is built with an unsanitized variable — injection risk.",
            file: file.path,
            line: lineNum,
            evidence: trimmed.slice(0, 200),
            recommendation: "Sanitize all variables before interpolation.",
          });
          continue;
        }
      }
    }
  }

  return findings;
}
