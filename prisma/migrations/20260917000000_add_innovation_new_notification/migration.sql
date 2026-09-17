-- New global notification type: an innovation was approved and added
-- to the Innovation Cloud (unit-wide fan-out for non-submitting members;
-- heads still get the manage-focused innovation_submitted notification).
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'innovation_new';