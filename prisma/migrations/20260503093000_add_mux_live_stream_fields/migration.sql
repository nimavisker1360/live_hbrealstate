ALTER TABLE "LiveSession"
ADD COLUMN "streamProvider" TEXT NOT NULL DEFAULT 'MUX',
ADD COLUMN "streamKey" TEXT,
ADD COLUMN "playbackId" TEXT;

CREATE INDEX "LiveSession_playbackId_idx" ON "LiveSession"("playbackId");
