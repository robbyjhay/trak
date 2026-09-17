-- Mention support for Unit Announcements (mirrors community_message_mentions):
-- an announcement can @-mention active unit members, who then get a `mention`
-- notification instead of the generic `announcement` fan-out.

CREATE TABLE IF NOT EXISTS "announcement_mentions" (
    "announcement_id" uuid NOT NULL,
    "user_id" uuid NOT NULL,
    "position" int NOT NULL DEFAULT 0,
    CONSTRAINT "announcement_mentions_pkey" PRIMARY KEY ("announcement_id", "user_id")
);

CREATE INDEX IF NOT EXISTS "announcement_mentions_user_id_idx" ON "announcement_mentions" ("user_id");

ALTER TABLE "announcement_mentions"
    ADD CONSTRAINT "announcement_mentions_announcement_id_fkey"
    FOREIGN KEY ("announcement_id") REFERENCES "announcements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "announcement_mentions"
    ADD CONSTRAINT "announcement_mentions_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;