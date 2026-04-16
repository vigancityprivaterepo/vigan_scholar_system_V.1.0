-- Migrate gwa_threshold from old 1.0–5.0 GWA scale to percentage scale (50–99).
-- Applicants must now have a General Average of at least 83% (no grade lower than 80%).
-- Only updates the row if the value is still in the old scale (≤ 5), leaving it alone
-- if an admin already updated it to the new percentage value.

UPDATE "site_settings"
SET "gwa_threshold" = 83.00
WHERE "id" = 'default'
  AND "gwa_threshold" <= 5.00;
