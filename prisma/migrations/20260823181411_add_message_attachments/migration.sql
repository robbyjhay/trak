-- CreateTable
CREATE TABLE "message_attachments" (
    "id" UUID NOT NULL,
    "direct_message_id" UUID,
    "community_message_id" UUID,
    "name" VARCHAR(300) NOT NULL,
    "size" INTEGER NOT NULL DEFAULT 0,
    "content_type" VARCHAR(128) NOT NULL DEFAULT 'application/octet-stream',
    "storage_key" VARCHAR(512) NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "message_attachments_direct_message_id_idx" ON "message_attachments"("direct_message_id");

-- CreateIndex
CREATE INDEX "message_attachments_community_message_id_idx" ON "message_attachments"("community_message_id");

-- AddForeignKey
ALTER TABLE "message_attachments" ADD CONSTRAINT "message_attachments_direct_message_id_fkey" FOREIGN KEY ("direct_message_id") REFERENCES "direct_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_attachments" ADD CONSTRAINT "message_attachments_community_message_id_fkey" FOREIGN KEY ("community_message_id") REFERENCES "community_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
