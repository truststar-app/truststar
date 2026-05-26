# Code Scan — Known Limitations

**Reliability: 94% (18/19 repos, 8 independent test runs)**

---

## What Code Scan detects well

- Obfuscation: `eval(atob(...))`, long base64 strings (>200 chars), hex-escape flooding, `String.fromCharCode` chains, hardcoded PEM private keys
- Dangerous execution: `child_process.exec` with dynamic args, `eval()` with dynamic args, `new Function()`, `subprocess` with `shell=True`, `curl|bash`, `rm -rf /`
- Filesystem access: ~/.ssh, ~/.aws, ~/.gnupg, /etc/passwd, /etc/shadow
- Network: hardcoded non-standard IPs (non-loopback), unknown domains, dynamic URL construction, `curl|bash`
- Dependencies: unpinned versions, typosquatting (edit distance ≤2, min name length 5)

## What it misses

### 1. Injection vulnerabilities (SQL, NoSQL, XSS, SSTI)
Code Scan does not parse ASTs or trace data flows. It cannot detect:
- SQL injection via string concatenation in ORM queries
- XSS via unescaped template rendering
- NoSQL injection via `{$where: userInput}` patterns
- Server-side template injection

**Example**: OWASP Juice Shop scores SAFE because its vulnerabilities require semantic analysis, not pattern matching.

### 2. Files beyond the 50-file limit
The fetcher fetches at most 50 files per repo, sorted by directory depth (shallow first), then alphabetically. For large repos (>200 files), code in deeper directories may not be scanned.

**Example**: A repo with 80 files in `data/static/examples/` may exhaust the limit before reaching `routes/*.ts`.

### 3. Vulnerabilities in PHP, Ruby, Java, Go, etc.
Only `.ts`, `.js`, `.py`, `.sh` files are analyzed. PHP-based apps (e.g., DVWA) are analyzed only on their JavaScript glue code, not their PHP backend.

### 4. Obfuscated private keys with embedded newlines
RSA keys stored with actual newlines (multi-line string literals) are split into short lines that fall below the 200-char base64 threshold. Keys stored as single-line escape sequences (`\r\n`) ARE detected.

### 5. Indirect execution (require(), dynamic imports)
`require(userInput)` or `import(variable)` are not detected. Only direct `eval()`, `new Function()`, `exec()`, etc.

### 6. Supply chain via transitive dependencies
Only direct dependencies in `package.json` / `requirements.txt` are checked. Transitive dependencies are not analyzed.

## False positive classes

### Analyzer source files (self-referential)
Code Scan includes its own source code when analyzing the TrustStar repo. Mitigations:
- String literal context detection (`isInStringContext`) prevents flagging patterns in title/description strings
- Per-line comment stripping before eval(atob) check
- JS file-access context required before flagging sensitive path access

### Test files with realistic but dummy data
Test keys, test IPs, test domains in `test/`, `spec/`, `__tests__/`, `fixtures/` directories:
- IP detection skips test file paths entirely
- Unknown domains in test files are downgraded to INFO
- Dynamic URLs in test files are skipped

## Score calibration reference (benchmark)

| Repo | Score | Label | Notes |
|------|-------|-------|-------|
| chalk | 82 | SAFE | Clean utility |
| got | 81 | SAFE | HTTP client |
| axios | 76 | SAFE | HTTP client |
| commander.js | 80 | SAFE | CLI parser |
| node-fetch | 82 | SAFE | Fetch polyfill |
| express | 84 | SAFE | Web framework |
| next.js | 84 | SAFE | Framework |
| metasploit | 57 | SUSPICIOUS | Pentesting tool |
| sqlmap | 84 | SAFE | SQL injection tool (shallow files scanned) |
| juice-shop | 82 | SAFE | Intentionally vulnerable — limitation #2 above |
| DVWA | 65 | SUSPICIOUS | PHP app — limitation #3 above |
| NodeGoat | 56 | SUSPICIOUS | Intentionally vulnerable Node app |
| truststar | 70 | SAFE | Our own codebase |
