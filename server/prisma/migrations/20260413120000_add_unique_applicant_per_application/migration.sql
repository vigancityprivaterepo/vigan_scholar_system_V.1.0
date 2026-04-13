-- One applicant may only have one application at a time.
-- Replace the plain index on applicant_id with a unique constraint so the
-- database enforces this rule, preventing race-condition duplicates that the
-- application-layer check alone cannot catch.

-- DropIndex
DROP INDEX IF EXISTS "applications_applicant_id_idx";

-- CreateIndex
CREATE UNIQUE INDEX "applications_applicant_id_key" ON "applications"("applicant_id");
