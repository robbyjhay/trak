-- AlterTable: Add position column to track character offset of mention in message text
ALTER TABLE "community_message_mentions" ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;
