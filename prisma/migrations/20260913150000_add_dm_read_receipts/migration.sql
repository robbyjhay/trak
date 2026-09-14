-- Add read-receipt tracking for direct messages.
-- read_at is set when the recipient opens the conversation; the sender
-- uses it to show sent (single tick) vs read (double tick).
ALTER TABLE "direct_messages" ADD COLUMN "read_at" TIMESTAMPTZ(3);