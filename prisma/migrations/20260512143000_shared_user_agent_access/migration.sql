CREATE TYPE "UserStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED');

ALTER TABLE "User"
  ADD COLUMN "agencyName" TEXT,
  ADD COLUMN "passwordHash" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "status" "UserStatus" NOT NULL DEFAULT 'PENDING';

UPDATE "User"
SET "email" = "id" || '@missing-email.local'
WHERE "email" IS NULL OR btrim("email") = '';

ALTER TABLE "User" ALTER COLUMN "email" SET NOT NULL;

UPDATE "User" AS u
SET "agencyName" = a."company"
FROM "Agent" AS a
WHERE a."userId" = u."id" AND u."agencyName" IS NULL;

CREATE TYPE "UserRole_new" AS ENUM ('ADMIN', 'AGENT');

ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User"
  ALTER COLUMN "role" TYPE "UserRole_new"
  USING (
    CASE
      WHEN "role"::text = 'OWNER' THEN 'ADMIN'::"UserRole_new"
      ELSE 'AGENT'::"UserRole_new"
    END
  );
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'AGENT';

UPDATE "User" AS u
SET "status" =
  CASE
    WHEN u."role"::text = 'ADMIN' THEN 'ACTIVE'::"UserStatus"
    WHEN EXISTS (
      SELECT 1
      FROM "Agent" AS a
      WHERE a."userId" = u."id" AND a."status"::text = 'ACTIVE'
    ) THEN 'ACTIVE'::"UserStatus"
    ELSE 'PENDING'::"UserStatus"
  END;

DROP TYPE "UserRole";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";

CREATE TYPE "AgentStatus_new" AS ENUM ('ACTIVE', 'PENDING', 'SUSPENDED', 'REJECTED');

ALTER TABLE "Agent" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Agent"
  ALTER COLUMN "status" TYPE "AgentStatus_new"
  USING (
    CASE
      WHEN "status"::text = 'PAUSED' THEN 'SUSPENDED'::"AgentStatus_new"
      ELSE ("status"::text)::"AgentStatus_new"
    END
  );
ALTER TABLE "Agent" ALTER COLUMN "status" SET DEFAULT 'PENDING';

DROP TYPE "AgentStatus";
ALTER TYPE "AgentStatus_new" RENAME TO "AgentStatus";
