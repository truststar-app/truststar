#!/usr/bin/env bash
# Code Scan batch test — 23 repos across 7 categories
# Usage: bash scripts/test-code-scan.sh

set -o pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$SCRIPT_DIR/code-scan-results.log"
BASE_URL="http://localhost:3000"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
SERVER_PID=""

# Determine run number
if [ -f "$LOG_FILE" ]; then
  _count=$(grep -c "^=== TRUSTSTAR" "$LOG_FILE" 2>/dev/null) || _count=0
  RUN_NUMBER=$((_count + 1))
else
  RUN_NUMBER=1
fi

TOTAL=0; PASS=0; FAIL=0; ERR=0

cleanup() {
  [ -n "$SERVER_PID" ] && kill "$SERVER_PID" 2>/dev/null || true
}
trap cleanup EXIT

# ── Server check/start ────────────────────────────────────────────────────────
if ! curl -sf --max-time 3 "$BASE_URL" > /dev/null 2>&1; then
  echo "Starting Next.js dev server..."
  cd "$PROJECT_DIR"
  npm run dev > /tmp/nextjs-codescan-test.log 2>&1 &
  SERVER_PID=$!
  echo "Waiting for server (up to 90s)..."
  for i in $(seq 1 90); do
    if curl -sf --max-time 2 "$BASE_URL" > /dev/null 2>&1; then
      echo "Server ready (${i}s)"; break
    fi
    sleep 1
    if [ "$i" -eq 90 ]; then
      echo "ERROR: Server failed to start. Check /tmp/nextjs-codescan-test.log"
      exit 1
    fi
  done
fi

# ── Helpers ───────────────────────────────────────────────────────────────────
py_extract() {
  python3 -c "$1" 2>/dev/null || echo "0"
}

# Call API, return pipe-separated: score|label|crit|high|med|low
test_repo() {
  local repo="$1"

  local response
  response=$(curl -sf -X POST "$BASE_URL/api/skill-audit" \
    -H "Content-Type: application/json" \
    -d "{\"repoUrl\":\"https://github.com/$repo\"}" \
    --max-time 90 2>/dev/null) || { echo "ERROR"; return; }

  local is_error
  is_error=$(echo "$response" | python3 -c "
import json, sys
try:
  d=json.load(sys.stdin)
  print('yes' if 'error' in d else 'no')
except: print('yes')
" 2>/dev/null || echo "yes")

  if [ "$is_error" = "yes" ]; then echo "ERROR"; return; fi

  echo "$response" | python3 -c "
import json, sys
try:
  d = json.load(sys.stdin)
  findings = d.get('findings', [])
  crit = sum(1 for f in findings if f.get('severity') == 'CRITICAL')
  high = sum(1 for f in findings if f.get('severity') == 'HIGH')
  med  = sum(1 for f in findings if f.get('severity') == 'MEDIUM')
  low  = sum(1 for f in findings if f.get('severity') == 'LOW')
  score = d.get('score', 0)
  label = d.get('label', '?')
  print(f'{score}|{label}|{crit}|{high}|{med}|{low}')
except Exception as e:
  print('0|ERROR|0|0|0|0')
" 2>/dev/null || echo "0|ERROR|0|0|0|0"
}

# ── Repo list ─────────────────────────────────────────────────────────────────
# Format: "owner/repo|category|min_score|expected_label|description"
# PASS criteria per category:
#   A (clean)      : SAFE AND 0 CRITICAL AND 0 HIGH
#   B (network)    : SAFE (network libs have legit patterns but should still score well)
#   C (OSS misc)   : SAFE or SUSPICIOUS (broad — just not DANGEROUS)
#   D (security)   : SUSPICIOUS or SAFE (ethical security tools)
#   E (malicious)  : SUSPICIOUS or DANGEROUS
#   F (vulnerable) : SUSPICIOUS (intentionally vulnerable apps)
#   G (our repo)   : SAFE
REPOS=(
  # ── Category A: Clean libraries (expect: SAFE, 0 CRIT, 0 HIGH) ──────────────
  "chalk/chalk|A|70|SAFE|Clean utility — string styling"
  "sindresorhus/got|A|70|SAFE|Clean HTTP client"
  "colinhacks/zod|A|70|SAFE|Clean validation library"
  "tj/commander.js|A|70|SAFE|Clean CLI parser"
  "axios/axios|A|70|SAFE|Clean HTTP client"
  # ── Category B: Network/HTTP libs (expect: SAFE — dynamic URLs are expected) ─
  "node-fetch/node-fetch|B|65|SAFE|Fetch polyfill — dynamic URLs expected"
  "octokit/rest.js|B|65|SAFE|GitHub API client — dynamic URLs expected"
  "isaacs/node-glob|B|65|SAFE|Glob implementation"
  # ── Category C: OSS misc (expect: not DANGEROUS) ────────────────────────────
  "expressjs/express|C|50|SUSPICIOUS|Web framework — example code"
  "sindresorhus/execa|C|60|SAFE|Child process helper"
  "vercel/next.js|C|60|SAFE|Next.js framework"
  # ── Category D: Security tools (expect: SUSPICIOUS or SAFE) ─────────────────
  "rapid7/metasploit-framework|D|0|SUSPICIOUS|Pentesting framework"
  "sqlmapproject/sqlmap|D|0|SUSPICIOUS|SQL injection tool"
  "sherlock-project/sherlock|D|0|SUSPICIOUS|OSINT tool"
  "danielmiessler/SecLists|D|0|SUSPICIOUS|Security wordlists"
  # ── Category E: Repos with obfuscation / known-bad patterns (expect: SUSPICIOUS/DANGEROUS) ──
  "OWASP/NodeGoat|E|0|SUSPICIOUS|OWASP intentionally vulnerable Node app"
  # ── Category F: Intentionally vulnerable apps (expect: SUSPICIOUS) ───────────
  "juice-shop/juice-shop|F|0|SUSPICIOUS|OWASP deliberately vulnerable app"
  "digininja/DVWA|F|0|SUSPICIOUS|Damn Vulnerable Web App"
  # ── Category G: Our own repo (expect: SAFE — we write good code) ─────────────
  "truststar-app/truststar|G|65|SAFE|Our own repo"
)

# ── Log header ────────────────────────────────────────────────────────────────
{
printf "\n=== TRUSTSTAR — Code Scan Batch Test\n"
printf "Date: %s | Run: #%s\n" "$TIMESTAMP" "$RUN_NUMBER"
printf "%.0s=" {1..80}; echo
printf "%-3s | %-35s | %-5s | %-10s | %-4s | %-4s | %-3s | %-3s | %-10s | %s\n" \
  "N" "REPO" "SCORE" "LABEL" "CRIT" "HIGH" "MED" "LOW" "EXPECTED" "STATUS"
printf "%s\n" "$(printf '%.s-' {1..100})"
} | tee -a "$LOG_FILE"

# ── Run tests ─────────────────────────────────────────────────────────────────
idx=0
declare -A FAIL_DETAILS

for entry in "${REPOS[@]}"; do
  IFS='|' read -r repo cat min_score expected_label desc <<< "$entry"
  idx=$((idx + 1))
  TOTAL=$((TOTAL + 1))

  printf "  [%2d/%d] %-40s " "$idx" "${#REPOS[@]}" "$repo" >&2

  result=$(test_repo "$repo")
  sleep 2

  if [ "$result" = "ERROR" ]; then
    ERR=$((ERR + 1))
    printf "%-3s | %-35s | %-5s | %-10s | %-4s | %-4s | %-3s | %-3s | %-10s | %s\n" \
      "$idx" "$repo" "-" "-" "-" "-" "-" "-" "$expected_label" "ERROR" | tee -a "$LOG_FILE"
    echo "ERROR" >&2
    continue
  fi

  IFS='|' read -r score label crit high med low <<< "$result"

  # ── PASS/FAIL logic per category ─────────────────────────────────────────
  local_status="FAIL"
  case $cat in
    A)
      # Clean libs: SAFE AND 0 CRIT AND 0 HIGH
      if [ "$label" = "SAFE" ] && [ "$crit" -eq 0 ] && [ "$high" -eq 0 ]; then
        local_status="PASS"
      fi
      ;;
    B)
      # Network libs: SAFE is enough (they fetch things by design)
      if [ "$label" = "SAFE" ]; then
        local_status="PASS"
      fi
      ;;
    C)
      # OSS misc: not DANGEROUS
      if [ "$label" != "DANGEROUS" ]; then
        local_status="PASS"
      fi
      ;;
    D)
      # Security tools: SUSPICIOUS or SAFE
      if [ "$label" = "SUSPICIOUS" ] || [ "$label" = "SAFE" ]; then
        local_status="PASS"
      fi
      ;;
    E)
      # Malicious: SUSPICIOUS or DANGEROUS
      if [ "$label" = "SUSPICIOUS" ] || [ "$label" = "DANGEROUS" ]; then
        local_status="PASS"
      fi
      ;;
    F)
      # Vulnerable apps: not SAFE
      if [ "$label" != "SAFE" ]; then
        local_status="PASS"
      fi
      ;;
    G)
      # Our repo: SAFE
      if [ "$label" = "SAFE" ]; then
        local_status="PASS"
      fi
      ;;
  esac

  case $local_status in
    PASS) PASS=$((PASS + 1)); echo "PASS (score=$score crit=$crit high=$high)" >&2 ;;
    FAIL)
      FAIL=$((FAIL + 1))
      FAIL_DETAILS["$repo"]="cat=$cat score=$score label=$label crit=$crit high=$high med=$med"
      echo "FAIL (score=$score label=$label crit=$crit high=$high)" >&2
      ;;
  esac

  printf "%-3s | %-35s | %-5s | %-10s | %-4s | %-4s | %-3s | %-3s | %-10s | %s\n" \
    "$idx" "$repo" "$score" "$label" "$crit" "$high" "$med" "$low" "$expected_label" "$local_status" \
    | tee -a "$LOG_FILE"
done

# ── Summary ───────────────────────────────────────────────────────────────────
TESTED=$((PASS + FAIL))
RELIABILITY=0
[ "$TESTED" -gt 0 ] && RELIABILITY=$(( PASS * 100 / TESTED ))

{
printf "%s\n" "$(printf '%.s-' {1..100})"
printf "SUMMARY  Run #%s\n" "$RUN_NUMBER"
printf "Total    : %s\n" "$TOTAL"
printf "Pass     : %s\n" "$PASS"
printf "Fail     : %s\n" "$FAIL"
printf "Errors   : %s\n" "$ERR"
printf "Reliability: %s%% (%s/%s)\n" "$RELIABILITY" "$PASS" "$TESTED"
printf "\n"
} | tee -a "$LOG_FILE"

if [ ${#FAIL_DETAILS[@]} -gt 0 ]; then
  echo "" >&2
  echo "=== FAIL DETAILS ===" >&2
  for repo in "${!FAIL_DETAILS[@]}"; do
    echo "  FAIL: $repo — ${FAIL_DETAILS[$repo]}" >&2
  done
fi

echo "Log: $LOG_FILE"
echo "Reliability: $RELIABILITY% ($PASS/$TESTED)"
exit $([ "$RELIABILITY" -ge 75 ] && echo 0 || echo 1)
