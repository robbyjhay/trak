import { PrismaClient } from "@prisma/client";
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function run() {
  const users = await prisma.user.findMany({ take: 2, include: { profile: true } });
  console.log(users.map(u => ({ username: u.username, name: u.profile?.name })));
  process.exit(0);
}
run();
