-- AlterEnum
-- Add the annotation notification type to the existing enum.
ALTER TYPE "NotificationType" ADD VALUE 'announcement';

-- CreateTable
CREATE TABLE "announcements" (
    "id" UUID NOT NULL,
    "unit_id" VARCHAR(64) NOT NULL DEFAULT 'dlu',
    "from_user_id" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcement_reactions" (
    "id" UUID NOT NULL,
    "announcement_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "emoji" VARCHAR(16) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "announcement_reactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "announcements_unit_id_created_at_idx" ON "announcements"("unit_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "announcement_reactions_announcement_id_user_id_emoji_key" ON "announcement_reactions"("announcement_id", "user_id", "emoji");

-- CreateIndex
CREATE INDEX "announcement_reactions_user_id_idx" ON "announcement_reactions"("user_id");

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcement_reactions" ADD CONSTRAINT "announcement_reactions_announcement_id_fkey" FOREIGN KEY ("announcement_id") REFERENCES "announcements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcement_reactions" ADD CONSTRAINT "announcement_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;