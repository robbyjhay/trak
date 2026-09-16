-- Add onboarding notification types
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'onboarding_requested';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'onboarding_approved';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'onboarding_declined';

-- Add onboarding status enum
CREATE TYPE "OnboardingStatus" AS ENUM ('pending', 'approved', 'declined');

-- Add onboarding requests table
CREATE TABLE "onboarding_requests" (
    "id" UUID NOT NULL,
    "head_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "phone" VARCHAR(40) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "username" VARCHAR(64),
    "designation" VARCHAR(200),
    "grade_level" VARCHAR(40),
    "sex" VARCHAR(20),
    "state_of_origin" VARCHAR(40),
    "date_joined" TIMESTAMPTZ(3),
    "status" "OnboardingStatus" NOT NULL DEFAULT 'pending',
    "decided_by_id" UUID,
    "decided_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "onboarding_requests_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraints
ALTER TABLE "onboarding_requests" ADD CONSTRAINT "onboarding_requests_head_id_fkey" FOREIGN KEY ("head_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "onboarding_requests" ADD CONSTRAINT "onboarding_requests_decided_by_id_fkey" FOREIGN KEY ("decided_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add indexes
CREATE INDEX "onboarding_requests_head_id_status_idx" ON "onboarding_requests"("head_id", "status");
CREATE INDEX "onboarding_requests_status_created_at_idx" ON "onboarding_requests"("status", "created_at");
