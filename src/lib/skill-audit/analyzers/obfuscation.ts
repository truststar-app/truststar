import type { SkillFile, SkillFinding } from "../types";

const BASE64_PATTERN = /[A-Za-z0-9+/]{50,}={0,2}/g;
const HEX_ESCAPE_PATTERN = /\\x[0-9a-fA-F]{2}/g;
const FROM_CHAR_CODE_PATTERN = /String\.fromCharCode\s*\(([^)]+)\)/g;

export function analyzeObfuscation(files: SkillFile[]): SkillFinding[] {
  const findings: SkillFinding[] = [];
  let counter = 1;

  function id(): string {
    return `OBF-${String(counter++).padStart(3, "0")}`;
  }

  for (const file of files) {
    const ext = file.path.split(".").pop()?.toLowerCase() ?? "";
    const isCodeFile = ["js", "ts", "py", "sh"].includes(ext);

    if (!isCodeFile) continue;

    const lines = file.content.split("\n");
    const isJsTs = ext === "js" || ext === "ts";

    // 1. eval(atob(...)) or eval(Buffer.from(..., 'base64'))
    if (
      /eval\s*\(\s*atob\s*\(/.test(file.content) ||
      /eval\s*\(\s*Buffer\.from\s*\([^)]+,\s*['"]base64['"]\s*\)/.test(file.content)
    ) {
      const lineNum = lines.findIndex(
        (l) =>
          /eval\s*\(\s*atob\s*\(/.test(l) ||
          /eval\s*\(\s*Buffer\.from/.test(l)
      ) + 1;
      findings.push({
        id: id(),
        severity: "CRITICAL",
        category: "obfuscation",
        title: "eval(atob()) or eval(Buffer.from(..., 'base64')) detected",
        description:
          "Base64 code is decoded and executed dynamically — classic technique for hiding malicious code.",
        file: file.path,
        line: lineNum > 0 ? lineNum : undefined,
        evidence: file.content
          .split("\n")
          .find(
            (l) =>
              /eval\s*\(\s*atob\s*\(/.test(l) ||
              /eval\s*\(\s*Buffer\.from/.test(l)
          )
          ?.trim()
          .slice(0, 200) ?? "eval(atob/Buffer.from detected)",
        recommendation:
          "Remove all obfuscated code. Rewrite in plain text with comments.",
      });
    }

    // 2. Long base64 strings and Buffer.from(..., 'base64')
    const base64Matches = [...file.content.matchAll(BASE64_PATTERN)];
    for (const match of base64Matches) {
      const base64Str = match[0];
      const idx = file.content.indexOf(base64Str);
      const lineNum =
        file.content.slice(0, idx).split("\n").length;

      // Check if it's used with Buffer.from or atob
      const surroundingChars = file.content.slice(
        Math.max(0, idx - 30),
        idx + base64Str.length + 10
      );
      const isBufferFrom =
        /Buffer\.from/.test(surroundingChars) ||
        /atob\(/.test(surroundingChars) ||
        /btoa\(/.test(surroundingChars);

      findings.push({
        id: id(),
        severity: isBufferFrom ? "HIGH" : "HIGH",
        category: "obfuscation",
        title: "Long base64 string in code",
        description:
          "A long base64 string is present in the source code — possibly obfuscated code or data.",
        file: file.path,
        line: lineNum,
        evidence: base64Str.slice(0, 80) + (base64Str.length > 80 ? "..." : ""),
        recommendation:
          "Replace with a separate resource file with a clear explanation of its contents.",
      });
      break; // One finding per file to avoid flooding
    }

    // 3. Minified file check (JS/TS only)
    if (isJsTs && lines.length > 0) {
      const avgCharsPerLine = file.content.length / lines.length;
      if (avgCharsPerLine > 500) {
        findings.push({
          id: id(),
          severity: "HIGH",
          category: "obfuscation",
          title: "Minified JavaScript/TypeScript file",
          description:
            "This file appears to be minified or obfuscated (chars/lines ratio > 500). Difficult to audit.",
          file: file.path,
          evidence: `Ratio: ${Math.round(avgCharsPerLine)} chars/line (${lines.length} lines, ${file.content.length} chars)`,
          recommendation:
            "Include the non-minified source code in the repo to allow auditing.",
        });
      }
    }

    // 4. String.fromCharCode with many arguments
    const fromCharMatches = [...file.content.matchAll(FROM_CHAR_CODE_PATTERN)];
    for (const match of fromCharMatches) {
      const args = match[1].split(",");
      if (args.length > 10) {
        const idx = file.content.indexOf(match[0]);
        const lineNum = file.content.slice(0, idx).split("\n").length;
        findings.push({
          id: id(),
          severity: "MEDIUM",
          category: "obfuscation",
          title: "String.fromCharCode with many arguments",
          description:
            "String.fromCharCode with a long list of codes is used to build an obfuscated string.",
          file: file.path,
          line: lineNum,
          evidence: match[0].slice(0, 200),
          recommendation:
            "Replace with a string literal to improve readability and auditability.",
        });
        break; // One per file
      }
    }

    // 5. Massive hex escapes in a single line
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const hexMatches = line.match(HEX_ESCAPE_PATTERN);
      if (hexMatches && hexMatches.length > 8) {
        findings.push({
          id: id(),
          severity: "MEDIUM",
          category: "obfuscation",
          title: "Many hex escapes in a single line",
          description: `${hexMatches.length} hexadecimal escape sequences on a single line — obfuscation pattern.`,
          file: file.path,
          line: i + 1,
          evidence: line.trim().slice(0, 200),
          recommendation:
            "Replace with a readable string.",
        });
        break; // One per file
      }
    }

    // 6. atob( or btoa( standalone usage
    if (/\batob\s*\(|\bbtoa\s*\(/.test(file.content)) {
      // Only report if not already covered by eval(atob(...))
      const hasEvalAtob =
        /eval\s*\(\s*atob\s*\(/.test(file.content);
      if (!hasEvalAtob) {
        const lineIdx = lines.findIndex((l) => /\batob\s*\(|\bbtoa\s*\(/.test(l));
        findings.push({
          id: id(),
          severity: "MEDIUM",
          category: "obfuscation",
          title: "Usage of atob() or btoa()",
          description:
            "Base64 encoding/decoding functions are used in the code.",
          file: file.path,
          line: lineIdx >= 0 ? lineIdx + 1 : undefined,
          evidence:
            lines[lineIdx]?.trim().slice(0, 200) ?? "atob/btoa detected",
          recommendation:
            "Document why base64 encoding is necessary.",
        });
      }
    }
  }

  return findings;
}
