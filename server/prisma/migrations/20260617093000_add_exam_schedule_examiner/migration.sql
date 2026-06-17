ALTER TABLE "exam_schedules"
  ADD COLUMN IF NOT EXISTS "examiner_id" TEXT;

CREATE INDEX IF NOT EXISTS "exam_schedules_examiner_id_idx"
  ON "exam_schedules"("examiner_id");

DO $$ BEGIN
  ALTER TABLE "exam_schedules"
    ADD CONSTRAINT "exam_schedules_examiner_id_fkey"
    FOREIGN KEY ("examiner_id") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
