/**
 * Phase 5 — production environment gate (AUDIT_08 Part 2).
 * Validates that process.env is safe for production go-live.
 *
 * Usage: NODE_ENV=production node scripts/check-prod-env.mjs
 * Exit 0 = pass, 1 = blockers found.
 */
import "dotenv/config";

const errors = [];
const warnings = [];

function req(name, pred, msg) {
  const v = process.env[name];
  if (!pred(v)) errors.push(msg || `${name} is invalid/missing`);
}

function warn(cond, msg) {
  if (cond) warnings.push(msg);
}

const isProd = process.env.NODE_ENV === "production";

req("DATABASE_URL", (v) => typeof v === "string" && /postgres(ql)?:\/\//.test(v));
req(
  "TRAK_SESSION_SECRET",
  (v) => typeof v === "string" && v.length >= 32,
  "TRAK_SESSION_SECRET must be ≥32 characters",
);
req(
  "APP_URL",
  (v) => typeof v === "string" && /^https:\/\//.test(v || "") || !isProd,
  "APP_URL must be https://… in production",
);

if (isProd) {
  req(
    "ENABLE_DEV_LOGIN",
    (v) => v === "false" || v === "0" || !v,
    "ENABLE_DEV_LOGIN must be false/unset in production",
  );
  req(
    "SEED_DEMO_USERS",
    (v) => v === "false" || v === "0" || !v,
    "SEED_DEMO_USERS must be false/unset in production",
  );
  if (process.env.DEV_SEED_PASSWORD) {
    errors.push("DEV_SEED_PASSWORD must not be set in production");
  }
  if (
    process.env.TRAK_SESSION_SECRET ===
    "trak-dev-secret-change-me-in-production-32b"
  ) {
    errors.push("TRAK_SESSION_SECRET is still the hardcoded dev fallback");
  }
}

if (process.env.TRAK_RUNTIME_MODE === "multi") {
  req("REDIS_URL", (v) => typeof v === "string" && v.length > 0, "REDIS_URL is required when TRAK_RUNTIME_MODE=multi");
} else {
  warn(!process.env.REDIS_URL && isProd, "REDIS_URL unset — rate limits are in-memory only");
}

warn(
  !process.env.SENTRY_DSN && isProd,
  "SENTRY_DSN unset — no external error monitoring",
);
warn(
  !process.env.EMAIL_FROM && isProd,
  "EMAIL_FROM unset — invite/reset emails will not send",
);
warn(
  !process.env.SMTP_HOST && !process.env.RESEND_API_KEY && isProd,
  "No SMTP_HOST or RESEND_API_KEY — email delivery unavailable",
);

console.log(`Env check (NODE_ENV=${process.env.NODE_ENV || "undefined"})`);
if (warnings.length) {
  console.log("\nWarnings:");
  for (const w of warnings) console.log("  !", w);
}
if (errors.length) {
  console.log("\nBlockers:");
  for (const e of errors) console.log("  ✗", e);
  process.exit(1);
}
console.log("\n✓ Production env gate passed");
