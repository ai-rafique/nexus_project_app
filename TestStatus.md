# NEXUS — Test Status

## Phase 0 — Foundation
**Status: COMPLETE — 25/25 passed**
**Date: 2026-04-13**
**Test file:** `backend/tests/phase0.mjs`
**Run command:** `MSYS_NO_PATHCONV=1 docker exec nexus_backend node /app/tests/phase0.mjs`

### Test Cases

| ID | Section | Description | Expected | Result |
|----|---------|-------------|----------|--------|
| T01 | Infra | GET /healthz | 200 | PASS |
| T02 | Auth — Register | POST /api/auth/register with valid payload | 201 | PASS |
| T03 | Auth — Register | Register response contains accessToken | field present | PASS |
| T04 | Auth — Register | Register response contains refreshToken | field present | PASS |
| T05 | Auth — Register | Duplicate email | 409 | PASS |
| T06 | Auth — Register | Invalid payload (bad email, short password) | 400 | PASS |
| T07 | Auth — Login | POST /api/auth/login with correct credentials | 200 | PASS |
| T08 | Auth — Login | Login response contains accessToken | field present | PASS |
| T09 | Auth — Login | Wrong password | 401 | PASS |
| T10 | Auth — Login | Unknown email | 401 | PASS |
| T11 | Auth — Login | Empty body | 400 | PASS |
| T12 | Auth — Refresh | POST /api/auth/refresh with valid refresh token | 200 | PASS |
| T13 | Auth — Refresh | Reused refresh token rejected (rotation enforced) | 401 | PASS |
| T14 | Auth — Refresh | Invalid refresh token | 401 | PASS |
| T15 | Auth — Logout | POST /api/auth/logout invalidates refresh token | 204 | PASS |
| T16 | Auth — Guard | GET /api/projects without token | 401 | PASS |
| T17 | Auth — Guard | GET /api/projects with valid token | 200 | PASS |
| T18 | Projects | POST /api/projects with valid payload | 201 | PASS |
| T19 | Projects | Created project has _id | field present | PASS |
| T20 | Projects | GET /api/projects/:id | 200 | PASS |
| T21 | Projects | PATCH /api/projects/:id (status update) | 200 | PASS |
| T22 | Projects | POST /api/projects missing required field | 400 | PASS |
| T23 | Projects | Non-member cannot access another user's project | 403 | PASS |
| T24 | Auth — 2FA | POST /api/auth/2fa/setup without auth | 401 | PASS |
| T25 | Auth — 2FA | POST /api/auth/2fa/setup returns secret + qrCode | 200 | PASS |

### Bugs Found & Fixed
| Bug | Fix |
|-----|-----|
| `MONGODB_URI` used `localhost` instead of Docker service name `mongo` | Updated `backend/.env` |
| Rate limiter triggered during test runs (429) | Disabled `express-rate-limit` in non-production environments |
| Refresh token rotation failed — same-second `jwt.sign` calls produced identical tokens | Added `jti: crypto.randomUUID()` to every refresh token payload |
| `tsx watch` does not detect file changes on Windows Docker volume mounts | Documented: use `docker compose up -d --force-recreate backend` after code changes |

---

## Phase 1 — Projects & Requirements
**Status: PENDING**

---

## Phase 2 — Documents & Approvals
**Status: PENDING**

---

## Phase 3 — Traceability (RTM)
**Status: PENDING**

---

## Phase 4 — SDS, Testing, FAT
**Status: PENDING**

---

## Phase 5 — Verification, Polish, Deployment
**Status: PENDING**
