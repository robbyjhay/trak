import { PrismaClient } from "@prisma/client";
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function run() {
  const dev = await prisma.user.findUnique({ where: { username: "dev" } });
  await prisma.user.updateMany({
    where: { username: "DLUFFF" },
    data: { passwordHash: dev.passwordHash }
  });
  console.log("Updated password for DLUFFF");
  process.exit(0);
}
run();
