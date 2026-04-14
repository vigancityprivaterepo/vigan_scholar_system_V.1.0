-- Idempotent enum bootstrap — run before prisma db push on every startup.
-- prisma db push cannot cast existing text columns to enum types, so we do it
-- here with USING clauses and guard each step so it is safe to re-run.

-- 1. Create CommunicationChannel enum (no-op if already exists)
DO $$ BEGIN
  CREATE TYPE "CommunicationChannel" AS ENUM ('EMAIL', 'IN_APP', 'PORTAL_NOTICE', 'SMS');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Create CommunicationDirection enum (no-op if already exists)
DO $$ BEGIN
  CREATE TYPE "CommunicationDirection" AS ENUM ('INBOUND', 'OUTBOUND');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Cast channel column if it is still a plain text column.
--    PERFORM returns no rows if the table does not exist yet, so IF FOUND
--    is false on first-ever startup — the ALTER is skipped safely.
DO $$ BEGIN
  PERFORM 1 FROM information_schema.columns
    WHERE table_name = 'communication_logs'
      AND column_name = 'channel'
      AND data_type   = 'text';
  IF FOUND THEN
    ALTER TABLE "communication_logs"
      ALTER COLUMN "channel" TYPE "CommunicationChannel"
        USING "channel"::"CommunicationChannel";
  END IF;
END $$;

-- 4. Cast direction column if it is still a plain text column.
DO $$ BEGIN
  PERFORM 1 FROM information_schema.columns
    WHERE table_name = 'communication_logs'
      AND column_name = 'direction'
      AND data_type   = 'text';
  IF FOUND THEN
    ALTER TABLE "communication_logs" ALTER COLUMN "direction" DROP DEFAULT;
    ALTER TABLE "communication_logs"
      ALTER COLUMN "direction" TYPE "CommunicationDirection"
        USING "direction"::"CommunicationDirection";
    ALTER TABLE "communication_logs"
      ALTER COLUMN "direction" SET DEFAULT 'OUTBOUND'::"CommunicationDirection";
  END IF;
END $$;
