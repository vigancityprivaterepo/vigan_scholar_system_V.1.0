-- Role expansion
DO $$ BEGIN
  ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'REVIEWER';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'SCHEDULER';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Applications: academic year + requirement checklist
ALTER TABLE "applications"
  ADD COLUMN IF NOT EXISTS "academic_year" TEXT,
  ADD COLUMN IF NOT EXISTS "requirement_checklist" JSONB;

CREATE INDEX IF NOT EXISTS "applications_academic_year_idx" ON "applications"("academic_year");

-- Communication logs
CREATE TABLE IF NOT EXISTS "communication_logs" (
  "id" TEXT NOT NULL,
  "application_id" TEXT,
  "user_id" TEXT,
  "channel" TEXT NOT NULL,
  "direction" TEXT NOT NULL DEFAULT 'OUTBOUND',
  "subject" TEXT,
  "message" TEXT,
  "metadata" JSONB,
  "created_by_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "communication_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "communication_logs_application_id_created_at_idx" ON "communication_logs"("application_id", "created_at");
CREATE INDEX IF NOT EXISTS "communication_logs_user_id_created_at_idx" ON "communication_logs"("user_id", "created_at");

ALTER TABLE "communication_logs"
  ADD CONSTRAINT "communication_logs_application_id_fkey"
  FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "communication_logs"
  ADD CONSTRAINT "communication_logs_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "communication_logs"
  ADD CONSTRAINT "communication_logs_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Email jobs
CREATE TABLE IF NOT EXISTS "email_jobs" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "payload" JSONB NOT NULL,
  "created_by_id" TEXT,
  "run_at" TIMESTAMP(3) NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "max_attempts" INTEGER NOT NULL DEFAULT 3,
  "last_error" TEXT,
  "processed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "email_jobs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "email_jobs_status_run_at_idx" ON "email_jobs"("status", "run_at");
ALTER TABLE "email_jobs"
  ADD CONSTRAINT "email_jobs_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Appeals / reconsideration
CREATE TABLE IF NOT EXISTS "appeals" (
  "id" TEXT NOT NULL,
  "application_id" TEXT NOT NULL,
  "applicant_id" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "resolution" TEXT,
  "reviewed_by_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "appeals_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "appeals_application_id_status_idx" ON "appeals"("application_id", "status");
CREATE INDEX IF NOT EXISTS "appeals_applicant_id_created_at_idx" ON "appeals"("applicant_id", "created_at");

ALTER TABLE "appeals"
  ADD CONSTRAINT "appeals_application_id_fkey"
  FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "appeals"
  ADD CONSTRAINT "appeals_applicant_id_fkey"
  FOREIGN KEY ("applicant_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "appeals"
  ADD CONSTRAINT "appeals_reviewed_by_id_fkey"
  FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
