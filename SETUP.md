# Scholarship Management System — Setup Guide

## Prerequisites
- Node.js 18+
- PostgreSQL 14+ running locally
- Git

---

## 1. Database Setup

Create the PostgreSQL database:

```bash
psql -U postgres
CREATE DATABASE scholarship_db;
\q
```

---

## 2. Server Setup

```bash
cd server
npm install

# Configure environment
cp .env .env.local   # Edit with your DB credentials

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# Seed the database (creates admin + test accounts)
node src/db/seed.js
```

**Default credentials after seeding:**
- Admin: `admin@scholarship.edu.ph` / `Admin@2024`
- Test applicant: `applicant@test.com` / `Test@2024`

---

## 3. Client Setup

```bash
cd client
npm install
```

---

## 4. Run Development Servers

**Terminal 1 (backend):**
```bash
cd server
npm run dev
# Runs on http://localhost:5000
```

**Terminal 2 (frontend):**
```bash
cd client
npm run dev
# Runs on http://localhost:5173
```

---

## 5. Access the App

| URL | Description |
|-----|-------------|
| `http://localhost:5173` | Landing page |
| `http://localhost:5173/login` | Login |
| `http://localhost:5173/register` | Register as applicant |
| `http://localhost:5173/applicant/dashboard` | Applicant portal |
| `http://localhost:5173/admin/dashboard` | Admin portal |
| `http://localhost:5000/api/health` | API health check |

---

## Application Status Flow

```
pending_review → incomplete → pending_review (loop)
pending_review → eligibility_screening
eligibility_screening → not_qualified → rejected
eligibility_screening → exam_interview
exam_interview → failed_exam → rejected
exam_interview → approved
approved → cor_submitted
cor_submitted → cor_rejected → cor_submitted (loop)
cor_submitted → accepted 🎉
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS v3 |
| Routing | React Router v6 |
| State | Zustand |
| Forms | React Hook Form |
| Backend | Node.js + Express |
| Database | PostgreSQL + Prisma ORM |
| Auth | JWT (access + refresh tokens) |
| File Uploads | Multer → local /uploads |
| Email | Nodemailer |

---

## Email Configuration (server/.env)

For email notifications to work, configure SMTP:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your_app_password   # Gmail App Password
EMAIL_FROM="Scholarship System <your@gmail.com>"
```

> **Note:** Email failures are non-fatal — the system continues working even if email is unconfigured.
