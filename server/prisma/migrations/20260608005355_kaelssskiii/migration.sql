-- AlterEnum
ALTER TYPE "EmailJobStatus" ADD VALUE 'PROCESSING';

-- AlterTable
ALTER TABLE "appeals" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "applications" ADD COLUMN     "four_ps" BOOLEAN,
ADD COLUMN     "solo_parent" BOOLEAN;

-- AlterTable
ALTER TABLE "email_jobs" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "scholarship_renewals" ALTER COLUMN "updated_at" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "activity_logs_application_id_idx" ON "activity_logs"("application_id");

-- CreateIndex
CREATE INDEX "applications_status_idx" ON "applications"("status");

-- CreateIndex
CREATE INDEX "applications_submitted_at_idx" ON "applications"("submitted_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read");

-- CreateIndex
CREATE INDEX "notifications_application_id_idx" ON "notifications"("application_id");
