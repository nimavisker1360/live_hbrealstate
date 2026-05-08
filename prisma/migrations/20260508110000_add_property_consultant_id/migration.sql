ALTER TABLE "Property" ADD COLUMN "consultantId" TEXT;

CREATE INDEX "Property_consultantId_idx" ON "Property"("consultantId");
