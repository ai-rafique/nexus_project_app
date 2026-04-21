# NEXUS — CLAUDE.md

> Engineering reference for AI-assisted development of the NEXUS SDLC platform.
> Covers architecture, patterns, phase history, and future feature specs.

---

## Stack

| Layer      | Technology |
|------------|------------|
| Backend    | Node.js 20 + TypeScript, Express, Mongoose (MongoDB 7) |
| Frontend   | React 18 + TypeScript, Vite, Tailwind CSS, Radix UI |
| Auth       | JWT (access + refresh rotation), bcryptjs, TOTP (speakeasy) |
| State      | TanStack Query v5 (server state), Zustand (client state) |
| Graph      | @xyflow/react v12.x (RTM traceability graph) |
| PDF        | @react-pdf/renderer (backend) — requires `react` + `react-dom` in backend `dependencies` |
| Docker     | `docker-compose.yml` (dev), `docker-compose.prod.yml` (production) |

---

## Repository layout

```
nexus_project_app/
├── backend/
│   ├── src/
│   │   ├── config/         env.ts, database.ts
│   │   ├── controllers/    one file per domain
│   │   ├── middleware/      auth.ts, errorHandler.ts
│   │   ├── models/         Mongoose models
│   │   ├── routes/         Express routers
│   │   ├── services/       audit.service.ts, pdf.service.ts, notification.service.ts
│   │   ├── app.ts          Express app (middleware + routes)
│   │   └── server.ts       HTTP listen
│   ├── tests/              phase0.mjs … phase5.mjs (integration tests)
│   ├── Dockerfile          dev (tsx watch)
│   ├── Dockerfile.prod     multi-stage production build
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── api/            one file per domain (apiClient from ./client)
│   │   ├── components/
│   │   │   ├── layout/     AppShell.tsx (sidebar + topbar + breadcrumb + Cmd+K)
│   │   │   ├── ui/         button, badge, card, dialog, input, select, toast, …
│   │   │   ├── Breadcrumb.tsx
│   │   │   ├── CommandPalette.tsx
│   │   │   └── Toaster.tsx
│   │   ├── contexts/       AuthContext.tsx
│   │   ├── hooks/
│   │   ├── lib/            utils.ts, toast.ts (pub/sub toast emitter)
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx      analytics + activity feed + project grid
│   │   │   ├── Login.tsx, Register.tsx
│   │   │   ├── Settings.tsx
│   │   │   └── projects/          one page per module
│   │   └── App.tsx
│   ├── Dockerfile          dev (vite --host)
│   ├── Dockerfile.prod     multi-stage → nginx
│   └── nginx.conf
├── docker-compose.yml
├── docker-compose.prod.yml
├── PROMPT.md               original phase specification
├── TestStatus.md           test results per phase
└── README.md
```

---

## Critical patterns — read before touching any code

### JWT payload field is `sub`, not `userId`
All controllers access the authenticated user as `req.user!.sub`. Never use `req.user!.userId`.

### Mongoose model naming
Controllers import models directly: `import { User } from '../models/User'`. The model file exports the Mongoose model as a named export matching the file name.

### API response shapes
- Project and Requirement controllers wrap data: `res.json({ data: ... })`
- Document, Notification, Verification, Audit controllers return the document directly (no wrapper)
- The frontend API clients unwrap accordingly (`.then(r => r.data.data)` vs `.then(r => r.data)`)

### TraceLink IDs are Strings, not ObjectIds
`sourceId` and `targetId` in the TraceLink schema are typed as `String` (not `Schema.Types.ObjectId`). This supports both MongoDB ObjectId strings and slug IDs like `"introduction"` (SRS section IDs).

### Audit service is always silent
`audit()` from `services/audit.service.ts` wraps every write in try/catch and never throws. Import and call it after successful mutations — it must never break the primary request.

### Windows Docker bind-mount — file watching does not work
`tsx watch` does not detect file changes on Windows Docker volume mounts. After any backend code change:
```bash
docker compose up -d --force-recreate backend
```
After adding npm packages to backend:
```bash
docker compose build backend
docker compose up -d --force-recreate --renew-anon-volumes backend
```

### Git Bash path conversion
Prefix Docker exec commands with `MSYS_NO_PATHCONV=1` in Git Bash:
```bash
MSYS_NO_PATHCONV=1 docker exec nexus_backend node /app/tests/phase5.mjs
```

### Toast system
Toast is a pub/sub emitter in `frontend/src/lib/toast.ts`. Import and call anywhere:
```ts
import { toast } from '@/lib/toast';
toast.success('Saved');
toast.error('Failed', 'Optional description');
```
The `<Toaster />` component in `App.tsx` subscribes and renders.

---

## Phases completed

### Phase 0 — Foundation (commit 508cc30)
- Docker Compose: mongo, redis, backend, frontend
- JWT auth: register, login, refresh (token rotation with `jti`), logout, /me
- TOTP 2FA: setup + verify (AES-256 encrypted secret at rest)
- User model: email, passwordHash, firstName, lastName, globalRole, isTotpEnabled
- RefreshToken model: tokenHash (SHA-256), expiresAt
- Express middleware: `requireAuth`, `requireRole`, error handler, 404 handler
- Rate limiter disabled in non-production (triggered during tests)
- **Tests:** `backend/tests/phase0.mjs` — 25/25

### Phase 1 — Projects & Requirements (commit 80e0e61)
- Project model: name, clientName, status, currentPhase, members[], tags, startDate/targetEndDate
- `isMember()` check uses `resolveId()` helper to handle populated vs raw ObjectId
- Requirements: REQ-001 auto-ID, version history (snapshot before each PATCH), comments, soft-delete (status → deprecated)
- CSV import: `csv-parse/sync`, multer
- Frontend: Tailwind + Radix UI design system, Dashboard (project list), Requirements page, RequirementDetail page
- **Tests:** `backend/tests/phase1.mjs` — 34/34

### Phase 2 — Documents & Approvals (commit cfab3ff)
- Document model: multi-type (srs, sds, fat_plan, fat_report), IEEE 830 sections auto-seeded, status workflow (draft → in_review → client_review → approved), reviewers subdocument
- `@react-pdf/renderer` generates PDF: cover, TOC, sections, watermark, logo — requires `react`+`react-dom` in backend **dependencies** (not devDependencies)
- Notification model + service: in-app bell with unread badge, markAllRead
- Settings model: singleton (findOne/create), company name + logo path
- **Tests:** `backend/tests/phase2.mjs` — 32/32

### Phase 3 — Traceability RTM (commit af9fc59)
- TraceLink model: sourceId/targetId as **String**, sourceType/targetType, linkType (derives/verifies/implements/tests)
- Graph endpoint: returns `{ nodes, edges }` for @xyflow/react
- Coverage endpoint: totalRequirements, coveredRequirements, coveragePercent, orphanList
- Frontend: `@xyflow/react` interactive graph, coverage panel, node detail drawer, type/status filter
- **Tests:** `backend/tests/phase3.mjs` — 35/35

### Phase 4 — Testing & FAT (commit eaf1054)
- TestCase model: TC-001 auto-ID, steps[], linkedReqs[], embedded runs[]
- FatPlan model: items with result/observations/signedOff per item, plan auto-transitions to completed when all items have results
- Punch list = auto-derived from items with result=failed in the FAT report
- **Tests:** `backend/tests/phase4.mjs` — 50/50

### Phase 5 — Verification Matrix, Audit Trail, Production Docker (commit 4435090)
- VerificationMatrix: singleton per project (unique projectId index), entries keyed by requirementId+method (409 on duplicate), auto-populate from TestCase.linkedReqs (→ test entries) and TraceLinks with linkType=verifies (→ review entries), `verifiedBy`+`verifiedAt` auto-set on first `verified` transition
- AuditLog model + audit.service: silent writes, indexed by {projectId,createdAt}, {userId,createdAt}, {createdAt}
- Audit wired into: auth (register, login), requirements (create), documents (create, submit, approve), verification (add entry, update entry)
- Audit routes: project-scoped paginated (`GET /api/projects/:id/audit`) and global (`GET /api/audit`) with action/entityType filter
- **Production Docker:** multi-stage `Dockerfile.prod` (tsc → dist, npm ci --omit=dev), frontend (vite build → nginx), `docker-compose.prod.yml` with CPU/memory limits
- **Tests:** `backend/tests/phase5.mjs` — 35/35

### Phase 6 — UX Polish: Dashboard Analytics, Breadcrumbs, Global Search (current)
- **Backend:** `GET /api/search?q=` — searches requirements (title/reqId), documents (title), tests (title/testId) across user-accessible projects; regex-escaped query; 6+4+4 result limits per type
- **Toast system:** pub/sub emitter in `lib/toast.ts`, `<Toaster />` component using Radix `@radix-ui/react-toast`, wired into mutations across Requirements, Documents, Dashboard, VerificationMatrix
- **Breadcrumb:** `components/Breadcrumb.tsx` reads `useLocation()` + `useParams()`, fetches project name from React Query cache, renders clickable path in AppShell topbar
- **CommandPalette:** `components/CommandPalette.tsx` — keyboard shortcut `Ctrl+K` / `Cmd+K`, debounced 250ms search, arrow-key navigation, type icons (ClipboardList / FileText / TestTube), Esc to close
- **Dashboard overhaul:** Stats cards (total projects, active, team members), Recent Activity feed (pulls from global audit), skeleton loaders, two-column layout
- **Skeleton screens:** `animate-pulse` placeholders in Dashboard stat cards and project grid; wired to `isLoading` from React Query

---

## Route map

### Backend (`/api`)
```
POST   /auth/register
POST   /auth/login
POST   /auth/refresh
POST   /auth/logout
GET    /auth/me
POST   /auth/2fa/setup
POST   /auth/2fa/verify

GET    /projects
POST   /projects
GET    /projects/:id
PATCH  /projects/:id
POST   /projects/:id/members

GET    /projects/:id/requirements
POST   /projects/:id/requirements
GET    /projects/:id/requirements/:reqId
PATCH  /projects/:id/requirements/:reqId
DELETE /projects/:id/requirements/:reqId
POST   /projects/:id/requirements/:reqId/comments
POST   /projects/:id/requirements/import

GET    /projects/:id/documents
POST   /projects/:id/documents
GET    /projects/:id/documents/:docId
PATCH  /projects/:id/documents/:docId/sections/:sectionId
POST   /projects/:id/documents/:docId/submit
POST   /projects/:id/documents/:docId/review
POST   /projects/:id/documents/:docId/approve
GET    /projects/:id/documents/:docId/pdf
DELETE /projects/:id/documents/:docId

GET    /projects/:id/tracelinks
POST   /projects/:id/tracelinks
DELETE /projects/:id/tracelinks/:linkId
GET    /projects/:id/traceability/graph
GET    /projects/:id/traceability/coverage

GET    /projects/:id/tests
POST   /projects/:id/tests
GET    /projects/:id/tests/:testId
PATCH  /projects/:id/tests/:testId
DELETE /projects/:id/tests/:testId
POST   /projects/:id/tests/:testId/runs
GET    /projects/:id/tests/:testId/runs

GET    /projects/:id/fat
POST   /projects/:id/fat
GET    /projects/:id/fat/:planId
POST   /projects/:id/fat/:planId/items
PATCH  /projects/:id/fat/:planId/items/:itemId
POST   /projects/:id/fat/:planId/items/:itemId/sign
GET    /projects/:id/fat/:planId/report

GET    /projects/:id/verification
GET    /projects/:id/verification/summary
POST   /projects/:id/verification/auto-populate
POST   /projects/:id/verification/entries
PATCH  /projects/:id/verification/entries/:entryId
DELETE /projects/:id/verification/entries/:entryId

GET    /projects/:id/audit
GET    /audit
GET    /search?q=

GET    /notifications
GET    /notifications/unread-count
PATCH  /notifications/:id/read
PATCH  /notifications/read-all

GET    /settings
PATCH  /settings
POST   /settings/logo
```

### Frontend routes
```
/login
/register
/dashboard
/projects/:id
/projects/:id/requirements
/projects/:id/requirements/:reqId
/projects/:id/documents
/projects/:id/documents/:docId
/projects/:id/traceability
/projects/:id/tests
/projects/:id/fat
/projects/:id/verification
/projects/:id/audit
/settings
```

---

## Future features (implementation notes for next session)

### Email Notifications
- Add `nodemailer` to backend dependencies
- Create `services/email.service.ts` — transporter config from env (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS)
- Call `sendEmail()` alongside `createNotification()` in notification.service.ts for: `review_request`, `review_approved`, `review_rejected`, `client_signed`
- Add opt-in field `emailNotifications: boolean` to User model, default true
- Settings page: toggle for email notifications per user

### Requirement Impact Analysis
- When PATCH /requirements/:reqId is called, gather impact: linked TraceLinks, linked TestCases (via TestCase.linkedReqs), document sections (via ProjectDocument.sections[].linkedReqs)
- Add a `GET /projects/:id/requirements/:reqId/impact` endpoint returning `{ traceLinks, testCases, documentSections }`
- Frontend: "Impact" tab on `RequirementDetail.tsx` — shows counts with links to each artifact; warn user before saving if impact is non-zero

### Global / Cross-Project Search (implemented in Phase 6)
- Endpoint: `GET /api/search?q=` in `controllers/search.controller.ts`
- Searches requirements (title, reqId), documents (title), tests (title, testId) across user's accessible projects
- Frontend: `CommandPalette.tsx` — Ctrl+K / Cmd+K, 250ms debounce, keyboard navigation

### Client Portal
- Separate route `/client/:shareToken` (no login required)
- Share token: signed JWT with `{ projectId, role: 'client_viewer' }` stored in Project model
- Shows only documents in `client_review` or `approved` status for that project
- Approve button calls existing `POST /documents/:docId/approve` with the token in Authorization header

### Requirement Kanban Board
- Toggle button on Requirements page (table ↔ kanban)
- `@dnd-kit/core` + `@dnd-kit/sortable` for drag-and-drop
- Columns: draft | under_review | approved
- Drag fires `PATCH /requirements/:reqId { status }` on drop

### Bulk Actions on Requirements
- Checkbox column on requirements table
- Toolbar appears when ≥1 selected: bulk status change, bulk assign, bulk tag
- Backend: `POST /projects/:id/requirements/bulk` — body `{ ids: string[], update: Partial<Requirement> }`
- Loops through and calls `Requirement.updateMany({ _id: { $in: ids }, projectId }, update)`

### Test Coverage Chart
- On Tests page, add a summary card above the list
- Pie/donut chart (recharts) showing: requirements with test coverage vs uncovered
- Data: compare `Requirement.find({ projectId })` ids against `TestCase.distinct('linkedReqs', { projectId })`
- Can reuse the data from `GET /traceability/coverage` — already returns orphanList

### Dark Mode
- Add `dark` class toggle on `<html>` element
- Store preference in `localStorage` (key: `nexus-theme`)
- Button in AppShell topbar (Sun/Moon icon from lucide-react)
- All existing Tailwind classes already use semantic tokens (`bg-muted`, `text-foreground`) — add `dark:` variants to the token definitions in `tailwind.config.js`

### Document Section Comments
- Add `comments` subdocument array to each `IDocSection` in the Document model
- `POST /projects/:id/documents/:docId/sections/:sectionId/comments { text }`
- Frontend: collapsible comment thread below each section in DocumentEditor

---

## Test run command (all phases)
```bash
MSYS_NO_PATHCONV=1 docker exec nexus_backend node /app/tests/phase0.mjs
MSYS_NO_PATHCONV=1 docker exec nexus_backend node /app/tests/phase1.mjs
MSYS_NO_PATHCONV=1 docker exec nexus_backend node /app/tests/phase2.mjs
MSYS_NO_PATHCONV=1 docker exec nexus_backend node /app/tests/phase3.mjs
MSYS_NO_PATHCONV=1 docker exec nexus_backend node /app/tests/phase4.mjs
MSYS_NO_PATHCONV=1 docker exec nexus_backend node /app/tests/phase5.mjs
```

## Common dev commands
```bash
# Restart backend after code change (Windows bind-mount — tsx watch doesn't detect changes)
docker compose up -d --force-recreate backend

# Rebuild after adding npm packages
docker compose build backend
docker compose up -d --force-recreate --renew-anon-volumes backend

# Tail backend logs
docker logs nexus_backend -f

# Check health
curl http://localhost:4000/healthz
```
