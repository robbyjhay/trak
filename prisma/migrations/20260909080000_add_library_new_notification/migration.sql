-- Add library_new notification type — unit-wide fan-out when a member
-- submits a Library resource (heads still get the manage-focused
-- library_submitted notification).
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'NotificationType' AND e.enumlabel = 'library_new'
  ) THEN
    ALTER TYPE "NotificationType" ADD VALUE 'library_new';
  END IF;
END $$;