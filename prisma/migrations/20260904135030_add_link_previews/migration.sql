/*
  Warnings:

  - You are about to drop the column `length` on the `community_message_mentions` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'community';

-- AlterTable
ALTER TABLE "community_message_mentions" DROP COLUMN "length";

-- CreateTable
CREATE TABLE "link_previews" (
    "id" UUID NOT NULL,
    "direct_message_id" UUID,
    "community_message_id" UUID,
    "url" VARCHAR(2048) NOT NULL,
    "domain" VARCHAR(255) NOT NULL,
    "title" VARCHAR(512),
    "description" TEXT,
    "image" VARCHAR(2048),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "link_previews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "link_previews_direct_message_id_idx" ON "link_previews"("direct_message_id");

-- CreateIndex
CREATE INDEX "link_previews_community_message_id_idx" ON "link_previews"("community_message_id");

-- CreateIndex
CREATE UNIQUE INDEX "link_previews_direct_message_id_key" ON "link_previews"("direct_message_id");

-- CreateIndex
CREATE UNIQUE INDEX "link_previews_community_message_id_key" ON "link_previews"("community_message_id");

-- AddForeignKey
ALTER TABLE "link_previews" ADD CONSTRAINT "link_previews_direct_message_id_fkey" FOREIGN KEY ("direct_message_id") REFERENCES "direct_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "link_previews" ADD CONSTRAINT "link_previews_community_message_id_fkey" FOREIGN KEY ("community_message_id") REFERENCES "community_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
