-- CreateTable
CREATE TABLE "unit_settings" (
    "id" UUID NOT NULL,
    "default_member_password" VARCHAR(255),
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "unit_settings_pkey" PRIMARY KEY ("id")
);
