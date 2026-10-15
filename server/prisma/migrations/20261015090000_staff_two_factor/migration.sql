-- Staff two-step sign-in (authenticator app)

ALTER TABLE "users"
  ADD COLUMN "totp_secret" TEXT,
  ADD COLUMN "totp_pending_secret" TEXT,
  ADD COLUMN "totp_enabled_at" TIMESTAMP(3),
  ADD COLUMN "totp_last_used_step" INTEGER,
  ADD COLUMN "totp_backup_codes" JSONB;

ALTER TABLE "refresh_tokens"
  ADD COLUMN "two_factor_verified" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "trusted_devices" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "user_agent" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "last_used_at" TIMESTAMP(3),
  CONSTRAINT "trusted_devices_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "trusted_devices_token_hash_key" ON "trusted_devices"("token_hash");
CREATE INDEX "trusted_devices_user_id_idx" ON "trusted_devices"("user_id");

ALTER TABLE "trusted_devices"
  ADD CONSTRAINT "trusted_devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
