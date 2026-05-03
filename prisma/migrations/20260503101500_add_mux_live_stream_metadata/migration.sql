ALTER TABLE "LiveSession"
ADD COLUMN IF NOT EXISTS "muxLiveStreamId" TEXT,
ADD COLUMN IF NOT EXISTS "rtmpUrl" TEXT;

ALTER TABLE "LiveSession"
ALTER COLUMN "streamProvider" DROP NOT NULL,
ALTER COLUMN "streamProvider" SET DEFAULT 'mux';

UPDATE "LiveSession"
SET "streamProvider" = 'mux'
WHERE "streamProvider" = 'MUX';

CREATE INDEX IF NOT EXISTS "LiveSession_muxLiveStreamId_idx" ON "LiveSession"("muxLiveStreamId");
