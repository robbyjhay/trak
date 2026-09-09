-- CreateEnum
CREATE TYPE "InnovationStatus" AS ENUM ('PENDING', 'APPROVED', 'IMPLEMENTED', 'DECLINED');

-- CreateEnum
CREATE TYPE "InnovationCategory" AS ENUM ('PROCESS', 'TECHNOLOGY', 'COMMUNITY', 'TRAINING', 'COMMUNICATION', 'OTHER');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'innovation_submitted';
ALTER TYPE "NotificationType" ADD VALUE 'innovation_approved';
ALTER TYPE "NotificationType" ADD VALUE 'innovation_declined';
ALTER TYPE "NotificationType" ADD VALUE 'innovation_implemented';

-- CreateTable
CREATE TABLE "innovations" (
    "id" UUID NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "description" TEXT NOT NULL,
    "category" "InnovationCategory" NOT NULL,
    "details" TEXT NOT NULL DEFAULT '',
    "submitted_by_id" UUID NOT NULL,
    "status" "InnovationStatus" NOT NULL DEFAULT 'PENDING',
    "decline_reason" TEXT NOT NULL DEFAULT '',
    "reviewer_id" UUID,
    "reviewed_at" TIMESTAMPTZ(3),
    "implemented_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "innovations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "innovations_status_idx" ON "innovations"("status");

-- CreateIndex
CREATE INDEX "innovations_submitted_by_id_idx" ON "innovations"("submitted_by_id");

-- CreateIndex
CREATE INDEX "innovations_category_idx" ON "innovations"("category");

-- CreateIndex
CREATE INDEX "innovations_created_at_idx" ON "innovations"("created_at");

-- CreateIndex
CREATE INDEX "innovations_status_created_at_idx" ON "innovations"("status", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "innovations" ADD CONSTRAINT "innovations_submitted_by_id_fkey" FOREIGN KEY ("submitted_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "innovations" ADD CONSTRAINT "innovations_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
