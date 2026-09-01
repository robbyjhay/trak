-- Add reply_to_id to direct_messages for WhatsApp-style threading
ALTER TABLE "direct_messages" ADD COLUMN "reply_to_id" UUID;
ALTER TABLE "direct_messages" ADD CONSTRAINT "direct_messages_reply_to_id_fkey" FOREIGN KEY ("reply_to_id") REFERENCES "direct_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "direct_messages_reply_to_id_idx" ON "direct_messages"("reply_to_id");
