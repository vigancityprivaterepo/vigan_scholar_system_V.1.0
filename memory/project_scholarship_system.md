---
name: Scholarship Management System — Project Overview
description: Full-stack scholarship portal built with React+Vite (client) and Node.js+Express+Prisma (server). Status: complete initial build.
type: project
---

Full-stack Scholarship Management System built from scratch on 2026-03-30.

**Tech stack:** React 18 + Vite + Tailwind CSS + Zustand + React Router (client); Node.js + Express + Prisma + PostgreSQL + JWT + Multer + Nodemailer (server).

**Structure:**
- `/server` — Express API on port 5000
- `/client` — Vite React app on port 5173

**Database:** PostgreSQL via Prisma ORM. Schema has 8 models: User, Application, RequirementFile, CorFile, Notification, ActivityLog, ExamSchedule, RefreshToken.

**Application status flow (strict business rules enforced server-side):**
PENDING_REVIEW → INCOMPLETE ↔ PENDING_REVIEW (loop)
PENDING_REVIEW → ELIGIBILITY_SCREENING → NOT_QUALIFIED → REJECTED
ELIGIBILITY_SCREENING → EXAM_INTERVIEW → FAILED_EXAM → REJECTED
EXAM_INTERVIEW → APPROVED → COR_SUBMITTED → COR_REJECTED ↔ COR_SUBMITTED (loop)
COR_SUBMITTED → ACCEPTED

**Seed credentials:**
- Admin: admin@scholarship.edu.ph / Admin@2024
- Test applicant: applicant@test.com / Test@2024

**Setup:** `cd server && npm install && npx prisma migrate dev --name init && node src/db/seed.js && npm run dev`; `cd client && npm install && npm run dev`

**Why:** User requested complete build from scratch. All 56+ files written in one session.

**How to apply:** When user asks to continue, add features, or fix bugs on this project, reference this structure. Do not re-initialize — project is already fully scaffolded.
