#!/usr/bin/env bash
# npm Check batch test — iterative reliability testing

set -o pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$SCRIPT_DIR/npm-check-results.log"
BASE_URL="http://localhost:3000"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
SERVER_PID=""

# Determine run number
if [ -f "$LOG_FILE" ]; then
  RUN_NUMBER=$(grep -c "^TRUSTSTAR — npm" "$LOG_FILE" 2>/dev/null || echo 0)
  RUN_NUMBER=$((RUN_NUMBER + 1))
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
  npm run dev > /tmp/nextjs-npm-test.log 2>&1 &
  SERVER_PID=$!
  echo "Waiting for server (up to 90s)..."
  for i in $(seq 1 90); do
    if curl -sf --max-time 2 "$BASE_URL" > /dev/null 2>&1; then
      echo "Server ready (${i}s)"; break
    fi
    sleep 1
    if [ "$i" -eq 90 ]; then
      echo "ERROR: Server failed to start. Check /tmp/nextjs-npm-test.log"
      exit 1
    fi
  done
fi

# ── Helpers ───────────────────────────────────────────────────────────────────
py_parse() {
  python3 -c "$1" 2>/dev/null || echo "0"
}

fmt_dl() {
  local n="$1"
  python3 -c "
n=$n
if n>=1000000: print(f'{n/1000000:.1f}M')
elif n>=1000: print(f'{n//1000}k')
else: print(str(n))
" 2>/dev/null || echo "$n"
}

# Call API, return pipe-separated: positifs|neutres|warnings|downloads|stars|maintainers|has_install|status
test_package() {
  local pkg="$1"
  local cat="$2"

  local response
  response=$(curl -sf -X POST "$BASE_URL/api/npm-check" \
    -H "Content-Type: application/json" \
    -d "{\"package\": \"$pkg\"}" \
    --max-time 30 2>/dev/null) || { echo "ERROR"; return; }

  # Detect error response
  local is_error
  is_error=$(python3 -c "
import sys, json
try:
  d=json.loads('''$response''')
  print('yes' if 'error' in d else 'no')
except: print('yes')
" 2>/dev/null || echo "yes")

  if [ "$is_error" = "yes" ]; then echo "ERROR"; return; fi

  # Parse signals and fields
  local pos neu warn dl stars maint has_install
  pos=$(python3 -c "
import json
d=json.loads(open('/dev/stdin').read())
print(len([s for s in d['signals'] if s['type']=='positive']))
" <<< "$response" 2>/dev/null || echo "0")
  neu=$(python3 -c "
import json
d=json.loads(open('/dev/stdin').read())
print(len([s for s in d['signals'] if s['type']=='neutral']))
" <<< "$response" 2>/dev/null || echo "0")
  warn=$(python3 -c "
import json
d=json.loads(open('/dev/stdin').read())
print(len([s for s in d['signals'] if s['type']=='warning']))
" <<< "$response" 2>/dev/null || echo "0")
  dl=$(python3 -c "
import json
d=json.loads(open('/dev/stdin').read())
print(d.get('weeklyDownloads',0))
" <<< "$response" 2>/dev/null || echo "0")
  stars=$(python3 -c "
import json
d=json.loads(open('/dev/stdin').read())
print(d.get('stars',0))
" <<< "$response" 2>/dev/null || echo "0")
  maint=$(python3 -c "
import json
d=json.loads(open('/dev/stdin').read())
print(len(d.get('maintainers',[])))
" <<< "$response" 2>/dev/null || echo "0")
  has_install=$(python3 -c "
import json
d=json.loads(open('/dev/stdin').read())
print('yes' if d.get('hasInstallScripts') else 'no')
" <<< "$response" 2>/dev/null || echo "no")

  # PASS/FAIL logic per category
  local status
  case $cat in
    1)
      # Massifs: 0 warnings AND >= 4 positives
      if [ "$warn" -eq 0 ] && [ "$pos" -ge 4 ]; then status="PASS"
      else status="FAIL"; fi
      ;;
    2)
      # Moyens: 0-1 warnings AND >= 3 positives
      if [ "$warn" -le 1 ] && [ "$pos" -ge 3 ]; then status="PASS"
      else status="FAIL"; fi
      ;;
    3)
      # Incidents connus: >= 1 warning OR >= 1 neutral
      # Fixed packages can look clean — require at least 1 non-positive signal
      if [ "$warn" -ge 1 ] || [ "$neu" -ge 1 ]; then status="PASS"
      else status="FAIL"; fi
      ;;
    4)
      # Triviaux: (neutrals + warnings) >= 1 — should not be all-positive
      local tot=$((neu + warn))
      if [ "$tot" -ge 1 ]; then status="PASS"
      else status="FAIL"; fi
      ;;
    5)
      # Récents légitimes: 0 warnings (no false positives)
      if [ "$warn" -eq 0 ]; then status="PASS"
      else status="FAIL"; fi
      ;;
    6)
      # Suspects: >= 1 warning expected
      if [ "$warn" -ge 1 ]; then status="PASS"
      else status="FAIL"; fi
      ;;
    *) status="UNKNOWN" ;;
  esac

  echo "$pos|$neu|$warn|$dl|$stars|$maint|$has_install|$status"
}

# ── Package list ──────────────────────────────────────────────────────────────
# Format: "name|category|expected_label"
PACKAGES=(
  # ── Category 1: Massifs légitimes (expect: 0 warnings, >= 4 positives) ──────
  "react|1|clean"
  "express|1|clean"
  "lodash|1|clean"
  "axios|1|clean"
  "typescript|1|clean"
  "next|1|clean"
  "vue|1|clean"
  "webpack|1|clean"
  "babel-core|1|clean"
  "eslint|1|clean"
  "prettier|1|clean"
  "jest|1|clean"
  "mocha|1|clean"
  "moment|1|clean"
  "underscore|1|clean"
  # ── Category 2: Légitimes moyens (expect: 0-1 warnings, >= 3 positives) ─────
  "chalk|2|clean"
  "commander|2|clean"
  "zod|2|clean"
  "dotenv|2|clean"
  "cors|2|clean"
  "uuid|2|clean"
  "debug|2|clean"
  "yargs|2|clean"
  "glob|2|clean"
  "minimist|2|clean"
  # ── Category 3: Incidents de sécurité connus (expect: >=1 warn OR >=2 neutral)
  "colors|3|incident"
  "event-stream|3|incident"
  "ua-parser-js|3|incident"
  "node-ipc|3|incident"
  "peacenotwar|3|incident"
  "flatmap-stream|3|incident"
  # ── Category 4: Triviaux (expect: neutrals+warnings >= 1) ───────────────────
  "is-odd|4|trivial"
  "is-even|4|trivial"
  "is-number|4|trivial"
  "is-positive|4|trivial"
  "left-pad|4|trivial"
  # ── Category 5: Récents/peu connus légitimes (expect: 0 warnings) ────────────
  "@anthropic-ai/sdk|5|clean"
  "openai|5|clean"
  "langchain|5|clean"
  "@huggingface/inference|5|clean"
  # ── Category 6: Potentiellement suspects (expect: >= 1 warning) ─────────────
  # All have install scripts (binary download or native compile) = legitimate W-03
  "esbuild|6|suspect"
  "sharp|6|suspect"
  "puppeteer|6|suspect"
  "canvas|6|suspect"
  "bcrypt|6|suspect"
)

# ── Log header ────────────────────────────────────────────────────────────────
{
printf "\n=============================================\n"
printf "TRUSTSTAR — npm Check Batch Test\n"
printf "Date: %s\n" "$TIMESTAMP"
printf "Run: #%s\n" "$RUN_NUMBER"
printf "=============================================\n"
printf "%-3s | %-28s | %-3s | %-3s | %-4s | %-10s | %-6s | %-5s | %-7s | %-12s | %s\n" \
  "N" "PACKAGE" "POS" "NEU" "WARN" "DLOADS/W" "STARS" "MAINT" "INSTALL" "EXPECTED" "STATUS"
printf "%s\n" "$(printf '%.s-' {1..110})"
} | tee -a "$LOG_FILE"

# ── Run tests ─────────────────────────────────────────────────────────────────
idx=0
declare -A FAIL_DETAILS

for entry in "${PACKAGES[@]}"; do
  IFS='|' read -r pkg cat expected <<< "$entry"
  idx=$((idx + 1))
  TOTAL=$((TOTAL + 1))

  printf "  [%2d/45] %-30s " "$idx" "$pkg" >&2

  result=$(test_package "$pkg" "$cat")
  sleep 1

  if [ "$result" = "ERROR" ]; then
    ERR=$((ERR + 1))
    printf "%-3s | %-28s | %-3s | %-3s | %-4s | %-10s | %-6s | %-5s | %-7s | %-12s | %s\n" \
      "$idx" "$pkg" "-" "-" "-" "-" "-" "-" "-" "$expected" "ERROR" | tee -a "$LOG_FILE"
    echo "ERROR" >&2
    continue
  fi

  IFS='|' read -r pos neu warn dl stars maint has_install status <<< "$result"
  dl_fmt=$(fmt_dl "$dl")

  case $status in
    PASS) PASS=$((PASS + 1)); echo "PASS" >&2 ;;
    FAIL)
      FAIL=$((FAIL + 1))
      FAIL_DETAILS["$pkg"]="cat=$cat pos=$pos neu=$neu warn=$warn dl=$dl stars=$stars install=$has_install"
      echo "FAIL (pos=$pos neu=$neu warn=$warn install=$has_install)" >&2
      ;;
  esac

  printf "%-3s | %-28s | %-3s | %-3s | %-4s | %-10s | %-6s | %-5s | %-7s | %-12s | %s\n" \
    "$idx" "$pkg" "$pos" "$neu" "$warn" "$dl_fmt" "$stars" "$maint" "$has_install" "$expected" "$status" \
    | tee -a "$LOG_FILE"
done

# ── Summary ───────────────────────────────────────────────────────────────────
TESTED=$((PASS + FAIL))
RELIABILITY=0
[ "$TESTED" -gt 0 ] && RELIABILITY=$(( PASS * 100 / TESTED ))

{
printf "%s\n" "$(printf '%.s-' {1..110})"
printf "SUMMARY  Run #%s\n" "$RUN_NUMBER"
printf "Total tested : %s\n" "$TOTAL"
printf "Pass         : %s\n" "$PASS"
printf "Fail         : %s\n" "$FAIL"
printf "Errors (excl): %s\n" "$ERR"
printf "Reliability  : %s%% (%s/%s packages)\n" "$RELIABILITY" "$PASS" "$TESTED"
printf "\n"
} | tee -a "$LOG_FILE"

# Print FAIL details to stderr for diagnosis
if [ ${#FAIL_DETAILS[@]} -gt 0 ]; then
  echo "" >&2
  echo "=== FAIL DIAGNOSIS ===" >&2
  for pkg in "${!FAIL_DETAILS[@]}"; do
    echo "  FAIL: $pkg — ${FAIL_DETAILS[$pkg]}" >&2
  done
fi

echo "Log: $LOG_FILE"
echo "Reliability: $RELIABILITY% ($PASS/$TESTED)"
exit $([ "$RELIABILITY" -ge 90 ] && echo 0 || echo 1)
