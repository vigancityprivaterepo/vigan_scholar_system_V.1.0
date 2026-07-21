-- AlterTable: add interview_score column to applications
ALTER TABLE "applications" ADD COLUMN "interview_score" DECIMAL(5,2);
