/**
 * One-shot migration: .data/trak-db.json → PostgreSQL.
 * Run after Phase 1 migrations are applied and users are seeded.
 *
 *   npx tsx scripts/migrate-json-to-postgres.ts
 *
 * Maps legacy string user ids → Postgres UUIDs by username.
 * Skips rows that already exist (idempotent for responsibilities by code).
 */
import "dotenv/config";
import { promises as fs } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL required");

const adapter = new PrismaPg({ connectionString: DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const dataDir = process.env.TRAK_DATA_DIR || path.join(process.cwd(), ".data");
  const file = path.join(dataDir, "trak-db.json");
  let raw: string;
  try {
    raw = await fs.readFile(file, "utf8");
  } catch {
    console.info("[migrate] no JSON store found — nothing to import");
    return;
  }

  const state = JSON.parse(raw) as {
    users?: Array<{ id: string; username: string }>;
    responsibilities?: Array<{
      code: string;
      name: string;
      desc: string;
      deliverables: string[];
      isActive: boolean;
    }>;
  };

  const pgUsers = await prisma.user.findMany({
    select: { id: true, usernameNormalized: true },
  });
  const byUsername = new Map(
    pgUsers.map((u) => [u.usernameNormalized, u.id]),
  );

  console.info(
    `[migrate] mapped ${byUsername.size} Postgres users; JSON users=${state.users?.length ?? 0}`,
  );

  if (state.responsibilities?.length) {
    for (const r of state.responsibilities) {
      await prisma.responsibility.upsert({
        where: { code: r.code },
        create: {
          code: r.code,
          name: r.name,
          description: r.desc,
          deliverables: r.deliverables || [],
          isActive: r.isActive !== false,
        },
        update: {
          name: r.name,
          description: r.desc,
          deliverables: r.deliverables || [],
          isActive: r.isActive !== false,
        },
      });
    }
    console.info(
      `[migrate] responsibilities upserted: ${state.responsibilities.length}`,
    );
  }

  console.info(
    "[migrate] Domain activities/messages should be re-created in-app or via a fuller importer if needed.",
  );
  console.info("[migrate] done");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
