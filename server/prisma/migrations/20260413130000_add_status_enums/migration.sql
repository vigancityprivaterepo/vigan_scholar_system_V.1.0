-- Migration: Replace plain-string status fields with proper enums
-- Covers AppealStatus (appeals.status) and EmailJobStatus (email_jobs.status)

-- 1. AppealStatus enum
CREATE TYPE "AppealStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED');

ALTER TABLE "appeals"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "AppealStatus"
    USING "status"::"AppealStatus",
  ALTER COLUMN "status" SET DEFAULT 'PENDING'::"AppealStatus";

-- 2. EmailJobStatus enum
CREATE TYPE "EmailJobStatus" AS ENUM ('PENDING', 'RETRY', 'FAILED', 'COMPLETED');

ALTER TABLE "email_jobs"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "EmailJobStatus"
    USING CASE "status"
      WHEN 'PENDING'   THEN 'PENDING'::"EmailJobStatus"
      WHEN 'RETRY'     THEN 'RETRY'::"EmailJobStatus"
      WHEN 'FAILED'    THEN 'FAILED'::"EmailJobStatus"
      WHEN 'COMPLETED' THEN 'COMPLETED'::"EmailJobStatus"
      ELSE 'PENDING'::"EmailJobStatus"
    END,
  ALTER COLUMN "status" SET DEFAULT 'PENDING'::"EmailJobStatus";
