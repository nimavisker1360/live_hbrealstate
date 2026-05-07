CREATE TYPE "LiveRecordingStatus" AS ENUM (
  'LOCAL_PENDING',
  'UPLOADING',
  'UPLOADED',
  'FAILED',
  'PROCESSING',
  'READY'
);

CREATE TYPE "RecordingSourceType" AS ENUM (
  'LIVE_RECORDING',
  'MANUAL_UPLOAD'
);

CREATE TYPE "UploadSessionStatus" AS ENUM (
  'PENDING',
  'UPLOADING',
  'COMPLETED',
  'FAILED',
  'EXPIRED'
);

CREATE TABLE "LiveRecording" (
  "id" TEXT NOT NULL,
  "streamId" TEXT,
  "userId" TEXT NOT NULL,
  "propertyId" TEXT,
  "title" TEXT,
  "status" "LiveRecordingStatus" NOT NULL DEFAULT 'LOCAL_PENDING',
  "sourceType" "RecordingSourceType" NOT NULL DEFAULT 'LIVE_RECORDING',
  "fileName" TEXT NOT NULL,
  "fileSize" BIGINT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "storageProvider" TEXT,
  "storageUrl" TEXT,
  "muxAssetId" TEXT,
  "playbackId" TEXT,
  "uploadProgress" INTEGER NOT NULL DEFAULT 0,
  "retryCount" INTEGER NOT NULL DEFAULT 0,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "uploadedAt" TIMESTAMP(3),
  CONSTRAINT "LiveRecording_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UploadSession" (
  "id" TEXT NOT NULL,
  "recordingId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "uploadId" TEXT NOT NULL,
  "status" "UploadSessionStatus" NOT NULL DEFAULT 'PENDING',
  "totalChunks" INTEGER NOT NULL,
  "uploadedChunks" INTEGER NOT NULL DEFAULT 0,
  "chunkSize" INTEGER NOT NULL,
  "fileSize" BIGINT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UploadSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LiveRecording_userId_streamId_fileName_fileSize_key"
  ON "LiveRecording"("userId", "streamId", "fileName", "fileSize")
  NULLS NOT DISTINCT;

CREATE INDEX "LiveRecording_userId_idx" ON "LiveRecording"("userId");
CREATE INDEX "LiveRecording_streamId_idx" ON "LiveRecording"("streamId");
CREATE INDEX "LiveRecording_status_idx" ON "LiveRecording"("status");
CREATE INDEX "LiveRecording_propertyId_idx" ON "LiveRecording"("propertyId");

CREATE UNIQUE INDEX "UploadSession_uploadId_key" ON "UploadSession"("uploadId");
CREATE INDEX "UploadSession_recordingId_idx" ON "UploadSession"("recordingId");
CREATE INDEX "UploadSession_userId_idx" ON "UploadSession"("userId");
CREATE INDEX "UploadSession_status_idx" ON "UploadSession"("status");

ALTER TABLE "LiveRecording"
  ADD CONSTRAINT "LiveRecording_streamId_fkey"
  FOREIGN KEY ("streamId") REFERENCES "LiveSession"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LiveRecording"
  ADD CONSTRAINT "LiveRecording_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LiveRecording"
  ADD CONSTRAINT "LiveRecording_propertyId_fkey"
  FOREIGN KEY ("propertyId") REFERENCES "Property"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "UploadSession"
  ADD CONSTRAINT "UploadSession_recordingId_fkey"
  FOREIGN KEY ("recordingId") REFERENCES "LiveRecording"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UploadSession"
  ADD CONSTRAINT "UploadSession_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
