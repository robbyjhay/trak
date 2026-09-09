import pg from "pg";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
const pool = new pg.Pool({ connectionString: "postgresql://postgres:postgres@localhost:5432/trak_local?schema=public" });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
async function main() {
  await prisma.libraryResource.deleteMany({ where: { title: { startsWith: "Test" } } });
  await prisma.session.deleteMany({ where: { tokenHash: { startsWith: "test_" } } });
  await prisma.session.deleteMany({ where: { tokenHash: { contains: "d30eb4de" } } });
  console.log("cleaned");
}
main().finally(async () => { await prisma.$disconnect(); await pool.end(); });
