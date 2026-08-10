/**
 * Phase 0 auth smoke test — password verify + session create/revoke.
 * Usage: node scripts/smoke-auth.mjs
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const user = await prisma.user.findUnique({
    where: { usernameNormalized: "dluaru" },
    include: { profile: true },
  });
  if (!user) throw new Error("Head user DLUARU not found — run npm run db:seed");

  const ok = await bcrypt.compare(
    process.env.DEV_SEED_PASSWORD || "TrakDevPass123!",
    user.passwordHash,
  );
  if (!ok) throw new Error("password verify failed");
  console.log("✓ password verify");

  const raw = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(raw).digest("hex");
  const expiresAt = new Date(Date.now() + 7 * 864e5);
  const session = await prisma.session.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
      ipAddress: "127.0.0.1",
      userAgent: "smoke-auth",
    },
  });
  console.log("✓ session created", session.id);

  const found = await prisma.session.findUnique({ where: { tokenHash } });
  if (!found || found.revokedAt) throw new Error("session not valid");
  console.log("✓ session lookup");

  await prisma.session.update({
    where: { id: session.id },
    data: { revokedAt: new Date() },
  });
  const revoked = await prisma.session.findUnique({ where: { tokenHash } });
  if (!revoked?.revokedAt) throw new Error("revoke failed");
  console.log("✓ session revoked");

  await prisma.session.delete({ where: { id: session.id } });
  console.log("✓ smoke auth passed");
}

main()
  .catch((e) => {
    console.error("✗", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
