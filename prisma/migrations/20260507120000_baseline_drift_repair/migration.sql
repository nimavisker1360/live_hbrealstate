-- Baseline migration to record schema changes already present in production.
-- These objects already exist in the database; this migration is marked as
-- applied via `prisma migrate resolve --applied` so it never runs the SQL.
-- The body uses IF NOT EXISTS guards so it is also safe to run on fresh DBs.

-- AlterTable: whatsappClicks already exists in production
ALTER TABLE "LiveSession" ADD COLUMN IF NOT EXISTS "whatsappClicks" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex: LikeEvent index already exists in production
CREATE INDEX IF NOT EXISTS "LikeEvent_liveSessionId_idx" ON "LikeEvent"("liveSessionId");
