ALTER TABLE "LiveSession"
ADD COLUMN IF NOT EXISTS "muxAssetId" TEXT,
ADD COLUMN IF NOT EXISTS "recordingPlaybackId" TEXT,
ADD COLUMN IF NOT EXISTS "recordingStatus" TEXT,
ADD COLUMN IF NOT EXISTS "recordingReadyAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "LiveSession_muxAssetId_idx" ON "LiveSession"("muxAssetId");
CREATE INDEX IF NOT EXISTS "LiveSession_recordingPlaybackId_idx" ON "LiveSession"("recordingPlaybackId");
