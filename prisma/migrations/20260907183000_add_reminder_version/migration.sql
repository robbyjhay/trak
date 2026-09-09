-- Add missing reminderVersion to activities
ALTER TABLE "activities" ADD COLUMN "reminderVersion" INTEGER NOT NULL DEFAULT 1;
