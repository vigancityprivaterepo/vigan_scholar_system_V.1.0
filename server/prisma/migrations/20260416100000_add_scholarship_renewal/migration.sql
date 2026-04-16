-- CreateEnum
CREATE TYPE "RenewalStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED');

-- CreateTable: scholarship_renewals
CREATE TABLE "scholarship_renewals" (
  "id"             TEXT          NOT NULL,
  "applicant_id"   TEXT          NOT NULL,
  "application_id" TEXT          NOT NULL,
  "status"         "RenewalStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
  "academic_year"  TEXT,
  "admin_remarks"  TEXT,
  "submitted_at"   TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"     TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "scholarship_renewals_pkey" PRIMARY KEY ("id")
);

-- CreateTable: renewal_files
CREATE TABLE "renewal_files" (
  "id"          TEXT          NOT NULL,
  "renewal_id"  TEXT          NOT NULL,
  "file_name"   TEXT          NOT NULL,
  "file_url"    TEXT          NOT NULL,
  "file_type"   TEXT,
  "doc_type"    TEXT          NOT NULL,
  "uploaded_at" TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "renewal_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scholarship_renewals_applicant_id_status_idx" ON "scholarship_renewals"("applicant_id", "status");

-- AddForeignKey
ALTER TABLE "scholarship_renewals" ADD CONSTRAINT "scholarship_renewals_applicant_id_fkey"
  FOREIGN KEY ("applicant_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "scholarship_renewals" ADD CONSTRAINT "scholarship_renewals_application_id_fkey"
  FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "renewal_files" ADD CONSTRAINT "renewal_files_renewal_id_fkey"
  FOREIGN KEY ("renewal_id") REFERENCES "scholarship_renewals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
