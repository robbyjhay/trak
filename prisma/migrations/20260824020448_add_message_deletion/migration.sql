-- AlterTable
ALTER TABLE "community_messages" ADD COLUMN     "deleted_at" TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "direct_messages" ADD COLUMN     "deleted_at" TIMESTAMPTZ(3);

-- CreateTable
CREATE TABLE "deleted_messages" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "direct_message_id" UUID,
    "community_message_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deleted_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "deleted_messages_direct_message_id_idx" ON "deleted_messages"("direct_message_id");

-- CreateIndex
CREATE INDEX "deleted_messages_community_message_id_idx" ON "deleted_messages"("community_message_id");

-- CreateIndex
CREATE UNIQUE INDEX "deleted_messages_user_id_direct_message_id_key" ON "deleted_messages"("user_id", "direct_message_id");

-- CreateIndex
CREATE UNIQUE INDEX "deleted_messages_user_id_community_message_id_key" ON "deleted_messages"("user_id", "community_message_id");

-- AddForeignKey
ALTER TABLE "deleted_messages" ADD CONSTRAINT "deleted_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deleted_messages" ADD CONSTRAINT "deleted_messages_direct_message_id_fkey" FOREIGN KEY ("direct_message_id") REFERENCES "direct_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deleted_messages" ADD CONSTRAINT "deleted_messages_community_message_id_fkey" FOREIGN KEY ("community_message_id") REFERENCES "community_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
