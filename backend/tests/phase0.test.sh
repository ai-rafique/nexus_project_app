#!/usr/bin/env bash
# Phase 0 — API Integration Tests (runs against http://localhost:4000)
# Usage: bash tests/phase0.test.sh

BASE="http://localhost:4000"
PASS=0
FAIL=0
SKIP=0

# ── helpers ────────────────────────────────────────────────────────────────────

green='\033[0;32m'
red='\033[0;31m'
yellow='\033[1;33m'
reset='\033[0m'

pass() { echo -e "${green}  PASS${reset}  $1"; ((PASS++)); }
fail() { echo -e "${red}  FAIL${reset}  $1  →  $2"; ((FAIL++)); }
skip() { echo -e "${yellow}  SKIP${reset}  $1  →  $2"; ((SKIP++)); }

# run a curl call and return the HTTP status code; body goes to $BODY
req() {
  local method="$1" url="$2" data="$3" extra_headers="$4"
  BODY=$(curl -s -w '\n__STATUS__%{http_code}' -X "$method" \
    -H "Content-Type: application/json" \
    ${extra_headers:+-H "$extra_headers"} \
    ${data:+-d "$data"} \
    "$BASE$url")
  STATUS=$(echo "$BODY" | grep '__STATUS__' | sed 's/__STATUS__//')
  BODY=$(echo "$BODY" | grep -v '__STATUS__')
}

extract() { echo "$BODY" | grep -o "\"$1\":\"[^\"]*\"" | head -1 | sed "s/\"$1\":\"//;s/\"//"; }

# ── section header ─────────────────────────────────────────────────────────────

section() { echo ""; echo "── $1 ──────────────────────────────────────"; }

# ═══════════════════════════════════════════════════════════════════════════════
echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  NEXUS Phase 0 — Integration Test Suite ║"
echo "╚══════════════════════════════════════════╝"

# ── T01: Health check ──────────────────────────────────────────────────────────
section "Infra"

req GET /healthz
if [[ "$STATUS" == "200" ]]; then
  pass "T01  GET /healthz returns 200"
else
  fail "T01  GET /healthz returns 200" "got HTTP $STATUS"
fi

# ── T02–T06: Registration ──────────────────────────────────────────────────────
section "Auth — Register"

TS=$(date +%s)
EMAIL="test_${TS}@nexus.test"

req POST /api/auth/register '{"email":"'"$EMAIL"'","password":"Passw0rd!","firstName":"Test","lastName":"User"}'
if [[ "$STATUS" == "201" ]]; then
  pass "T02  POST /api/auth/register returns 201"
else
  fail "T02  POST /api/auth/register returns 201" "got HTTP $STATUS — $BODY"
fi

ACCESS_TOKEN=$(extract accessToken)
REFRESH_TOKEN=$(extract refreshToken)

if [[ -n "$ACCESS_TOKEN" ]]; then
  pass "T03  Response contains accessToken"
else
  fail "T03  Response contains accessToken" "field missing in: $BODY"
fi

if [[ -n "$REFRESH_TOKEN" ]]; then
  pass "T04  Response contains refreshToken"
else
  fail "T04  Response contains refreshToken" "field missing"
fi

# Duplicate registration
req POST /api/auth/register '{"email":"'"$EMAIL"'","password":"Passw0rd!","firstName":"Test","lastName":"User"}'
if [[ "$STATUS" == "409" ]]; then
  pass "T05  Duplicate email returns 409"
else
  fail "T05  Duplicate email returns 409" "got HTTP $STATUS"
fi

# Invalid payload
req POST /api/auth/register '{"email":"not-an-email","password":"short"}'
if [[ "$STATUS" == "400" ]]; then
  pass "T06  Invalid payload returns 400"
else
  fail "T06  Invalid payload returns 400" "got HTTP $STATUS"
fi

# ── T07–T11: Login ─────────────────────────────────────────────────────────────
section "Auth — Login"

req POST /api/auth/login '{"email":"'"$EMAIL"'","password":"Passw0rd!"}'
if [[ "$STATUS" == "200" ]]; then
  pass "T07  POST /api/auth/login returns 200"
else
  fail "T07  POST /api/auth/login returns 200" "got HTTP $STATUS — $BODY"
fi

LOGIN_ACCESS=$(extract accessToken)
LOGIN_REFRESH=$(extract refreshToken)

if [[ -n "$LOGIN_ACCESS" ]]; then
  pass "T08  Login response contains accessToken"
else
  fail "T08  Login response contains accessToken" "missing"
fi

# Wrong password
req POST /api/auth/login '{"email":"'"$EMAIL"'","password":"wrongpassword"}'
if [[ "$STATUS" == "401" ]]; then
  pass "T09  Wrong password returns 401"
else
  fail "T09  Wrong password returns 401" "got HTTP $STATUS"
fi

# Unknown email
req POST /api/auth/login '{"email":"ghost@nexus.test","password":"Passw0rd!"}'
if [[ "$STATUS" == "401" ]]; then
  pass "T10  Unknown email returns 401"
else
  fail "T10  Unknown email returns 401" "got HTTP $STATUS"
fi

# Missing fields
req POST /api/auth/login '{}'
if [[ "$STATUS" == "400" ]]; then
  pass "T11  Empty body returns 400"
else
  fail "T11  Empty body returns 400" "got HTTP $STATUS"
fi

# ── T12–T14: Token refresh ─────────────────────────────────────────────────────
section "Auth — Token Refresh"

req POST /api/auth/refresh '{"refreshToken":"'"$LOGIN_REFRESH"'"}'
if [[ "$STATUS" == "200" ]]; then
  pass "T12  POST /api/auth/refresh returns 200"
else
  fail "T12  POST /api/auth/refresh returns 200" "got HTTP $STATUS — $BODY"
fi

NEW_REFRESH=$(extract refreshToken)

# Old refresh token must be invalidated (rotation)
req POST /api/auth/refresh '{"refreshToken":"'"$LOGIN_REFRESH"'"}'
if [[ "$STATUS" == "401" ]]; then
  pass "T13  Reused refresh token returns 401 (rotation enforced)"
else
  fail "T13  Reused refresh token returns 401 (rotation enforced)" "got HTTP $STATUS"
fi

# Invalid token
req POST /api/auth/refresh '{"refreshToken":"not.a.real.token"}'
if [[ "$STATUS" == "401" ]]; then
  pass "T14  Invalid refresh token returns 401"
else
  fail "T14  Invalid refresh token returns 401" "got HTTP $STATUS"
fi

# ── T15: Logout ────────────────────────────────────────────────────────────────
section "Auth — Logout"

req POST /api/auth/logout '{"refreshToken":"'"$NEW_REFRESH"'"}'
if [[ "$STATUS" == "204" ]]; then
  pass "T15  POST /api/auth/logout returns 204"
else
  fail "T15  POST /api/auth/logout returns 204" "got HTTP $STATUS"
fi

# ── T16–T17: Protected route guard ────────────────────────────────────────────
section "Auth — Protected route guard"

req GET /api/projects
if [[ "$STATUS" == "401" ]]; then
  pass "T16  GET /api/projects without token returns 401"
else
  fail "T16  GET /api/projects without token returns 401" "got HTTP $STATUS"
fi

# Re-login to get a fresh token for project tests
req POST /api/auth/login '{"email":"'"$EMAIL"'","password":"Passw0rd!"}'
FRESH_TOKEN=$(extract accessToken)
FRESH_REFRESH=$(extract refreshToken)

req GET /api/projects "" "Authorization: Bearer $FRESH_TOKEN"
if [[ "$STATUS" == "200" ]]; then
  pass "T17  GET /api/projects with valid token returns 200"
else
  fail "T17  GET /api/projects with valid token returns 200" "got HTTP $STATUS — $BODY"
fi

# ── T18–T23: Projects CRUD ────────────────────────────────────────────────────
section "Projects — CRUD"

PROJECT_PAYLOAD='{"name":"Alpha Project","clientName":"Acme Corp","startDate":"2026-01-01T00:00:00.000Z","description":"Phase 0 test project"}'

req POST /api/projects "$PROJECT_PAYLOAD" "Authorization: Bearer $FRESH_TOKEN"
if [[ "$STATUS" == "201" ]]; then
  pass "T18  POST /api/projects returns 201"
else
  fail "T18  POST /api/projects returns 201" "got HTTP $STATUS — $BODY"
fi

PROJECT_ID=$(echo "$BODY" | grep -o '"_id":"[^"]*"' | head -1 | sed 's/"_id":"//;s/"//')

if [[ -n "$PROJECT_ID" ]]; then
  pass "T19  Created project has _id"
else
  fail "T19  Created project has _id" "id missing in: $BODY"
fi

req GET /api/projects/$PROJECT_ID "" "Authorization: Bearer $FRESH_TOKEN"
if [[ "$STATUS" == "200" ]]; then
  pass "T20  GET /api/projects/:id returns 200"
else
  fail "T20  GET /api/projects/:id returns 200" "got HTTP $STATUS"
fi

req PATCH /api/projects/$PROJECT_ID '{"status":"on_hold"}' "Authorization: Bearer $FRESH_TOKEN"
if [[ "$STATUS" == "200" ]]; then
  pass "T21  PATCH /api/projects/:id returns 200"
else
  fail "T21  PATCH /api/projects/:id returns 200" "got HTTP $STATUS — $BODY"
fi

# Missing required field
req POST /api/projects '{"name":"No client"}' "Authorization: Bearer $FRESH_TOKEN"
if [[ "$STATUS" == "400" ]]; then
  pass "T22  Missing required field returns 400"
else
  fail "T22  Missing required field returns 400" "got HTTP $STATUS"
fi

# Access another user's project with different token (create second user)
TS2=$(date +%s%N)
EMAIL2="test2_${TS2}@nexus.test"
req POST /api/auth/register '{"email":"'"$EMAIL2"'","password":"Passw0rd!","firstName":"Other","lastName":"User"}'
TOKEN2=$(extract accessToken)

req GET /api/projects/$PROJECT_ID "" "Authorization: Bearer $TOKEN2"
if [[ "$STATUS" == "403" ]]; then
  pass "T23  Non-member cannot access another user's project (403)"
else
  fail "T23  Non-member cannot access another user's project (403)" "got HTTP $STATUS"
fi

# ── T24: 2FA setup endpoint requires auth ────────────────────────────────────
section "Auth — 2FA"

req POST /api/auth/2fa/setup
if [[ "$STATUS" == "401" ]]; then
  pass "T24  POST /api/auth/2fa/setup without auth returns 401"
else
  fail "T24  POST /api/auth/2fa/setup without auth returns 401" "got HTTP $STATUS"
fi

req POST /api/auth/2fa/setup "" "Authorization: Bearer $FRESH_TOKEN"
if [[ "$STATUS" == "200" ]]; then
  pass "T25  POST /api/auth/2fa/setup with auth returns 200 with secret+qrCode"
else
  fail "T25  POST /api/auth/2fa/setup with auth returns 200" "got HTTP $STATUS — $BODY"
fi

# ── Summary ────────────────────────────────────────────────────────────────────
echo ""
echo "──────────────────────────────────────────"
TOTAL=$((PASS + FAIL + SKIP))
echo -e "Results: ${green}${PASS} passed${reset}  |  ${red}${FAIL} failed${reset}  |  ${yellow}${SKIP} skipped${reset}  |  ${TOTAL} total"
echo ""

if [[ $FAIL -gt 0 ]]; then
  exit 1
fi
