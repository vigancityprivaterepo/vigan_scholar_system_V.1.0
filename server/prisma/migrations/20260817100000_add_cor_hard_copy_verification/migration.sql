-- AlterTable: track physical hard-copy COR verification on applications
ALTER TABLE "applications"
  ADD COLUMN IF NOT EXISTS "cor_hard_copy_received_at" TIMESTAMP(3);
ALTER TABLE "applications"
  ADD COLUMN IF NOT EXISTS "cor_hard_copy_received_by_id" TEXT;

DO $$ BEGIN
  ALTER TABLE "applications"
    ADD CONSTRAINT "applications_cor_hard_copy_received_by_id_fkey"
    FOREIGN KEY ("cor_hard_copy_received_by_id") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
