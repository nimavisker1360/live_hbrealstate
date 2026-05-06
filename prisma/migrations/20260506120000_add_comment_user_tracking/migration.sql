ALTER TABLE "Comment" ADD COLUMN "userId" TEXT;

CREATE INDEX "Comment_liveSessionId_userId_createdAt_idx" ON "Comment"("liveSessionId", "userId", "createdAt");
CREATE INDEX "Comment_userId_idx" ON "Comment"("userId");

ALTER TABLE "Comment"
  ADD CONSTRAINT "Comment_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
