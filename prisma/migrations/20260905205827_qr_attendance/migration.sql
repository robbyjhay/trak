-- CreateEnum
CREATE TYPE "AttendeeStatus" AS ENUM ('pending', 'verified', 'declined');

-- AlterTable
ALTER TABLE "attendees" ADD COLUMN     "status" "AttendeeStatus" NOT NULL DEFAULT 'verified',
ADD COLUMN     "user_id" UUID;

-- CreateIndex
CREATE INDEX "attendees_user_id_idx" ON "attendees"("user_id");

-- AddForeignKey
ALTER TABLE "attendees" ADD CONSTRAINT "attendees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
