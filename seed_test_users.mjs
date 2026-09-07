import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function run() {
  const passwordHash = await bcrypt.hash("password123", 10);
  
  const user1 = await prisma.user.upsert({
    where: { username: "user_a" },
    update: { passwordHash },
    create: { username: "user_a", usernameNormalized: "user_a", passwordHash, role: "member", authUserId: "auth_a", name: "User A", isActive: true, profile: { create: { name: "User A" } } }
  });

  const user2 = await prisma.user.upsert({
    where: { username: "user_b" },
    update: { passwordHash },
    create: { username: "user_b", usernameNormalized: "user_b", passwordHash, role: "member", authUserId: "auth_b", name: "User B", isActive: true, profile: { create: { name: "User B" } } }
  });
  
  console.log("Users created:", user1.username, user2.username);
  process.exit(0);
}
run();
