#!/usr/bin/env bash
set -euo pipefail

# -----------------------------
# Config (override via env vars)
# -----------------------------
APP_DOMAIN="${APP_DOMAIN:-under-review.app}"
LOG_WINDOW="${LOG_WINDOW:-30m}"
POST_UR_WINDOW="${POST_UR_WINDOW:-5m}"
URTAKE_BEARER="${URTAKE_BEARER:-}"

# -----------------------------
# Requirements
# -----------------------------
for cmd in curl jq rg vercel; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Missing required command: $cmd"
    exit 2
  fi
done

TMP_DIR="$(mktemp -d)"
LOG_FILE="$TMP_DIR/vercel.log"
LOG_FILE_AFTER_UR="$TMP_DIR/vercel_after_urtake.log"

PASS_COUNT=0
FAIL_COUNT=0

pass() { echo "PASS: $1"; PASS_COUNT=$((PASS_COUNT+1)); }
fail() { echo "FAIL: $1"; FAIL_COUNT=$((FAIL_COUNT+1)); }

fetch_logs() {
  local window="$1"
  local out="$2"
  if ! vercel logs "$APP_DOMAIN" --since "$window" >"$out" 2>&1; then
    return 1
  fi
  return 0
}

echo "=== Running smoke checks against https://$APP_DOMAIN ==="

# -----------------------------
# 1) Health endpoint check
# -----------------------------
health_json="$(curl -fsS "https://$APP_DOMAIN/api/health" || true)"
if [[ -z "$health_json" ]]; then
  fail "1) /api/health unreachable"
else
  if echo "$health_json" | jq -e '.ok == true and .accessTokenSecretConfigured == true' >/dev/null 2>&1; then
    pass "1) /api/health => ok:true and accessTokenSecretConfigured:true"
  else
    fail "1) /api/health unhealthy: $(echo "$health_json" | jq -c . 2>/dev/null || echo "$health_json")"
  fi
fi

# -----------------------------
# 2) Scheduler executes targets
# -----------------------------
scheduler_json="$(curl -fsS "https://$APP_DOMAIN/api/scrape-scheduler" || true)"
executed="$(echo "$scheduler_json" | jq -r '(.executed // .result.executed // 0) | tonumber? // 0' 2>/dev/null || echo 0)"
if [[ "$executed" -gt 0 ]]; then
  pass "2) /api/scrape-scheduler executed=$executed (>0)"
else
  fail "2) /api/scrape-scheduler executed=$executed (expected >0). Raw: $(echo "$scheduler_json" | jq -c . 2>/dev/null || echo "$scheduler_json")"
fi

if fetch_logs "$LOG_WINDOW" "$LOG_FILE"; then
  if rg -q '"action":"ran"' "$LOG_FILE"; then
    pass "2b) Logs contain scheduler executions (\"action\":\"ran\")"
  else
    fail "2b) Logs missing scheduler execution pattern: \"action\":\"ran\""
  fi
else
  fail "Log fetch failed for checks 2/3/4 (vercel logs --since $LOG_WINDOW)"
fi

# -----------------------------
# 3) Golf target appears for Charles Schwab
# -----------------------------
if [[ -f "$LOG_FILE" ]]; then
  if rg -i -q '"event":"golf_target_eval".*(charles schwab|charles_schwab).*"isPgaTour":true.*"targetGenerated":true' "$LOG_FILE"; then
    pass "3) Golf target eval healthy for Charles Schwab (isPgaTour:true, targetGenerated:true)"
  else
    fail "3) Missing healthy Charles Schwab golf_target_eval log"
    echo "    Debug hint:"
    rg -i '"event":"golf_target_eval".*(charles schwab|charles_schwab)' "$LOG_FILE" || true
  fi
fi

# -----------------------------
# 4) MLB scraper cache populated
# -----------------------------
if [[ -f "$LOG_FILE" ]]; then
  if rg -q '"event":"mlb_odds_cached".*"source":"espn_scoreboard_api".*"moneylineCount":[1-9][0-9]*.*"runLineCount":[1-9][0-9]*.*"totalRunsCount":[1-9][0-9]*' "$LOG_FILE"; then
    pass "4) MLB odds cache populated from ESPN scoreboard with all 3 markets"
  else
    fail "4) Missing healthy mlb_odds_cached signal (espn_scoreboard_api + non-zero market counts)"
    echo "    Debug hint:"
    rg '"event":"mlb_odds_cached"' "$LOG_FILE" || true
  fi
fi

# -----------------------------
# 5) UR TAKE differentiated error on empty question
# -----------------------------
if [[ -z "$URTAKE_BEARER" ]]; then
  fail "5) URTAKE_BEARER not set; cannot validate empty_question behavior in auth-enabled env"
else
  ur_resp="$(curl -sS -X POST "https://$APP_DOMAIN/api/ur-take" \
    -H "content-type: application/json" \
    -H "authorization: Bearer $URTAKE_BEARER" \
    -d '{"question":"   ","sportHint":"mlb"}' || true)"

  if echo "$ur_resp" | jq -e '.failureClass == "empty_question" and .silent == true and ((.response // "") == "")' >/dev/null 2>&1; then
    pass "5) UR TAKE empty question => failureClass:empty_question + silent:true + empty response"
  else
    fail "5) UR TAKE empty question response not differentiated as expected: $(echo "$ur_resp" | jq -c . 2>/dev/null || echo "$ur_resp")"
  fi

  if fetch_logs "$POST_UR_WINDOW" "$LOG_FILE_AFTER_UR"; then
    if rg -q '"event":"ur_take_terminal".*"outcomeType":"fallback".*"failureClass":"empty_question"' "$LOG_FILE_AFTER_UR"; then
      pass "5b) Logs contain ur_take_terminal fallback with failureClass:empty_question"
    else
      fail "5b) Missing ur_take_terminal empty_question fallback log"
      echo "    Debug hint:"
      rg '"event":"ur_take_terminal"' "$LOG_FILE_AFTER_UR" || true
    fi
  else
    fail "5b) Log fetch failed for UR TAKE check (vercel logs --since $POST_UR_WINDOW)"
  fi
fi

echo
echo "=== SUMMARY ==="
echo "PASS: $PASS_COUNT"
echo "FAIL: $FAIL_COUNT"
echo "Logs saved to: $TMP_DIR"

if [[ "$FAIL_COUNT" -eq 0 ]]; then
  echo "OVERALL: HEALTHY ✅"
  exit 0
else
  echo "OVERALL: NOT HEALTHY ❌"
  exit 1
fi
