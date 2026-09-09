-- Fix activities.dueAt to due_at and adjust type to TIMESTAMPTZ(3)
ALTER TABLE "activities" RENAME COLUMN "dueAt" TO "due_at";
ALTER TABLE "activities" ALTER COLUMN "due_at" TYPE TIMESTAMPTZ(3) USING "due_at" AT TIME ZONE 'UTC';

-- Drop the broken integer column for grace period
ALTER TABLE "activities" DROP COLUMN "grace_period_expires_at";

-- Rename the empty timestamp column to the correct mapped name
ALTER TABLE "activities" RENAME COLUMN "gracePeriodExpiresAt" TO "grace_period_expires_at";

-- Add guest code columns to daily_logs
ALTER TABLE "daily_logs" ADD COLUMN "guest_code" VARCHAR(8);
ALTER TABLE "daily_logs" ADD COLUMN "guest_code_expires_at" TIMESTAMPTZ(3);

-- Create unique index for guest_code
CREATE UNIQUE INDEX "daily_logs_guest_code_key" ON "daily_logs"("guest_code");

-- Add profile_updated to NotificationType enum
ALTER TYPE "NotificationType" ADD VALUE 'profile_updated';
