-- Safety migration: mark all existing staff accounts as email-verified.
-- Staff accounts (ADMIN, SUPER_ADMIN, REVIEWER, SCHEDULER) are now required
-- to have isEmailVerified = true to log in.  Seed and invite flows already
-- set this flag, but any accounts created before that change are updated here
-- to prevent lockout on the next deployment.
UPDATE "users"
SET "is_email_verified" = true
WHERE "role" IN ('ADMIN', 'SUPER_ADMIN', 'REVIEWER', 'SCHEDULER')
  AND "is_email_verified" = false;
