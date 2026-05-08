-- Add persistent threaded replies for property reel comments.
ALTER TABLE "VideoTourComment" ADD COLUMN "parentId" TEXT;
ALTER TABLE "VideoTourComment" ADD COLUMN "isPinned" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "VideoTourComment" ADD COLUMN "likeCount" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "VideoTourComment_videoTourId_parentId_createdAt_idx" ON "VideoTourComment"("videoTourId", "parentId", "createdAt");
CREATE INDEX "VideoTourComment_videoTourId_isPinned_likeCount_createdAt_idx" ON "VideoTourComment"("videoTourId", "isPinned", "likeCount", "createdAt");
CREATE INDEX "VideoTourComment_parentId_idx" ON "VideoTourComment"("parentId");

ALTER TABLE "VideoTourComment" ADD CONSTRAINT "VideoTourComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "VideoTourComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
