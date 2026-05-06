CREATE TABLE IF NOT EXISTS "LiveSessionSegment" (
  "id" TEXT NOT NULL,
  "liveSessionId" TEXT NOT NULL,
  "muxAssetId" TEXT NOT NULL,
  "playbackId" TEXT,
  "status" TEXT,
  "sequence" INTEGER NOT NULL,
  "readyAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LiveSessionSegment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "LiveSessionSegment_muxAssetId_key" ON "LiveSessionSegment"("muxAssetId");
CREATE UNIQUE INDEX IF NOT EXISTS "LiveSessionSegment_liveSessionId_sequence_key" ON "LiveSessionSegment"("liveSessionId", "sequence");
CREATE INDEX IF NOT EXISTS "LiveSessionSegment_liveSessionId_idx" ON "LiveSessionSegment"("liveSessionId");
CREATE INDEX IF NOT EXISTS "LiveSessionSegment_playbackId_idx" ON "LiveSessionSegment"("playbackId");

ALTER TABLE "LiveSessionSegment"
ADD CONSTRAINT "LiveSessionSegment_liveSessionId_fkey"
FOREIGN KEY ("liveSessionId") REFERENCES "LiveSession"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
