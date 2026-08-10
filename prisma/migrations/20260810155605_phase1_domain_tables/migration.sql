-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('Meeting', 'Project', 'Program', 'Task');

-- CreateEnum
CREATE TYPE "ActivityStatus" AS ENUM ('pending', 'completed', 'missed');

-- CreateEnum
CREATE TYPE "DailyLogStatus" AS ENUM ('pending', 'submitted');

-- CreateEnum
CREATE TYPE "AttendeeSource" AS ENUM ('unit', 'manual', 'link');

-- CreateEnum
CREATE TYPE "AttachmentKind" AS ENUM ('evidence', 'invoice');

-- CreateTable
CREATE TABLE "responsibilities" (
    "id" UUID NOT NULL,
    "code" VARCHAR(16) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "deliverables" JSONB NOT NULL DEFAULT '[]',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "responsibilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" UUID NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "type" "ActivityType" NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "created_by_id" UUID NOT NULL,
    "delegated_by_id" UUID,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "start_time" VARCHAR(8) NOT NULL,
    "end_time" VARCHAR(8) NOT NULL DEFAULT '',
    "location" VARCHAR(300) NOT NULL DEFAULT '',
    "status" "ActivityStatus" NOT NULL DEFAULT 'pending',
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "has_budget" BOOLEAN NOT NULL DEFAULT false,
    "estimated_amount_ngn" DECIMAL(14,2),
    "initiative_teamwork" TEXT NOT NULL DEFAULT '',
    "challenges" TEXT NOT NULL DEFAULT '',
    "outcomes" TEXT NOT NULL DEFAULT '',
    "next_steps" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "soft_deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_responsibilities" (
    "activity_id" UUID NOT NULL,
    "responsibility_id" UUID NOT NULL,

    CONSTRAINT "activity_responsibilities_pkey" PRIMARY KEY ("activity_id","responsibility_id")
);

-- CreateTable
CREATE TABLE "daily_logs" (
    "id" UUID NOT NULL,
    "activity_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "objectives" TEXT NOT NULL DEFAULT '',
    "activity_description" TEXT NOT NULL DEFAULT '',
    "transcript" TEXT NOT NULL DEFAULT '',
    "attendance_count" VARCHAR(64) NOT NULL DEFAULT '',
    "attendance_notes" TEXT NOT NULL DEFAULT '',
    "rsvp_token_hash" VARCHAR(128),
    "status" "DailyLogStatus" NOT NULL DEFAULT 'pending',
    "amount_released_ngn" DECIMAL(14,2),
    "amount_spent_ngn" DECIMAL(14,2),
    "spending_items" JSONB NOT NULL DEFAULT '[]',
    "submitted_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "daily_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendees" (
    "id" UUID NOT NULL,
    "daily_log_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "phone" VARCHAR(40) NOT NULL DEFAULT '',
    "email" VARCHAR(255) NOT NULL DEFAULT '',
    "source" "AttendeeSource" NOT NULL DEFAULT 'manual',
    "registered_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attachments" (
    "id" UUID NOT NULL,
    "daily_log_id" UUID NOT NULL,
    "kind" "AttachmentKind" NOT NULL DEFAULT 'evidence',
    "name" VARCHAR(300) NOT NULL,
    "size" INTEGER NOT NULL DEFAULT 0,
    "content_type" VARCHAR(128) NOT NULL DEFAULT 'application/octet-stream',
    "storage_key" VARCHAR(512) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" UUID NOT NULL,
    "activity_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "call_records" (
    "id" UUID NOT NULL,
    "participant_a" UUID NOT NULL,
    "participant_b" UUID NOT NULL,
    "from_user_id" UUID NOT NULL,
    "duration_sec" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "call_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "responsibilities_code_key" ON "responsibilities"("code");

-- CreateIndex
CREATE INDEX "activities_created_by_id_status_idx" ON "activities"("created_by_id", "status");

-- CreateIndex
CREATE INDEX "activities_start_date_end_date_idx" ON "activities"("start_date", "end_date");

-- CreateIndex
CREATE INDEX "activities_status_idx" ON "activities"("status");

-- CreateIndex
CREATE INDEX "activities_hidden_idx" ON "activities"("hidden");

-- CreateIndex
CREATE UNIQUE INDEX "daily_logs_rsvp_token_hash_key" ON "daily_logs"("rsvp_token_hash");

-- CreateIndex
CREATE INDEX "daily_logs_activity_id_idx" ON "daily_logs"("activity_id");

-- CreateIndex
CREATE UNIQUE INDEX "daily_logs_activity_id_date_key" ON "daily_logs"("activity_id", "date");

-- CreateIndex
CREATE INDEX "attendees_daily_log_id_idx" ON "attendees"("daily_log_id");

-- CreateIndex
CREATE INDEX "attachments_daily_log_id_idx" ON "attachments"("daily_log_id");

-- CreateIndex
CREATE INDEX "comments_activity_id_idx" ON "comments"("activity_id");

-- CreateIndex
CREATE INDEX "call_records_participant_a_participant_b_created_at_idx" ON "call_records"("participant_a", "participant_b", "created_at");

-- CreateIndex
CREATE INDEX "broadcasts_created_at_idx" ON "broadcasts"("created_at");

-- CreateIndex
CREATE INDEX "community_messages_created_at_idx" ON "community_messages"("created_at");

-- AddForeignKey
ALTER TABLE "responsibilities" ADD CONSTRAINT "responsibilities_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_delegated_by_id_fkey" FOREIGN KEY ("delegated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_responsibilities" ADD CONSTRAINT "activity_responsibilities_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_responsibilities" ADD CONSTRAINT "activity_responsibilities_responsibility_id_fkey" FOREIGN KEY ("responsibility_id") REFERENCES "responsibilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_logs" ADD CONSTRAINT "daily_logs_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendees" ADD CONSTRAINT "attendees_daily_log_id_fkey" FOREIGN KEY ("daily_log_id") REFERENCES "daily_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_daily_log_id_fkey" FOREIGN KEY ("daily_log_id") REFERENCES "daily_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_records" ADD CONSTRAINT "call_records_participant_a_fkey" FOREIGN KEY ("participant_a") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_records" ADD CONSTRAINT "call_records_participant_b_fkey" FOREIGN KEY ("participant_b") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_records" ADD CONSTRAINT "call_records_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
