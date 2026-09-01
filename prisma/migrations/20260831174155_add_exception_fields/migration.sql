-- CreateEnum
CREATE TYPE "ExceptionStatus" AS ENUM ('none', 'requested', 'approved', 'rejected', 'expired');

-- CreateEnum
CREATE TYPE "SubmissionType" AS ENUM ('normal', 'late');

-- AlterTable
ALTER TABLE "activities" ADD COLUMN     "exceptionStatus" "ExceptionStatus" NOT NULL DEFAULT 'none',
ADD COLUMN     "grace_period_expires_at" TIMESTAMP(3),
ADD COLUMN     "grace_period_started_at" TIMESTAMP(3),
ADD COLUMN     "submissionType" "SubmissionType" NOT NULL DEFAULT 'normal';
