# 🚀 NEXUS — Full-Lifecycle SDLC Management Platform

> **From Requirements → Design → Testing → Delivery — Fully Traceable. Fully Controlled.**

---

## 📌 Overview

**NEXUS** is an end-to-end **Software Development Lifecycle (SDLC) management platform** built for engineering teams and their clients.

It unifies **requirements, design, traceability, testing, verification, and delivery** into a single system — eliminating fragmentation across tools like Jira, Confluence, spreadsheets, and email threads.

> ⚡ Built for teams that need **auditability, compliance, and precision**, not just task tracking.

---

## 🧠 Core Philosophy

* **Traceability First** — Every artifact links back to a requirement
* **Version Everything** — No destructive edits, full history
* **Client Trust** — Clean external-facing approval workflows
* **Engineering Rigor** — Designed with IEEE & ISO standards in mind

---

## 🔥 Key Features

### 🔐 Authentication & Security

* JWT-based authentication (access + refresh tokens)
* Role-Based Access Control (RBAC)
* Two-Factor Authentication (TOTP)
* Full audit logging

---

### 📁 Project Management

* Isolated project workspaces
* Phase tracking (Requirements → SRS → SDS → Testing → FAT → Delivery)
* Team roles & permissions
* Activity logs & milestone tracking

---

### 🧾 Requirements Management

* Structured requirement system (`REQ-001`, etc.)
* Rich text editing
* Version history & comments
* Bulk import (CSV / Excel)

---

### 📄 Document Centre ✅ *Live*

* Multi-type documents: SRS, SDS, FAT Plan, FAT Report, Verification Matrix
* IEEE 830 section structure auto-seeded for SRS documents
* Section-by-section editor with linked requirements display
* PDF export via `@react-pdf/renderer` — cover page, watermark, TOC, company logo
* Internal review workflow: draft → in\_review → client\_review → approved
* Rejection reverts document to draft for rework
* In-app notification bell with unread badge for all review events

---

### 🏗️ SDS (Design System)

* Architecture & component design
* API specification (OpenAPI)
* Diagram support
* Requirement trace linking

---

### 🔗 Interactive Traceability Matrix (RTM) — ⭐ Core Feature

* Graph-based traceability:

  ```
  Requirements → SRS → SDS → Tests → FAT
  ```
* Coverage metrics
* Orphan detection
* Exportable reports

---

### 🧪 Testing & QA ✅ *Live*

* Test cases with auto-assigned IDs (`TC-001`, etc.) linked to requirements
* Step-by-step test definition with run logging (pass / fail / blocked)
* Full run history per test case
* Filter by status; search by title

---

### 🏭 FAT (Factory Acceptance Testing) ✅ *Live*

* FAT plans with ordered checklist items
* Per-item execution: pass / fail / blocked + observations
* Per-item client sign-off with timestamp
* Plan auto-completes when all items have results
* Automated FAT report with pass rate and punch list (failed items flagged for rework)

---

### ✅ Verification Matrix ✅ *Live*

* Singleton V&V matrix per project
* Entries keyed by requirement + method (test / review / analysis / demonstration)
* Prevents duplicate req+method combinations (409)
* Auto-populate: derives test entries from test case links, review entries from trace links
* Status tracking: planned → in_progress → verified / failed
* `verifiedBy` and `verifiedAt` auto-set on first `verified` transition
* Summary dashboard: coverage %, verified / failed / planned counts

---

### 📋 Audit Trail ✅ *Live*

* Immutable append-only event log for all key actions
* Project-scoped log and global log (with action / entityType filters)
* Paginated timeline UI with action badges and actor info
* Silent writes — audit failures never break the main API response
* Covers: user register/login, requirement create, document create/submit/approve, verification entry changes

---

### 📦 Document & Approval System ✅ *Live*

* Version-controlled documents with status workflow
* Multi-reviewer approval with per-reviewer sign-off tracking
* PDF generation with company logo, watermarks, and IEEE 830 layout
* Company settings (name, logo) configurable from the Settings page
* In-app notifications for review requests, approvals, and rejections
* Email notifications — *to add* (configurable/optional, planned post-core)

---

## 🏗️ Architecture

### Backend

* Node.js + TypeScript
* Express / Fastify
* MongoDB (Mongoose)
* JWT + bcrypt + TOTP
* Redis (queues)

### Frontend

* React 18 + TypeScript
* Zustand + React Query
* Tailwind + Radix UI
* React Flow (RTM graph)

### 🔎 Global Search ✅ *Live*

* `Cmd+K` / `Ctrl+K` command palette available from any page
* Searches across requirements (title, REQ-ID), documents (title), and test cases simultaneously
* Cross-project: searches all projects the user has access to
* Debounced 250ms, keyboard navigable (↑↓ Enter Esc), result type badges

---

### 🏗️ Infrastructure

* Docker + Docker Compose (dev: bind-mount + tsx watch)
* Multi-stage production Dockerfiles — TypeScript compile → slim Node runtime; Vite build → nginx serve
* `docker-compose.prod.yml` — `NODE_ENV=production`, CPU/memory resource limits, named upload volume
* GitHub Actions (CI/CD)
* S3 / MinIO (file storage)

---

## 🧩 System Modules

| Module               | Description                                             | Status |
| -------------------- | ------------------------------------------------------- | ------ |
| Requirements         | Capture, version, and manage requirements               | ✅ Live |
| Documents            | SRS / SDS / FAT docs, IEEE 830 template, PDF export     | ✅ Live |
| Traceability (RTM)   | Interactive graph, coverage metrics, orphan detection   | ✅ Live |
| Testing              | Test cases, run history, linked requirements            | ✅ Live |
| FAT                  | Client acceptance workflow, punch list, sign-off        | ✅ Live |
| Verification Matrix  | V&V coverage by method, auto-populate, verified/failed  | ✅ Live |
| Audit Trail          | Full event log, global + project-scoped, paginated      | ✅ Live |
| Notifications        | In-app bell, unread badge, review & approval alerts     | ✅ Live |

---

## 🗺️ Roadmap

* [x] Phase 0 — Foundation: Docker, CI, MongoDB, Auth (JWT + 2FA), User & Project models, React base app
* [x] Phase 1 — Projects & Requirements: full CRUD, member management, versioning, comments, CSV import, Tailwind + Radix UI design system
* [x] Phase 2 — Documents & Approvals: multi-type document builder, IEEE 830 SRS template, section editor, review/sign-off workflow, PDF export with logo, in-app notifications, company settings
* [x] Phase 3 — Traceability (RTM): TraceLink CRUD, interactive `@xyflow/react` graph, coverage metrics, orphan detection, node detail drawer, type/status filters
* [x] Phase 4 — SDS, Testing & FAT: test cases (TC-001 auto-ID, steps, run history), FAT plan execution (per-item pass/fail/blocked + sign-off, auto-complete, punch list report)
* [x] Phase 5 — Verification, Polish & Deployment: V&V matrix (singleton per project, auto-populate from test links, coverage summary), full audit trail (project-scoped + global, paginated, action/entityType filters), production multi-stage Dockerfiles + `docker-compose.prod.yml` with resource limits
* [x] Phase 6 — UX Polish: analytics dashboard (stats cards + recent activity feed + skeleton loaders), breadcrumb navigation in topbar, global `Cmd+K` search palette (cross-project requirements/documents/tests), toast notification system wired to all key mutations

---

## ⚙️ Getting Started

```bash
# Clone repo
git clone https://github.com/yourusername/nexus.git

# Navigate
cd nexus

# Start services
docker-compose up --build
```

---

## 🔐 Security

* bcrypt password hashing
* JWT with rotation
* Rate limiting
* Input validation (Zod)
* XSS protection
* Strict RBAC enforcement

---

## 📊 Why NEXUS?

| Problem             | Solution                    |
| ------------------- | --------------------------- |
| Scattered tools     | Unified SDLC platform       |
| Poor traceability   | End-to-end RTM              |
| Client misalignment | Built-in approval workflows |
| Compliance gaps     | Audit-ready system          |

---

## 🎯 Target Users

* Software Houses
* Enterprise Engineering Teams
* Regulated Industries (Fintech, Healthcare, Gov)
* Systems Engineering Teams

---

## 🤝 Contributing

Currently private / early-stage. Contribution guidelines coming soon.

---

## 📄 License

TBD

---

## 🧠 Final Thought

> Most tools manage *tasks*.
> **NEXUS manages the *truth* of your system.**

---
