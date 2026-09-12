-- CreateEnum
CREATE TYPE "DelegationType" AS ENUM ('UNIT_WORK', 'SELF_DEVELOPMENT', 'INNOVATION');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'work_delegated';

-- DropIndex
DROP INDEX "announcements_unit_id_created_at_idx";

-- AlterTable
ALTER TABLE "activities" ADD COLUMN     "assignee_id" UUID,
ADD COLUMN     "delegation_type" "DelegationType",
ADD COLUMN     "innovation_id" UUID,
ADD COLUMN     "library_resource_id" UUID;

-- CreateIndex
CREATE INDEX "activities_assignee_id_idx" ON "activities"("assignee_id");

-- CreateIndex
CREATE INDEX "activities_delegated_by_id_idx" ON "activities"("delegated_by_id");

-- CreateIndex
CREATE INDEX "activities_delegation_type_idx" ON "activities"("delegation_type");

-- CreateIndex
CREATE INDEX "announcements_unit_id_created_at_idx" ON "announcements"("unit_id", "created_at");

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_library_resource_id_fkey" FOREIGN KEY ("library_resource_id") REFERENCES "library_resources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_innovation_id_fkey" FOREIGN KEY ("innovation_id") REFERENCES "innovations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
