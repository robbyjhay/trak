// Mint a self-onboarding invite link for Trak members.
//
// Usage:
//   node scripts/mint-onboard-link.mjs [headUsername] [--app-url https://...]
//
// Connects to the DB via DATABASE_URL (defaults to .env). Finds an active Unit
// Head (by username or the first active head), creates a 12-hour `onboard` token,
// and prints a link you can send to a member to fill in their own details.
import { PrismaClient } from "@prisma/client";
import { createHash, randomBytes } from "node:crypto";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";
dotenv.config();

const args = process.argv.slice(2);
const headArg = args.find((a) => !a.startsWith("--"));
const appUrlArg = (() => {
  const i = args.indexOf("--app-url");
  return i !== -1 && args[i + 1] ? args[i + 1] : null;
})();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("[mint-onboard-link] DATABASE_URL is required.");
  process.exit(1);
}
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const TOKEN_BYTES = 32;
const TTL_MS = 12 * 60 * 60 * 1000; // 12 hours, matches onboard token TTL

async function run() {
  const where = headArg
    ? { usernameNormalized: headArg.trim().toLowerCase() }
    : { role: "head", isActive: true };
  const head = await prisma.user.findFirst({
    where,
    include: { profile: true },
  });
  if (!head) {
    console.error(
      headArg
        ? `[mint-onboard-link] No user found for username "${headArg}".`
        : "[mint-onboard-link] No active Unit Head found. Pass a head username.",
    );
    process.exit(1);
  }
  if (head.role !== "head") {
    console.error(`[mint-onboard-link] "${head.username}" is not a Unit Head.`);
    process.exit(1);
  }

  const raw = randomBytes(TOKEN_BYTES).toString("base64url");
  const tokenHash = createHash("sha256").update(raw, "utf8").digest("hex");
  const expiresAt = new Date(Date.now() + TTL_MS);

  await prisma.authToken.create({
    data: {
      userId: head.id,
      type: "onboard",
      tokenHash,
      expiresAt,
    },
  });

  const baseUrl = (appUrlArg || process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
  console.log("");
  console.log("  Member onboarding link (valid 12 hours, single use):");
  console.log(`    ${baseUrl}/onboard?token=${raw}`);
  console.log("");
  console.log(`  Issued by unit head: ${head.profile?.name || head.username} (${head.username})`);
  console.log(`  Expires: ${expiresAt.toISOString()}`);
  console.log("");
  console.log("  Role is locked to Member; the member uses the unit's default");
  console.log("  member password to sign in on first login.");
  console.log("");

  await prisma.$disconnect();
  process.exit(0);
}

run().catch(async (err) => {
  console.error("[mint-onboard-link] Failed:", err);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});