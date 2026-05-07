-- CreateEnum
CREATE TYPE "VideoTourStatus" AS ENUM ('DRAFT', 'PROCESSING', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "VideoTour" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "VideoTourStatus" NOT NULL DEFAULT 'DRAFT',
    "blobUrl" TEXT NOT NULL,
    "blobPathname" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "durationSeconds" INTEGER,
    "fileSize" BIGINT,
    "mimeType" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoTour_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoTourLike" (
    "id" TEXT NOT NULL,
    "videoTourId" TEXT NOT NULL,
    "userId" TEXT,
    "visitorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoTourLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoTourComment" (
    "id" TEXT NOT NULL,
    "videoTourId" TEXT NOT NULL,
    "userId" TEXT,
    "agentId" TEXT,
    "visitorId" TEXT,
    "author" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoTourComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoTourOffer" (
    "id" TEXT NOT NULL,
    "videoTourId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "userId" TEXT,
    "buyerName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "OfferStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoTourOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoTourView" (
    "id" TEXT NOT NULL,
    "videoTourId" TEXT NOT NULL,
    "userId" TEXT,
    "visitorId" TEXT,
    "watchedSeconds" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoTourView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VideoTour_slug_key" ON "VideoTour"("slug");

-- CreateIndex
CREATE INDEX "VideoTour_propertyId_idx" ON "VideoTour"("propertyId");

-- CreateIndex
CREATE INDEX "VideoTour_agentId_idx" ON "VideoTour"("agentId");

-- CreateIndex
CREATE INDEX "VideoTour_status_idx" ON "VideoTour"("status");

-- CreateIndex
CREATE INDEX "VideoTour_slug_idx" ON "VideoTour"("slug");

-- CreateIndex
CREATE INDEX "VideoTour_status_publishedAt_idx" ON "VideoTour"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "VideoTourLike_videoTourId_idx" ON "VideoTourLike"("videoTourId");

-- CreateIndex
CREATE INDEX "VideoTourLike_videoTourId_createdAt_idx" ON "VideoTourLike"("videoTourId", "createdAt");

-- CreateIndex
CREATE INDEX "VideoTourLike_userId_idx" ON "VideoTourLike"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VideoTourLike_videoTourId_userId_key" ON "VideoTourLike"("videoTourId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "VideoTourLike_videoTourId_visitorId_key" ON "VideoTourLike"("videoTourId", "visitorId");

-- CreateIndex
CREATE INDEX "VideoTourComment_videoTourId_idx" ON "VideoTourComment"("videoTourId");

-- CreateIndex
CREATE INDEX "VideoTourComment_videoTourId_createdAt_idx" ON "VideoTourComment"("videoTourId", "createdAt");

-- CreateIndex
CREATE INDEX "VideoTourComment_userId_idx" ON "VideoTourComment"("userId");

-- CreateIndex
CREATE INDEX "VideoTourComment_agentId_idx" ON "VideoTourComment"("agentId");

-- CreateIndex
CREATE INDEX "VideoTourOffer_videoTourId_idx" ON "VideoTourOffer"("videoTourId");

-- CreateIndex
CREATE INDEX "VideoTourOffer_agentId_idx" ON "VideoTourOffer"("agentId");

-- CreateIndex
CREATE INDEX "VideoTourOffer_status_idx" ON "VideoTourOffer"("status");

-- CreateIndex
CREATE INDEX "VideoTourOffer_userId_idx" ON "VideoTourOffer"("userId");

-- CreateIndex
CREATE INDEX "VideoTourView_videoTourId_idx" ON "VideoTourView"("videoTourId");

-- CreateIndex
CREATE INDEX "VideoTourView_videoTourId_createdAt_idx" ON "VideoTourView"("videoTourId", "createdAt");

-- CreateIndex
CREATE INDEX "VideoTourView_userId_idx" ON "VideoTourView"("userId");

-- CreateIndex
CREATE INDEX "VideoTourView_visitorId_idx" ON "VideoTourView"("visitorId");

-- AddForeignKey
ALTER TABLE "VideoTour" ADD CONSTRAINT "VideoTour_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoTour" ADD CONSTRAINT "VideoTour_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoTourLike" ADD CONSTRAINT "VideoTourLike_videoTourId_fkey" FOREIGN KEY ("videoTourId") REFERENCES "VideoTour"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoTourLike" ADD CONSTRAINT "VideoTourLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoTourComment" ADD CONSTRAINT "VideoTourComment_videoTourId_fkey" FOREIGN KEY ("videoTourId") REFERENCES "VideoTour"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoTourComment" ADD CONSTRAINT "VideoTourComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoTourComment" ADD CONSTRAINT "VideoTourComment_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoTourOffer" ADD CONSTRAINT "VideoTourOffer_videoTourId_fkey" FOREIGN KEY ("videoTourId") REFERENCES "VideoTour"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoTourOffer" ADD CONSTRAINT "VideoTourOffer_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoTourOffer" ADD CONSTRAINT "VideoTourOffer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoTourView" ADD CONSTRAINT "VideoTourView_videoTourId_fkey" FOREIGN KEY ("videoTourId") REFERENCES "VideoTour"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoTourView" ADD CONSTRAINT "VideoTourView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
