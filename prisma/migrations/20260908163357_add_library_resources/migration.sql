-- DLU Library: member-contributed external resources + review workflow.
-- Also reconciles two pre-existing drift items so migration history matches
-- schema.prisma (both were already true of the dev database).

-- Reconcile drift: schema.prisma expects AttendeeSource 'guest'
-- (present in the database, missing from earlier migrations).
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'AttendeeSource' AND e.enumlabel = 'guest'
  ) THEN
    ALTER TYPE "AttendeeSource" ADD VALUE 'guest';
  END IF;
END $$;

-- Reconcile drift: schema.prisma declares activities."reminderStatus" optional.
ALTER TABLE "activities" ALTER COLUMN "reminderStatus" DROP NOT NULL;

-- CreateEnum
CREATE TYPE "LibraryResourceStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED');

-- CreateEnum
CREATE TYPE "LibraryResourceCategory" AS ENUM ('BOOK', 'VIDEO', 'AUDIO', 'MEMO', 'OTHER');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'library_submitted';

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'library_approved';

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'library_declined';

-- CreateTable
CREATE TABLE "library_resources" (
    "id" UUID NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "category" "LibraryResourceCategory" NOT NULL,
    "external_url" VARCHAR(2048) NOT NULL,
    "thumbnail_key" VARCHAR(512),
    "thumbnail_url" VARCHAR(2048),
    "submitted_by_id" UUID NOT NULL,
    "status" "LibraryResourceStatus" NOT NULL DEFAULT 'PENDING',
    "decline_reason" TEXT NOT NULL DEFAULT '',
    "reviewer_id" UUID,
    "reviewed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "library_resources_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "library_resources_status_idx" ON "library_resources"("status");

-- CreateIndex
CREATE INDEX "library_resources_submitted_by_id_idx" ON "library_resources"("submitted_by_id");

-- CreateIndex
CREATE INDEX "library_resources_category_idx" ON "library_resources"("category");

-- CreateIndex
CREATE INDEX "library_resources_created_at_idx" ON "library_resources"("created_at");

-- CreateIndex
CREATE INDEX "library_resources_status_created_at_idx" ON "library_resources"("status", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "library_resources" ADD CONSTRAINT "library_resources_submitted_by_id_fkey" FOREIGN KEY ("submitted_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_resources" ADD CONSTRAINT "library_resources_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
