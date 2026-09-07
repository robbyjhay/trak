-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'activity_reminder';

-- AlterTable
ALTER TABLE "activities" ADD COLUMN     "dueAt" TIMESTAMP(3),
ADD COLUMN     "gracePeriodExpiresAt" TIMESTAMP(3),
ADD COLUMN     "reminderStatus" JSONB NOT NULL DEFAULT '{}',
DROP COLUMN "grace_period_expires_at",
ADD COLUMN     "grace_period_expires_at" INTEGER NOT NULL DEFAULT 1;

