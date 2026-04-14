-- Migration: Replace plain-string channel/direction fields with proper enums

-- 1. CommunicationChannel enum
CREATE TYPE "CommunicationChannel" AS ENUM ('EMAIL', 'IN_APP', 'PORTAL_NOTICE', 'SMS');

ALTER TABLE "communication_logs"
  ALTER COLUMN "channel" TYPE "CommunicationChannel"
    USING "channel"::"CommunicationChannel";

-- 2. CommunicationDirection enum
CREATE TYPE "CommunicationDirection" AS ENUM ('INBOUND', 'OUTBOUND');

ALTER TABLE "communication_logs"
  ALTER COLUMN "direction" DROP DEFAULT;

ALTER TABLE "communication_logs"
  ALTER COLUMN "direction" TYPE "CommunicationDirection"
    USING "direction"::"CommunicationDirection";

ALTER TABLE "communication_logs"
  ALTER COLUMN "direction" SET DEFAULT 'OUTBOUND'::"CommunicationDirection";
