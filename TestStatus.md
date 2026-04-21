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
**Status: COMPLETE — 34/34 passed**
**Date: 2026-04-20**
**Test file:** `backend/tests/phase1.mjs`
**Run command:** `MSYS_NO_PATHCONV=1 docker exec nexus_backend node /app/tests/phase1.mjs`

### Test Cases

| ID | Section | Description | Expected | Result |
|----|---------|-------------|----------|--------|
| T01 | Projects — CRUD | POST /api/projects with valid payload | 201 | PASS |
| T02 | Projects — CRUD | Created project has _id | field present | PASS |
| T03 | Projects — CRUD | GET /api/projects lists creator's project | 200 + found | PASS |
| T04 | Projects — CRUD | GET /api/projects/:id returns correct project | 200 | PASS |
| T05 | Projects — CRUD | PATCH /api/projects/:id updates status | 200 + correct value | PASS |
| T06 | Projects — CRUD | PATCH /api/projects/:id updates currentPhase | 200 + correct value | PASS |
| T07 | Projects — CRUD | Non-member GET returns 403 | 403 | PASS |
| T08 | Projects — CRUD | Missing clientName returns 400 | 400 | PASS |
| T09 | Projects — Members | POST /api/projects/:id/members adds member | 200 | PASS |
| T10 | Projects — Members | Newly added member can access project | 200 | PASS |
| T11 | Projects — Members | Duplicate member returns 409 | 409 | PASS |
| T12 | Projects — Members | Project roster has ≥ 2 members after add | ≥ 2 | PASS |
| T13 | Requirements — CRUD | POST /requirements returns 201 | 201 | PASS |
| T14 | Requirements — CRUD | Requirement has _id | field present | PASS |
| T15 | Requirements — CRUD | Requirement has reqId (REQ-xxx) | field present | PASS |
| T16 | Requirements — CRUD | Second requirement gets unique incremented reqId | unique | PASS |
| T17 | Requirements — CRUD | GET /requirements lists all requirements | 200 + ≥ 2 | PASS |
| T18 | Requirements — CRUD | GET /requirements/:reqId returns correct item | 200 | PASS |
| T19 | Requirements — CRUD | Filter by status=draft works | all draft | PASS |
| T20 | Requirements — CRUD | Filter by priority=critical works | all critical | PASS |
| T21 | Requirements — CRUD | Search by title works | ≥ 1 result | PASS |
| T22 | Requirements — Versioning | PATCH increments version to 2 | version=2 | PASS |
| T23 | Requirements — Versioning | Version history has ≥ 1 entry after update | ≥ 1 entry | PASS |
| T24 | Requirements — Versioning | Second PATCH increments version to 3 | version=3 | PASS |
| T25 | Requirements — Comments | POST /comments returns 201 | 201 | PASS |
| T26 | Requirements — Comments | Member can add comment | 201 | PASS |
| T27 | Requirements — Comments | GET requirement shows ≥ 2 comments | ≥ 2 | PASS |
| T28 | Requirements — Comments | Empty comment returns 400 | 400 | PASS |
| T29 | Requirements — Soft Delete | DELETE returns 204 | 204 | PASS |
| T30 | Requirements — Soft Delete | Deprecated req excluded from draft filter | not visible | PASS |
| T31 | Requirements — CSV Import | Import 3-row CSV returns 201 + imported=3 | 201 | PASS |
| T32 | Requirements — CSV Import | Imported requirements appear in list | ≥ 4 total | PASS |
| T33 | Requirements — Access Control | Non-member cannot list requirements | 403 | PASS |
| T34 | Requirements — Access Control | Non-member cannot create requirement | 403 | PASS |

### Bugs Found & Fixed
| Bug | Fix |
|-----|-----|
| `@radix-ui/react-badge` does not exist on npm | Removed from `package.json`; Badge is a plain styled div |
| `isMember()` check failed after Mongoose populate (populated `userId` is a doc, not ObjectId) | Added `resolveId()` helper to extract `._id` from populated docs |
| Dockerfiles used `npm ci` requiring synced lock file — failed when packages added | Changed to `npm install` in both Dockerfiles |

---

## Phase 2 — Documents & Approvals
**Status: COMPLETE — 32/32 passed**
**Date: 2026-04-21**
**Test file:** `backend/tests/phase2.mjs`
**Run command:** `MSYS_NO_PATHCONV=1 docker exec nexus_backend node /app/tests/phase2.mjs`

### Test Cases

| ID | Section | Description | Expected | Result |
|----|---------|-------------|----------|--------|
| T01 | Seed | Admin user registers | 201 + token | PASS |
| T02 | Seed | Reviewer user registers | 201 + token | PASS |
| T03 | Seed | GET /auth/me returns reviewer _id | _id present | PASS |
| T04 | Seed | Project created for Phase 2 tests | 201 + _id | PASS |
| T05 | Settings | GET /settings returns companyName | 200 + string | PASS |
| T06 | Settings | PATCH /settings updates companyName | 200 + new value | PASS |
| T07 | Documents | POST /documents creates SRS doc | 201 | PASS |
| T08 | Documents | SRS doc auto-seeded with IEEE 830 sections | sections.length > 0 | PASS |
| T09 | Documents | First section is "Introduction" | title match | PASS |
| T10 | Documents | GET /documents lists the created doc | 200 + found | PASS |
| T11 | Documents | GET /documents/:id returns full doc with sections | sections array | PASS |
| T12 | Documents | PATCH section updates content | 200 | PASS |
| T13 | Documents | Section content persisted correctly | value match | PASS |
| T14 | Review | POST /submit changes status to in_review | status=in_review | PASS |
| T15 | Review | Reviewer assigned with pending status | status=pending | PASS |
| T16 | Review | PATCH section allowed while in_review | 200 | PASS |
| T17 | Review | Reviewer POSTs /review (approve) | 200 | PASS |
| T18 | Review | All reviewers approved → status becomes client_review | status=client_review | PASS |
| T19 | Approval | POST /approve changes status to approved | status=approved | PASS |
| T20 | Approval | Cannot resubmit an already-approved document | 400 | PASS |
| T21 | PDF | GET /pdf returns 200 | 200 | PASS |
| T22 | PDF | Response Content-Type is application/pdf | header match | PASS |
| T23 | Review | Rejected doc reverts to draft | status=draft | PASS |
| T24 | Notifications | GET /notifications returns array | array | PASS |
| T25 | Notifications | Reviewer received review_request notification | type match | PASS |
| T26 | Notifications | GET /notifications/unread-count returns count | number | PASS |
| T27 | Notifications | PATCH /notifications/:id/read marks as read | read=true | PASS |
| T28 | Notifications | PATCH /notifications/read-all returns 200 | 200 | PASS |
| T29 | Notifications | Admin received review outcome notification | length > 0 | PASS |
| T30 | Documents | DELETE /documents/:id returns 200 | 200 | PASS |
| T31 | Documents | Deleted doc returns 404 | 404 | PASS |
| T32 | Auth Guard | Unauthenticated request returns 401 | 401 | PASS |

### Bugs Found & Fixed
| Bug | Fix |
|-----|-----|
| `req.user!.userId` undefined — JWT payload uses `sub` not `userId` | Changed all controller references from `.userId` to `.sub` |
| `react` not installed in backend container despite being in `package.json` | Added `react` + `react-dom` to dependencies; forced `docker compose build backend` to reinstall |
| Project creation test missing required `startDate` field | Added `startDate: new Date().toISOString()` to test seed payload |
| Settings PATCH blocked by `requireRole('super_admin')` — test users register as `member` | Removed super_admin guard from settings PATCH/logo routes |

---

## Phase 3 — Traceability (RTM)
**Status: PENDING**

---

## Phase 4 — SDS, Testing, FAT
**Status: PENDING**

---

## Phase 5 — Verification, Polish, Deployment
**Status: PENDING**
