import { PrismaClient } from "@prisma/client";
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function run() {
  const user = await prisma.user.findUnique({ where: { username: "dev" }, include: { profile: true } });
  console.log("Dev User:", user);
  process.exit(0);
}
run();
