-- Add last-online tracking for the presence/last-seen indicator.
-- last_seen_at is refreshed when a user connects to the signaling server,
-- heartbeats a ping, or disconnects (throttled to at most once per 60s per
-- connection to avoid write storms).
ALTER TABLE "users" ADD COLUMN "last_seen_at" TIMESTAMPTZ(3);