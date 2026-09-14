-- Backfill last_seen_at from the last login timestamp so members who have
-- logged in before the last-seen feature shipped still display a real time
-- instead of "Last seen recently". Users who never logged in stay NULL.
UPDATE "users"
SET "last_seen_at" = "last_login_at"
WHERE "last_seen_at" IS NULL
  AND "last_login_at" IS NOT NULL;