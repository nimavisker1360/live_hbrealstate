ALTER TABLE "LikeEvent" ADD COLUMN "userId" TEXT;

CREATE INDEX "LikeEvent_liveSessionId_userId_createdAt_idx" ON "LikeEvent"("liveSessionId", "userId", "createdAt");
CREATE INDEX "LikeEvent_userId_idx" ON "LikeEvent"("userId");

ALTER TABLE "LikeEvent"
  ADD CONSTRAINT "LikeEvent_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
