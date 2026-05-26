import type { SkillFile, SkillFinding } from "../types";

const KNOWN_SAFE_DOMAINS = [
  // Major cloud / API platforms
  "api.github.com", "github.com", "gist.github.com",
  "api.openai.com", "openai.com",
  "api.anthropic.com", "anthropic.com",
  "googleapis.com", "google.com", "accounts.google.com",
  "api.stripe.com", "stripe.com",
  "aws.amazon.com", "amazonaws.com", "s3.amazonaws.com",
  "azure.microsoft.com", "microsoft.com", "login.microsoftonline.com",
  "api.cloudflare.com", "cloudflare.com",
  "api.vercel.com", "vercel.com",
  "digitalocean.com", "digitaloceanspaces.com",
  // CDNs and registries
  "cdn.jsdelivr.net", "cdnjs.cloudflare.com", "unpkg.com",
  "registry.npmjs.org", "npmjs.com",
  "pypi.org", "files.pythonhosted.org",
  "packagist.org", "rubygems.org", "crates.io", "pkg.go.dev",
  "raw.githubusercontent.com",
  // Communication / collaboration
  "api.slack.com", "slack.com",
  "api.twilio.com", "api.sendgrid.com",
  "opencollective.com", "open-collective.com",
  // Documentation and specifications
  "developer.mozilla.org", "docs.github.com",
  "en.wikipedia.org", "wikipedia.org",
  "www.w3.org", "w3.org", "w3c.github.io",
  "whatwg.org", "fetch.spec.whatwg.org", "html.spec.whatwg.org",
  "nodejs.org",
  "tc39.es",
  "ecma-international.org",
  "ietf.org", "tools.ietf.org", "datatracker.ietf.org",
  "web.archive.org", "archive.org",
  // Programming language / framework docs
  "typescriptlang.org", "www.typescriptlang.org",
  "python.org", "docs.python.org",
  "golang.org", "pkg.go.dev",
  "rust-lang.org",
  "reactjs.org", "react.dev",
  "vuejs.org",
  "svelte.dev",
  "nextjs.org",
  "expressjs.com",
  "vitejs.dev",
  "jestjs.io",
  "eslint.org",
  "prettier.io",
  "babeljs.io",
  "webpack.js.org",
  // CI / quality / badges
  "shields.io", "img.shields.io", "badgen.net",
  "travis-ci.org", "travis-ci.com",
  "circleci.com",
  "codecov.io", "coveralls.io",
  "sonarcloud.io",
  "snyk.io",
  "bundlephobia.com", "npmtrends.com",
  // RFC 2606 placeholder domains — commonly used in docs and examples
  "example.com", "example.org", "example.net",
  // HTTP testing tools used in examples
  "httpbin.org", "httpstat.us", "httpbingo.org",
  // Other common reference sites
  "stackoverflow.com", "stackexchange.com",
  "medium.com", "dev.to",
  "discord.com", "discord.gg",
  // Local targets
  "localhost",
];

const HARDCODED_IP_REGEX = /\b(\d{1,3}\.){3}\d{1,3}\b/;
const URL_REGEX = /https?:\/\/([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;

function isSafeDomain(domain: string): boolean {
  const d = domain.toLowerCase();
  return KNOWN_SAFE_DOMAINS.some(
    (safe) => d === safe || d.endsWith(`.${safe}`)
  );
}

function isDynamic(line: string): boolean {
  return (
    /fetch\(`[^`]*\${/.test(line) ||
    /fetch\(\s*\w+\s*\+/.test(line) ||
    /fetch\(\s*baseUrl/.test(line) ||
    /fetch\(\s*url\s*[+)]/.test(line) ||
    /fetch\(\s*\w+Url/.test(line)
  );
}

function isTestFilePath(path: string): boolean {
  return (
    /[\\/](?:test|tests|__tests__|spec|specs|fixtures|__fixtures__|mocks|__mocks__|examples?)[\\/]/.test(path) ||
    /\.(?:test|spec)(?:-d)?\.[jt]sx?$/.test(path) ||
    /[\\/]@types[\\/]/.test(path)
  );
}

type DomainEntry = { count: number; firstLine: number; firstEvidence: string };
type LibEntry = { count: number; firstLine: number };

export function analyzeNetwork(files: SkillFile[]): SkillFinding[] {
  const findings: SkillFinding[] = [];
  let counter = 1;

  function id(): string {
    return `NET-${String(counter++).padStart(3, "0")}`;
  }

  for (const file of files) {
    const lines = file.content.split("\n");
    const ext = file.path.split(".").pop()?.toLowerCase() ?? "";
    const isJS = ext === "js" || ext === "ts";
    const isPy = ext === "py";
    const isSh = ext === "sh" || file.path.endsWith(".sh");

    if (isJS) {
      const domainMap = new Map<string, DomainEntry>();
      const libMap = new Map<string, LibEntry>();
      let wsFirstLine = -1;
      let dynamicUrlEmitted = false; // one finding per file for dynamic URLs

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNum = i + 1;
        const trimmed = line.trim();

        if (!trimmed || trimmed.startsWith("//")) continue;

        // Dynamic URL — one finding per file max, skip test/example files
        if (isDynamic(line)) {
          if (!isTestFilePath(file.path) && !dynamicUrlEmitted) {
            dynamicUrlEmitted = true;
            findings.push({
              id: id(),
              severity: "MEDIUM",
              category: "network",
              title: "Dynamically constructed URL",
              description:
                "A URL is constructed dynamically from a variable — destination cannot be statically audited.",
              file: file.path,
              line: lineNum,
              evidence: trimmed.slice(0, 200),
              recommendation:
                "Document the possible URL destinations in SKILL.md.",
            });
          }
          continue;
        }

        // WebSocket / TCP / UDP → 1 finding per file
        if (/new WebSocket\(|\bnet\.connect\(|\bdgram\./.test(line)) {
          if (wsFirstLine < 0) wsFirstLine = lineNum;
        }

        // HTTP libraries → INFO, deduplicate per lib per file
        if (/\baxios[.(]/.test(line)) {
          const e = libMap.get("axios");
          if (e) e.count++; else libMap.set("axios", { count: 1, firstLine: lineNum });
        }
        if (/\bgot\s*[.(]/.test(line)) {
          const e = libMap.get("got");
          if (e) e.count++; else libMap.set("got", { count: 1, firstLine: lineNum });
        }
        if (/\bhttps?\.(?:get|request)\s*\(/.test(line)) {
          const e = libMap.get("http/https");
          if (e) e.count++; else libMap.set("http/https", { count: 1, firstLine: lineNum });
        }

        // Hardcoded URLs — collect by domain, deduplicate
        for (const match of line.matchAll(URL_REGEX)) {
          const domainMatch = match[0].match(/https?:\/\/([a-zA-Z0-9.-]+)/);
          if (!domainMatch) continue;
          const domain = domainMatch[1].toLowerCase();
          const existing = domainMap.get(domain);
          if (existing) {
            existing.count++;
          } else {
            domainMap.set(domain, { count: 1, firstLine: lineNum, firstEvidence: match[0] });
          }
        }

        // Hardcoded IP → HIGH
        if (HARDCODED_IP_REGEX.test(line)) {
          const ipMatch = line.match(HARDCODED_IP_REGEX);
          if (
            ipMatch &&
            !["127.0.0.1", "0.0.0.0", "255.255.255.255"].includes(ipMatch[0])
          ) {
            findings.push({
              id: id(),
              severity: "HIGH",
              category: "network",
              title: "Hardcoded IP address",
              description:
                "An IP address is hardcoded in the code — impossible to audit and potentially malicious.",
              file: file.path,
              line: lineNum,
              evidence: trimmed.slice(0, 200),
              recommendation:
                "Use a documented domain name rather than a raw IP address.",
            });
          }
        }
      }

      // Emit one finding per domain
      const testFile = isTestFilePath(file.path);
      for (const [domain, { count, firstLine, firstEvidence }] of domainMap) {
        const safe = isSafeDomain(domain);
        // Unknown domains in test/example files are expected — treat as INFO
        const severity = safe ? "INFO" : testFile ? "INFO" : "MEDIUM";
        findings.push({
          id: id(),
          severity,
          category: "network",
          title: safe || testFile
            ? `Network call to ${safe ? "known service" : "domain"} (${domain})`
            : "Hardcoded URL to undocumented domain",
          description: safe
            ? "HTTP call to a documented trusted service."
            : testFile
              ? `URL to "${domain}" in a test or example file.`
              : `A URL pointing to "${domain}" is present in the code — verify it is intentional.`,
          file: file.path,
          line: firstLine,
          evidence:
            count > 1
              ? `${domain} (found ${count} times)`
              : firstEvidence.slice(0, 200),
          recommendation: safe || testFile
            ? "Verify that the URL matches the declared usage."
            : `Document the usage of "${domain}" in SKILL.md.`,
        });
      }

      // Emit one INFO finding per HTTP library
      for (const [lib, { count, firstLine }] of libMap) {
        findings.push({
          id: id(),
          severity: "INFO",
          category: "network",
          title: `Uses HTTP library (${lib})`,
          description: `The ${lib} library is used for HTTP requests — standard practice.`,
          file: file.path,
          line: firstLine,
          evidence: count > 1 ? `${lib} (used ${count} times)` : lib,
          recommendation:
            "Ensure all network destinations are documented in SKILL.md.",
        });
      }

      if (wsFirstLine >= 0) {
        findings.push({
          id: id(),
          severity: "HIGH",
          category: "network",
          title: "Low-level network connection (WebSocket/TCP/UDP)",
          description:
            "A low-level network connection is used — WebSocket, TCP or UDP.",
          file: file.path,
          line: wsFirstLine,
          evidence: lines[wsFirstLine - 1]?.trim().slice(0, 200) ?? "",
          recommendation:
            "Justify the usage and document the target endpoints.",
        });
      }
    }

    if (isPy) {
      let pyStdHttpLine = -1;
      let pyStdHttpCount = 0;
      let pyAsyncLine = -1;
      let pyAsyncCount = 0;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNum = i + 1;
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;

        if (
          /\brequests\.(?:get|post|put|delete|patch|head|request)\s*\(|\burllib\.request/.test(
            line
          )
        ) {
          pyStdHttpCount++;
          if (pyStdHttpLine < 0) pyStdHttpLine = lineNum;
        }

        if (/\bhttpx\.|\baiohttp\./.test(line)) {
          pyAsyncCount++;
          if (pyAsyncLine < 0) pyAsyncLine = lineNum;
        }

        if (HARDCODED_IP_REGEX.test(line)) {
          const ipMatch = line.match(HARDCODED_IP_REGEX);
          if (
            ipMatch &&
            !["127.0.0.1", "0.0.0.0", "255.255.255.255"].includes(ipMatch[0])
          ) {
            findings.push({
              id: id(),
              severity: "HIGH",
              category: "network",
              title: "Hardcoded IP address",
              description: "An IP address is hardcoded in the code.",
              file: file.path,
              line: lineNum,
              evidence: trimmed.slice(0, 200),
              recommendation:
                "Use a documented domain name rather than a raw IP address.",
            });
          }
        }
      }

      if (pyStdHttpLine >= 0) {
        findings.push({
          id: id(),
          severity: "INFO",
          category: "network",
          title: "Uses HTTP library (requests/urllib)",
          description:
            "The requests or urllib library is used for HTTP requests — standard practice.",
          file: file.path,
          line: pyStdHttpLine,
          evidence:
            pyStdHttpCount > 1
              ? `requests/urllib (found ${pyStdHttpCount} times)`
              : "requests/urllib",
          recommendation:
            "Ensure network destinations are documented in SKILL.md.",
        });
      }

      if (pyAsyncLine >= 0) {
        findings.push({
          id: id(),
          severity: "INFO",
          category: "network",
          title: "Uses async HTTP library (httpx/aiohttp)",
          description:
            "An asynchronous HTTP library is used for network requests — standard practice.",
          file: file.path,
          line: pyAsyncLine,
          evidence:
            pyAsyncCount > 1
              ? `httpx/aiohttp (found ${pyAsyncCount} times)`
              : "httpx/aiohttp",
          recommendation:
            "Ensure network destinations are documented in SKILL.md.",
        });
      }
    }

    if (isSh) {
      let curlLine = -1;
      let curlCount = 0;
      let wgetLine = -1;
      let wgetCount = 0;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNum = i + 1;
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;

        // curl|bash or wget|sh → CRITICAL, emit immediately
        if (
          /curl\s+[^|]+\|\s*(bash|sh)\b/.test(line) ||
          /wget\s+[^|]+\|\s*(bash|sh)\b/.test(line)
        ) {
          findings.push({
            id: id(),
            severity: "CRITICAL",
            category: "network",
            title: "Remote script execution via curl|bash or wget|sh",
            description:
              "A script is downloaded and executed directly — extremely dangerous pattern.",
            file: file.path,
            line: lineNum,
            evidence: trimmed.slice(0, 200),
            recommendation:
              "Download the script, verify it, then execute it separately.",
          });
          continue;
        }

        if (/\bcurl\s/.test(line)) {
          curlCount++;
          if (curlLine < 0) curlLine = lineNum;
          continue;
        }

        if (/\bwget\s/.test(line)) {
          wgetCount++;
          if (wgetLine < 0) wgetLine = lineNum;
          continue;
        }

        if (HARDCODED_IP_REGEX.test(line)) {
          const ipMatch = line.match(HARDCODED_IP_REGEX);
          if (
            ipMatch &&
            !["127.0.0.1", "0.0.0.0", "255.255.255.255"].includes(ipMatch[0])
          ) {
            findings.push({
              id: id(),
              severity: "HIGH",
              category: "network",
              title: "Hardcoded IP address",
              description: "An IP address is hardcoded in the code.",
              file: file.path,
              line: lineNum,
              evidence: trimmed.slice(0, 200),
              recommendation:
                "Use a documented domain name rather than a raw IP address.",
            });
          }
        }
      }

      if (curlLine >= 0) {
        findings.push({
          id: id(),
          severity: "MEDIUM",
          category: "network",
          title: "Network request via curl",
          description: "curl is used to make network requests.",
          file: file.path,
          line: curlLine,
          evidence:
            curlCount > 1
              ? `curl (found ${curlCount} times)`
              : lines[curlLine - 1]?.trim().slice(0, 200) ?? "curl",
          recommendation: "Document the network destinations in SKILL.md.",
        });
      }

      if (wgetLine >= 0) {
        findings.push({
          id: id(),
          severity: "MEDIUM",
          category: "network",
          title: "File download via wget",
          description: "wget is used to download remote files.",
          file: file.path,
          line: wgetLine,
          evidence:
            wgetCount > 1
              ? `wget (found ${wgetCount} times)`
              : lines[wgetLine - 1]?.trim().slice(0, 200) ?? "wget",
          recommendation: "Document the download sources in SKILL.md.",
        });
      }
    }
  }

  return findings;
}
