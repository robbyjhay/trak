/**
 * Environment validation — fail fast when required vars are missing.
 * Import from server code only (route handlers, server actions, prisma).
 */
import "server-only";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  APP_URL: z.string().url().optional(),
  APP_NAME: z.string().default("Trak"),

  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .refine(
      (v) => v.startsWith("postgresql://") || v.startsWith("postgres://"),
      "DATABASE_URL must be a PostgreSQL connection string",
    ),

  TRAK_SESSION_SECRET: z
    .string()
    .min(32, "TRAK_SESSION_SECRET must be at least 32 characters"),

  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(7),
  BCRYPT_COST: z.coerce.number().int().min(10).max(15).default(12),

  ENABLE_DEV_LOGIN: z
    .enum(["true", "false", "1", "0", ""])
    .optional()
    .transform((v) => v === "true" || v === "1"),

  SEED_DEMO_USERS: z
    .enum(["true", "false", "1", "0", ""])
    .optional()
    .transform((v) => v === "true" || v === "1"),

  DEV_SEED_PASSWORD: z.string().optional(),

  RATE_LIMIT_LOGIN_MAX: z.coerce.number().int().positive().default(5),
  RATE_LIMIT_LOGIN_WINDOW_SEC: z.coerce.number().int().positive().default(900),

  REDIS_URL: z.string().optional(),
  LOG_LEVEL: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  SENTRY_ENVIRONMENT: z.string().optional(),
  APP_VERSION: z.string().optional(),
  EMAIL_PROVIDER: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  BACKUP_DIR: z.string().optional(),
  BACKUP_RETENTION_DAYS: z.coerce.number().int().positive().optional(),
  TRAK_JWT_SECRET: z.string().min(32, "TRAK_JWT_SECRET must be ≥32 characters").optional(),

  // Object storage (Phase 3) — optional; local uploads used when unset
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_PUBLIC_BASE_URL: z.string().optional(),
  RATE_LIMIT_REDIS_PREFIX: z.string().optional(),

  // Push Notifications
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PUBLIC_KEY: z.string().optional(), // Fallback if not using NEXT_PUBLIC_
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().optional().default("mailto:admin@trak.local"),
});

export type AppEnv = z.infer<typeof envSchema> & {
  isProd: boolean;
  isDevLoginEnabled: boolean;
};

let cached: AppEnv | null = null;

/**
 * Parse and cache process.env. Throws on invalid/missing required vars.
 * Safe to call multiple times (memoized).
 */
export function getEnv(): AppEnv {
  if (cached) return cached;

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Invalid environment configuration:\n${details}\n\nSee .env.example for required variables.`,
    );
  }

  const data = parsed.data;
  const isProd = data.NODE_ENV === "production";
  const isDevLoginEnabled =
    !isProd && Boolean(data.ENABLE_DEV_LOGIN);

  cached = {
    ...data,
    isProd,
    isDevLoginEnabled,
  };
  return cached;
}

function isLocalhostAppUrl(appUrl?: string): boolean {
  if (!appUrl) return true;

  try {
    const hostname = new URL(appUrl).hostname;
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1"
    );
  } catch {
    return false;
  }
}

/** Soft check used by edge middleware (no throw on optional missing APP_URL). */
export function hasSessionSecret(): boolean {
  const s = process.env.TRAK_SESSION_SECRET;
  return Boolean(s && s.length >= 32);
}

/** Whether dev login roster / autofill is allowed. */
export function isDevLoginEnabled(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  const v = process.env.ENABLE_DEV_LOGIN;
  if (!(v === "true" || v === "1")) return false;

  return isLocalhostAppUrl(process.env.APP_URL);
}
