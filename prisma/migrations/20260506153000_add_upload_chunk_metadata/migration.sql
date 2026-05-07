CREATE TABLE "UploadChunk" (
  "id" TEXT NOT NULL,
  "uploadSessionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "chunkIndex" INTEGER NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "storageProvider" TEXT NOT NULL,
  "storageUrl" TEXT NOT NULL,
  "pathname" TEXT NOT NULL,
  "contentType" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UploadChunk_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UploadChunk_uploadSessionId_chunkIndex_key"
  ON "UploadChunk"("uploadSessionId", "chunkIndex");

CREATE INDEX "UploadChunk_uploadSessionId_idx"
  ON "UploadChunk"("uploadSessionId");

CREATE INDEX "UploadChunk_userId_idx"
  ON "UploadChunk"("userId");

ALTER TABLE "UploadChunk"
  ADD CONSTRAINT "UploadChunk_uploadSessionId_fkey"
  FOREIGN KEY ("uploadSessionId") REFERENCES "UploadSession"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UploadChunk"
  ADD CONSTRAINT "UploadChunk_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
