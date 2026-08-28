-- CreateTable
CREATE TABLE "pending_calls" (
    "id" UUID NOT NULL,
    "from_user_id" UUID NOT NULL,
    "to_user_id" UUID NOT NULL,
    "sdp" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pending_calls_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pending_calls_to_user_id_idx" ON "pending_calls"("to_user_id");
