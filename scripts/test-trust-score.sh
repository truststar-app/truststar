#!/bin/bash

# Configuration
API_URL="http://localhost:3000/api/analyze"
LOG_FILE="scripts/trust-score-results.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo "=============================================" > $LOG_FILE
echo "TRUSTSTAR — Trust Score Batch Test" >> $LOG_FILE
echo "Date: $TIMESTAMP" >> $LOG_FILE
echo "API: $API_URL" >> $LOG_FILE
echo "=============================================" >> $LOG_FILE
echo "" >> $LOG_FILE

# Liste des 30 repos à tester
# Format: "owner/repo|catégorie|score_attendu_min|label_attendu"
REPOS=(
  # --- MASSIFS (attendu SAFE 80+) ---
  "facebook/react|massive|80|SAFE"
  "vercel/next.js|massive|75|SAFE"
  "microsoft/vscode|massive|80|SAFE"
  "microsoft/TypeScript|massive|75|SAFE"
  "torvalds/linux|massive|80|SAFE"
  "tensorflow/tensorflow|massive|75|SAFE"
  "golang/go|massive|80|SAFE"
  "rust-lang/rust|massive|80|SAFE"

  # --- MATURES STABLES (attendu SAFE 70+) ---
  "expressjs/express|mature|70|SAFE"
  "lodash/lodash|mature|70|SAFE"
  "axios/axios|mature|70|SAFE"
  "d3/d3|mature|60|SUSPICIOUS"
  "nodejs/node|mature|70|SAFE"
  "vuejs/vue|mature|60|SUSPICIOUS"
  "django/django|mature|70|SAFE"
  "pallets/flask|mature|70|SAFE"
  "fastapi/fastapi|mature|70|SAFE"
  "sveltejs/svelte|mature|70|SAFE"

  # --- MOYENS LÉGITIMES (attendu SAFE 65+) ---
  "chalk/chalk|medium|65|SAFE"
  "colinhacks/zod|medium|65|SAFE"
  "trpc/trpc|medium|65|SAFE"
  "tailwindlabs/tailwindcss|medium|70|SAFE"

  # --- PETITS / NEUFS (attendu NEW) ---
  "truststar-app/truststar|new|0|NEW"

  # --- SUSPECTS / SECURITE (comportement varié attendu) ---
  "AdrMXR/KitHack|suspect|0|SUSPICIOUS"
  "sherlock-project/sherlock|suspect|50|SAFE"
  "Z4nzu/hackingtool|suspect|60|SAFE"
  "rapid7/metasploit-framework|suspect|70|SAFE"
  "sqlmapproject/sqlmap|suspect|65|SAFE"
  "danielmiessler/SecLists|suspect|65|SAFE"
)

TOTAL=${#REPOS[@]}
PASS=0
FAIL=0
ERRORS=0

echo "Testing $TOTAL repositories..." >> $LOG_FILE
echo "" >> $LOG_FILE
echo "# | REPO | SCORE | LABEL | EXPECTED | STARGAZERS | AQ | TB | PH | STATUS" >> $LOG_FILE
echo "--|------|-------|-------|----------|------------|----|----|----|---------" >> $LOG_FILE

COUNT=0
for ENTRY in "${REPOS[@]}"; do
  IFS='|' read -r REPO CATEGORY MIN_SCORE EXPECTED_LABEL <<< "$ENTRY"
  COUNT=$((COUNT + 1))

  echo "[$COUNT/$TOTAL] Testing $REPO..."

  # Appel API avec force=true pour bypass le cache
  RESPONSE=$(curl -s -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    -d "{\"repoUrl\":\"https://github.com/$REPO\",\"force\":true}" \
    --max-time 60 2>/dev/null)

  # Vérifier si la réponse est valide
  if [ -z "$RESPONSE" ] || echo "$RESPONSE" | grep -q '"error"'; then
    ERROR_MSG=$(echo "$RESPONSE" | grep -o '"error":"[^"]*"' | head -1)
    echo "$COUNT | $REPO | ERROR | - | $EXPECTED_LABEL | - | - | - | - | ERROR: $ERROR_MSG" >> $LOG_FILE
    ERRORS=$((ERRORS + 1))
    continue
  fi

  # Extraire les données du JSON
  SCORE=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('score','-'))" 2>/dev/null)
  LABEL=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('label','-'))" 2>/dev/null)
  SAMPLE=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('sampleSize','-'))" 2>/dev/null)
  AQ=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('dimensions',{}).get('accounts','-'))" 2>/dev/null)
  TB=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('dimensions',{}).get('temporal','-'))" 2>/dev/null)
  PH=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('dimensions',{}).get('health','-'))" 2>/dev/null)

  # Vérifier la cohérence
  STATUS="?"
  if [ "$EXPECTED_LABEL" = "NEW" ]; then
    if [ "$LABEL" = "NEW" ]; then STATUS="PASS"; else STATUS="FAIL"; fi
  elif [ "$EXPECTED_LABEL" = "SAFE" ]; then
    if [ "$LABEL" = "SAFE" ] && [ "$SCORE" -ge "$MIN_SCORE" ] 2>/dev/null; then
      STATUS="PASS"
    elif [ "$LABEL" = "SAFE" ]; then
      STATUS="WARN (score $SCORE < expected $MIN_SCORE)"
    else
      STATUS="FAIL (got $LABEL, expected SAFE)"
    fi
  elif [ "$EXPECTED_LABEL" = "SUSPICIOUS" ]; then
    if [ "$LABEL" = "SUSPICIOUS" ] || [ "$LABEL" = "DANGEROUS" ]; then
      STATUS="PASS"
    else
      STATUS="FAIL (got $LABEL, expected SUSPICIOUS/DANGEROUS)"
    fi
  fi

  echo "$COUNT | $REPO | $SCORE | $LABEL | $EXPECTED_LABEL | $SAMPLE | $AQ | $TB | $PH | $STATUS" >> $LOG_FILE

  if echo "$STATUS" | grep -q "PASS"; then PASS=$((PASS + 1)); fi
  if echo "$STATUS" | grep -q "FAIL"; then FAIL=$((FAIL + 1)); fi

  # Pause 2s entre chaque requête pour ne pas rate-limiter GitHub
  sleep 2
done

echo "" >> $LOG_FILE
echo "=============================================" >> $LOG_FILE
echo "SUMMARY" >> $LOG_FILE
echo "=============================================" >> $LOG_FILE
echo "Total: $TOTAL" >> $LOG_FILE
echo "Pass: $PASS" >> $LOG_FILE
echo "Fail: $FAIL" >> $LOG_FILE
echo "Errors: $ERRORS" >> $LOG_FILE
echo "Reliability: $((PASS * 100 / TOTAL))%" >> $LOG_FILE
echo "=============================================" >> $LOG_FILE

echo ""
echo "Done. Results in $LOG_FILE"
echo "Pass: $PASS / $TOTAL ($((PASS * 100 / TOTAL))%)"
cat $LOG_FILE
