# NEXUS — Full-Lifecycle Software Development Management Platform
## Master Prompt & Architecture Blueprint

---

## 1. Project Overview

**NEXUS** is a collaborative, end-to-end Software Development Lifecycle (SDLC) management platform designed for software development teams and their clients. It covers every phase from initial requirements gathering through system design, specification, traceability, testing, integration, verification, FAT (Factory Acceptance Testing), and delivery.

The platform serves two distinct user tiers:
- **Company Side** — internal development teams: project managers, BAs, architects, developers, QA engineers
- **Client Side** — stakeholders, product owners, and end-clients who review and approve artefacts

All data is persisted in **MongoDB**, with a RESTful (or GraphQL) API backend and a React-based frontend.

---

## 2. Core Feature Set

### 2.1 Authentication & Access Control

- JWT-based authentication with refresh token rotation
- Role-Based Access Control (RBAC) with the following roles:
  - `super_admin` — full system access, company management
  - `project_manager` — create/manage projects, assign members
  - `business_analyst` — requirements & SRS authoring
  - `architect` — SDS, system design artefacts
  - `developer` — implementation tasks, linked to requirements
  - `qa_engineer` — test cases, FAT, verification
  - `client_viewer` — read-only access to approved artefacts
  - `client_approver` — can comment and digitally sign off on artefacts
- Invitation system — users invited via email, onboarded to specific projects
- Two-factor authentication (2FA) via TOTP
- Session management and audit logging of all actions

### 2.2 Project Management

Each **Project** is an isolated workspace containing:
- Project metadata (name, client, start/end dates, status)
- Phase tracking (Requirements → SRS → SDS → Implementation → Testing → FAT → Delivery)
- Team roster with roles
- Milestone and deadline tracking
- Activity feed and audit trail
- Document version history

### 2.3 Requirements Management

- **Requirement Items** with fields:
  - Unique ID (e.g. `REQ-001`)
  - Title, description, acceptance criteria
  - Type: Functional / Non-Functional / Constraint / Interface
  - Priority: Critical / High / Medium / Low
  - Source (stakeholder, meeting, document)
  - Status: Draft → Under Review → Approved → Deprecated
  - Tags and custom attributes
- Inline rich-text editor (Tiptap or Slate.js)
- Comment threads per requirement
- Version history (every edit is versioned)
- Bulk import from Excel / CSV

### 2.4 SRS (Software Requirements Specification)

- Auto-generated SRS document from approved requirements
- Custom section templates (IEEE 830 or custom)
- Chapter builder: Introduction, Scope, Definitions, Functional Requirements, Non-Functional Requirements, Constraints
- Embeds requirement items by reference (live-linked)
- Export to PDF and DOCX
- Client-facing approval workflow: send for review → client comments → revisions → sign-off
- Digital signature capture with timestamp

### 2.5 SDS (Software Design Specification)

- Linked to SRS sections and individual requirements
- Sections: Architecture Overview, Component Design, Data Models, API Specifications, Sequence Diagrams, Deployment Architecture
- Embed and version diagrams (upload or draw inline)
- ERD builder (basic)
- API spec editor (OpenAPI/Swagger inline editor)
- Traceability links to requirements

### 2.6 Interactive Requirement Traceability Matrix (RTM)

This is the **centrepiece feature**:

- A dynamic, zoomable traceability graph showing:
  - Requirements → SRS Sections → SDS Components → Test Cases → FAT Criteria
- Colour-coded nodes by status (green = covered, amber = partial, red = missing)
- Filter by phase, status, assignee, or tag
- Click any node to open a side drawer with full detail
- Coverage metrics dashboard (% of requirements traced to tests)
- Orphan detection: requirements with no linked test cases flagged automatically
- Export RTM as Excel or PDF

### 2.7 Test Management

- Test Cases linked to requirements
- Test Suites grouping related cases
- Test Runs with execution results (Pass / Fail / Blocked / N/A)
- Defect/Issue tracking linked to failed test cases
- Regression test planning
- Test coverage reports

### 2.8 FAT (Factory Acceptance Testing)

- FAT Plan document builder
- FAT Checklist with items linked to requirements
- FAT Execution — step-by-step walkthrough with pass/fail/observations
- Client witness sign-off per FAT item or per section
- Auto-generated FAT Report
- Punch list tracking for failed items

### 2.9 Integration & Verification

- Integration Test Plans linked to SDS components
- Verification Matrix: each requirement verified by specific test/review/analysis/demo method
- V&V (Verification & Validation) status dashboard
- Compliance checklists (custom or standards-based)

### 2.10 Artefact & Document Centre

- Version-controlled document store
- Review and approval workflows for all documents
- Watermarking on client-facing PDFs ("DRAFT" / "APPROVED")
- Notification system (email + in-app) for review requests, approvals, comments
- Audit trail: who viewed, commented, approved, and when

---

## 3. User Roles & Portal Views

### Company Portal
Full access to all features based on role. Internal dashboard shows:
- All projects and their phase status
- Pending actions (reviews to complete, approvals to request)
- Team utilisation (high-level)
- Traceability health across all projects

### Client Portal
Stripped-down, clean interface showing:
- Projects they are invited to
- Documents submitted for their review (SRS, SDS, FAT Plans, reports)
- Comment and sign-off interface
- RTM view (read-only, filtered to approved items)
- Notification inbox

---

## 4. Technology Stack

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js or Fastify
- **Database**: MongoDB with Mongoose ODM
- **Auth**: JWT (access + refresh tokens), bcrypt for passwords, speakeasy for TOTP
- **File Storage**: AWS S3 (or MinIO for self-hosted)
- **Email**: Nodemailer + SendGrid/SES
- **PDF Generation**: Puppeteer or @react-pdf/renderer
- **Search**: MongoDB Atlas Search or Elasticsearch (optional)
- **WebSockets**: Socket.io for real-time collaboration and notifications
- **Queue**: Bull (Redis-backed) for async jobs (PDF generation, email)

### Frontend
- **Framework**: React 18 with TypeScript
- **State**: Zustand + React Query (TanStack Query)
- **Routing**: React Router v6
- **UI**: Custom design system built on Radix UI primitives + Tailwind CSS
- **Rich Text**: Tiptap
- **Traceability Graph**: `@xyflow/react` (maintained successor to `reactflow`)
- **Charts**: Recharts or Nivo
- **Tables**: TanStack Table
- **Forms**: React Hook Form + Zod
- **PDF Viewer**: react-pdf
- **Drag & Drop**: @dnd-kit

### Infrastructure
- **Containerisation**: Docker + Docker Compose
- **CI/CD**: GitHub Actions
- **Monitoring**: Sentry (errors), Prometheus + Grafana (metrics) — optional
- **Environment**: `.env` based config with envalid validation

## Docker Notes
- Frontend: nexus_project_app-frontend image, uses named volume `nexus_frontend_data` for /app
- Backend: nexus_project_app-backend image, no named volume — node_modules live in container layer
- If frontend is crash-looping, use `docker run --rm -v nexus_frontend_data:/app` to install deps
- If backend needs packages: exec directly into running container
---

## 5. MongoDB Schema Design

### Users Collection
```json
{
  "_id": "ObjectId",
  "email": "string (unique)",
  "passwordHash": "string",
  "firstName": "string",
  "lastName": "string",
  "avatar": "string (URL)",
  "totpSecret": "string (encrypted)",
  "isTotpEnabled": "boolean",
  "globalRole": "super_admin | member",
  "isActive": "boolean",
  "lastLogin": "Date",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### Projects Collection
```json
{
  "_id": "ObjectId",
  "name": "string",
  "description": "string",
  "clientName": "string",
  "status": "active | on_hold | completed | archived",
  "currentPhase": "requirements | srs | sds | implementation | testing | fat | delivery",
  "startDate": "Date",
  "targetEndDate": "Date",
  "members": [{ "userId": "ObjectId", "role": "string", "addedAt": "Date" }],
  "tags": ["string"],
  "createdBy": "ObjectId",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### Requirements Collection
```json
{
  "_id": "ObjectId",
  "projectId": "ObjectId",
  "reqId": "string (REQ-001)",
  "title": "string",
  "description": "object (rich text JSON)",
  "acceptanceCriteria": "object (rich text JSON)",
  "type": "functional | non_functional | constraint | interface",
  "priority": "critical | high | medium | low",
  "status": "draft | under_review | approved | deprecated",
  "source": "string",
  "tags": ["string"],
  "assignedTo": "ObjectId",
  "version": "number",
  "versionHistory": [{ "version": "number", "data": "object", "changedBy": "ObjectId", "changedAt": "Date" }],
  "comments": [{ "userId": "ObjectId", "text": "string", "createdAt": "Date" }],
  "createdBy": "ObjectId",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### TraceLinks Collection
```json
{
  "_id": "ObjectId",
  "projectId": "ObjectId",
  "sourceType": "requirement | srs_section | sds_component | test_case | fat_item",
  "sourceId": "ObjectId",
  "targetType": "requirement | srs_section | sds_component | test_case | fat_item",
  "targetId": "ObjectId",
  "linkType": "derives | verifies | implements | tests",
  "createdBy": "ObjectId",
  "createdAt": "Date"
}
```

### Documents Collection (SRS, SDS, FAT Plans, Reports)
```json
{
  "_id": "ObjectId",
  "projectId": "ObjectId",
  "type": "srs | sds | fat_plan | fat_report | verification_matrix",
  "title": "string",
  "status": "draft | in_review | client_review | approved | superseded",
  "version": "string (1.0, 1.1, ...)",
  "sections": [{ "id": "string", "title": "string", "content": "object", "linkedReqs": ["ObjectId"] }],
  "reviewers": [{ "userId": "ObjectId", "status": "pending | approved | rejected", "signedAt": "Date", "comment": "string" }],
  "fileUrl": "string (generated PDF)",
  "createdBy": "ObjectId",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

---

## 6. API Design (RESTful)

```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout
POST   /api/auth/2fa/setup
POST   /api/auth/2fa/verify

GET    /api/projects
POST   /api/projects
GET    /api/projects/:id
PATCH  /api/projects/:id
POST   /api/projects/:id/members

GET    /api/projects/:id/requirements
POST   /api/projects/:id/requirements
GET    /api/projects/:id/requirements/:reqId
PATCH  /api/projects/:id/requirements/:reqId
DELETE /api/projects/:id/requirements/:reqId
POST   /api/projects/:id/requirements/import

GET    /api/projects/:id/tracelinks
POST   /api/projects/:id/tracelinks
DELETE /api/projects/:id/tracelinks/:linkId
GET    /api/projects/:id/traceability/graph   (RTM graph data)
GET    /api/projects/:id/traceability/coverage

GET    /api/projects/:id/documents
POST   /api/projects/:id/documents
GET    /api/projects/:id/documents/:docId
PATCH  /api/projects/:id/documents/:docId
POST   /api/projects/:id/documents/:docId/review
POST   /api/projects/:id/documents/:docId/sign
GET    /api/projects/:id/documents/:docId/export (PDF/DOCX)

GET    /api/projects/:id/tests
POST   /api/projects/:id/tests
GET    /api/projects/:id/fat
POST   /api/projects/:id/fat
```

---

## 7. Frontend Route Structure

```
/login
/register
/dashboard                          ← All projects overview
/projects/new
/projects/:id/                      ← Project home / phase dashboard
/projects/:id/requirements          ← Requirement list & editor
/projects/:id/requirements/:reqId   ← Single requirement detail
/projects/:id/srs                   ← SRS document builder
/projects/:id/sds                   ← SDS document builder
/projects/:id/traceability          ← Interactive RTM graph
/projects/:id/tests                 ← Test case management
/projects/:id/fat                   ← FAT plan & execution
/projects/:id/documents             ← Document centre
/projects/:id/settings              ← Project settings & team
/client/projects/:id/               ← Client portal home
/client/projects/:id/documents      ← Documents for review
/client/projects/:id/traceability   ← Read-only RTM
/settings/profile
/settings/security
/admin/users
/admin/projects
```

---

## 8. Development Phases & Sprint Plan

### Phase 0 — Foundation (Weeks 1–2)
- Repo setup, Docker Compose, ESLint/Prettier, GitHub Actions CI
- MongoDB connection, base Express app
- Auth system (register, login, JWT, refresh, 2FA)
- User model, project model
- Base React app, routing, auth context, protected routes

### Phase 1 — Projects & Requirements (Weeks 3–5)
- Full project CRUD + member management
- Requirements module: CRUD, versioning, comments
- Bulk import from CSV/Excel
- Basic dashboard

### Phase 2 — Documents & Approvals (Weeks 6–8)
- SRS builder (sections, embedding requirements)
- Document review & sign-off workflow
- PDF/DOCX export
- Client portal (read-only + sign-off)
- Notification system (email + in-app)

### Phase 3 — Traceability (Weeks 9–11)
- TraceLinks CRUD API
- RTM graph frontend (React Flow)
- Coverage metrics
- Orphan detection

### Phase 4 — SDS, Testing, FAT (Weeks 12–15)
- SDS builder (uses existing Document model + SDS-specific section template)
- Test case management (TestCase model linked to requirements)
- Test run execution (TestRun model — pass/fail/blocked/na per run, history)
- FAT plan builder: checklist items with pass/fail/observations + per-item client sign-off
- Punch list: auto-derived view of failed FAT items (no separate model)
- NOTE: Full punch list rework tracking (assignee, re-test loop, resolution notes) → Future Work

### Phase 5 — Verification, Polish, Deployment (Weeks 16–18)
- Verification matrix
- Integration test management
- Audit trail UI
- Performance optimisation
- Production Docker build + deployment docs

---

## 11. Implementation Notes (updated as built)

### Package decisions
- `@react-pdf/renderer` used for PDF generation (not Puppeteer — lighter, no headless Chrome)
- `@xyflow/react` used for RTM graph (maintained successor to `reactflow`)
- `react` + `react-dom` added to backend `dependencies` (required by `@react-pdf/renderer` at runtime)
- Radix UI `Badge` does not exist — `Badge` is a plain styled `div` with CVA

### Auth / middleware
- JWT payload uses `sub` (not `userId`) for the user ID — all controllers use `req.user!.sub`
- `GET /api/auth/me` endpoint added in Phase 2

### Docker / dev workflow
- `tsx watch` does NOT detect file changes via bind mounts on Windows — always use `docker compose up -d --force-recreate backend` after code changes
- After adding new npm packages: `docker compose build backend` first, then `--force-recreate --renew-anon-volumes`
- Docker context must be `desktop-linux` on this machine
- Prefix `docker exec` commands with `MSYS_NO_PATHCONV=1` in Git Bash

### Settings
- Settings PATCH/logo routes use `requireAuth` only (no `super_admin` guard) — all authenticated users can update company settings

---

## 12. Future Work (deferred, not in current phase plan)

| Feature | Deferred From | Notes |
|---------|---------------|-------|
| Email notifications | Phase 2 | Nodemailer + SendGrid/SES; mark "to add" in README |
| Client portal | Phase 2 | Stripped-down read-only + sign-off view for external clients |
| Punch list rework tracking | Phase 4 | Assignee, re-test loop, resolution notes per failed FAT item |
| Rich text editor (Tiptap) | Phase 1+ | Plain textarea used; Tiptap integration deferred |
| WebSocket real-time collab | Phase 2+ | Socket.io for live notifications / concurrent editing |
| RTM export (Excel/PDF) | Phase 3 | Graph export button; needs server-side rendering |
| Bulk FAT item import | Phase 4 | CSV import for FAT checklist items |
| OpenAPI/Swagger SDS editor | Phase 4+ | Inline API spec editor within SDS sections |

---

## 9. Key Design Principles

1. **Traceability First** — every artefact links back to a requirement
2. **Version Everything** — no destructive edits; full audit trail on all changes
3. **Client Trust** — client portal is clean, professional, never exposes internal chatter
4. **Offline-Resilient** — optimistic UI updates, queue-based background jobs
5. **Export Anywhere** — every major artefact exportable as PDF and DOCX
6. **Standards-Aware** — templates aligned to IEEE 830 (SRS), IEEE 1016 (SDS), and ISO 29119 (Testing)

---

## 10. Security Checklist

- [ ] Passwords hashed with bcrypt (cost factor ≥ 12)
- [ ] JWT secrets rotated, short expiry (15 min access, 7 day refresh)
- [ ] HTTPS enforced in production (HSTS header)
- [ ] Rate limiting on auth endpoints (express-rate-limit)
- [ ] Input validation and sanitisation on all endpoints (Zod schemas)
- [ ] MongoDB injection prevention (Mongoose + parameterised queries)
- [ ] XSS prevention (DOMPurify on rich text output)
- [ ] CORS configured to allowed origins only
- [ ] Helmet.js HTTP headers
- [ ] File upload validation (MIME type + size limits)
- [ ] Sensitive fields (TOTP secrets) encrypted at rest
- [ ] Client data isolation (every query scoped to projectId + membership check)

---