-- Reconcile drift: the live dev DB carries a redundant (key, user_id) unique
-- constraint on idempotency_keys that is not part of migration history and is
-- a superset of the existing unique (key). Drop it so history matches the DB
-- without any data loss (the row-level uniqueness guarantee is unchanged).
-- Production-safe: IF EXISTS makes this a no-op on any DB maintained purely by
-- migration history (where the composite was never created), while still
-- reconciling drifted dev DBs. Prisma never generates IF EXISTS, but migrate
-- deploy executes this SQL verbatim, so a hard DROP would fail on clean DBs.
ALTER TABLE "idempotency_keys" DROP CONSTRAINT IF EXISTS "idempotency_keys_key_user_id_key";

-- CreateEnum
CREATE TYPE "CollaborationInviteStatus" AS ENUM ('pending', 'accepted', 'declined');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'collaboration_invite';
ALTER TYPE "NotificationType" ADD VALUE 'collaboration_accepted';
ALTER TYPE "NotificationType" ADD VALUE 'collaboration_declined';

-- DropIndex
DROP INDEX "daily_logs_activity_id_date_key";

-- AlterTable
ALTER TABLE "activities" ADD COLUMN     "collaborative" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "daily_logs" ADD COLUMN     "user_id" UUID;

-- CreateTable
CREATE TABLE "activity_collaborators" (
    "id" UUID NOT NULL,
    "activity_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "invited_by_id" UUID NOT NULL,
    "status" "CollaborationInviteStatus" NOT NULL DEFAULT 'pending',
    "responded_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_collaborators_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "activity_collaborators_user_id_status_idx" ON "activity_collaborators"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "activity_collaborators_activity_id_user_id_key" ON "activity_collaborators"("activity_id", "user_id");

-- CreateIndex
CREATE INDEX "activities_collaborative_idx" ON "activities"("collaborative");

-- CreateIndex
CREATE INDEX "daily_logs_user_id_idx" ON "daily_logs"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "daily_logs_activity_id_date_user_id_key" ON "daily_logs"("activity_id", "date", "user_id");

-- AddForeignKey
ALTER TABLE "activity_collaborators" ADD CONSTRAINT "activity_collaborators_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_collaborators" ADD CONSTRAINT "activity_collaborators_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_collaborators" ADD CONSTRAINT "activity_collaborators_invited_by_id_fkey" FOREIGN KEY ("invited_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

