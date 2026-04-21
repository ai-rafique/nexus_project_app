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

### 🧪 Testing & QA

* Test cases linked to requirements
* Test runs & execution tracking
* Defect management
* Coverage reporting

---

### 🏭 FAT (Factory Acceptance Testing)

* FAT plans & execution flows
* Client witness sign-off
* Automated FAT reports
* Punch list tracking

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

### Infrastructure

* Docker + Docker Compose
* GitHub Actions (CI/CD)
* S3 / MinIO (file storage)

---

## 🧩 System Modules

| Module       | Description                               |
| ------------ | ----------------------------------------- |
| Requirements | Capture, version, and manage requirements |
| SRS          | Auto-generated requirement specification  |
| SDS          | System design and architecture            |
| RTM          | Full traceability graph                   |
| Testing      | QA lifecycle management                   |
| FAT          | Client acceptance workflow                |
| Documents    | Versioned approvals & exports             |

---

## 🗺️ Roadmap

* [x] Phase 0 — Foundation: Docker, CI, MongoDB, Auth (JWT + 2FA), User & Project models, React base app
* [x] Phase 1 — Projects & Requirements: full CRUD, member management, versioning, comments, CSV import, Tailwind + Radix UI design system
* [x] Phase 2 — Documents & Approvals: multi-type document builder, IEEE 830 SRS template, section editor, review/sign-off workflow, PDF export with logo, in-app notifications, company settings
* [ ] Phase 3 — Traceability (RTM): trace links, interactive graph (React Flow), coverage metrics, orphan detection
* [ ] Phase 4 — SDS, Testing & FAT: design spec builder, test cases, test runs, FAT execution, client sign-off
* [ ] Phase 5 — Verification, Polish & Deployment: V&V matrix, audit trail UI, production Docker build

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
