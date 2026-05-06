-- Create enums
CREATE TYPE "LiveRecordingStatus" AS ENUM ('LOCAL_PENDING', 'UPLOADING', 'UPLOADED', 'FAILED', 'PROCESSING', 'READY');
CREATE TYPE "RecordingSourceType" AS ENUM ('LIVE_RECORDING', 'MANUAL_UPLOAD');
CREATE TYPE "UploadSessionStatus" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED', 'EXPIRED', 'CANCELLED');

-- CreateTable LiveRecording
CREATE TABLE "LiveRecording" (
    "id" TEXT NOT NULL,
    "streamId" TEXT,
    "userId" TEXT,
    "propertyId" TEXT,
    "title" TEXT NOT NULL,
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
    "uploadedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LiveRecording_pkey" PRIMARY KEY ("id")
);

-- CreateTable UploadSession
CREATE TABLE "UploadSession" (
    "id" TEXT NOT NULL,
    "recordingId" TEXT NOT NULL,
    "userId" TEXT,
    "uploadId" TEXT NOT NULL,
    "status" "UploadSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "totalChunks" INTEGER NOT NULL,
    "uploadedChunks" INTEGER NOT NULL DEFAULT 0,
    "chunkSize" INTEGER NOT NULL,
    "fileSize" BIGINT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UploadSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex LiveRecording
CREATE INDEX "LiveRecording_userId_idx" ON "LiveRecording"("userId");
CREATE INDEX "LiveRecording_streamId_idx" ON "LiveRecording"("streamId");
CREATE INDEX "LiveRecording_status_idx" ON "LiveRecording"("status");
CREATE INDEX "LiveRecording_muxAssetId_idx" ON "LiveRecording"("muxAssetId");
CREATE INDEX "LiveRecording_userId_fileName_fileSize_idx" ON "LiveRecording"("userId", "fileName", "fileSize");

-- CreateIndex UploadSession
CREATE UNIQUE INDEX "UploadSession_uploadId_key" ON "UploadSession"("uploadId");
CREATE INDEX "UploadSession_recordingId_idx" ON "UploadSession"("recordingId");
CREATE INDEX "UploadSession_userId_idx" ON "UploadSession"("userId");

-- AddForeignKey LiveRecording
ALTER TABLE "LiveRecording" ADD CONSTRAINT "LiveRecording_streamId_fkey" FOREIGN KEY ("streamId") REFERENCES "LiveSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey UploadSession
ALTER TABLE "UploadSession" ADD CONSTRAINT "UploadSession_recordingId_fkey" FOREIGN KEY ("recordingId") REFERENCES "LiveRecording"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add backrelation to LiveSession
ALTER TABLE "LiveSession" ADD CONSTRAINT "LiveSession_has_LiveRecordings" FOREIGN KEY ("id") REFERENCES "LiveRecording"("streamId") ON DELETE SET NULL ON UPDATE CASCADE;
