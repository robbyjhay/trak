/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Phase 0D Remediation — First Production Head Bootstrap
 * One-time command to securely provision the initial Head account.
 */
import "dotenv/config";
import { execSync } from "node:child_process";
import * as readline from "node:readline/promises";
import { Writable } from "node:stream";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

// 1. Production-only protection
if (process.env.NODE_ENV !== "production") {
  console.error("❌ Bootstrap command can only be run in production (NODE_ENV=production).");
  console.error("Use normal dev seed for development.");
  process.exit(1);
}

// 2. Prevent development misuse by running the Phase 0C production gate
try {
  execSync("node scripts/check-prod-env.mjs", { stdio: "inherit" });
} catch {
  console.error("\n❌ Environment validation failed. Bootstrap aborted.");
  process.exit(1);
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL is missing.");
  process.exit(1);
}

// Reuse existing auth settings
const BCRYPT_COST = Number(process.env.BCRYPT_COST) || 12;

// Initialize Prisma
const adapter = new PrismaPg({ connectionString: DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function prompt(rl: readline.Interface, query: string, isPassword = false): Promise<string> {
  if (isPassword) {
    const mutableStdout = (rl as any).output as any;
    return new Promise((resolve) => {
      process.stdout.write(query);
      mutableStdout.muted = true;
      rl.question("").then((answer) => {
        mutableStdout.muted = false;
        console.log(); // Print newline since muted input hides Enter
        resolve(answer);
      });
    });
  }
  return rl.question(query);
}

async function main() {
  console.log("\n== Trak Production Head Bootstrap ==\n");

  // 2.5 Setup secure interactive input
  const mutableStdout = new Writable({
    write(chunk: any, encoding: any, callback: any) {
      if (!(this as any).muted) {
        process.stdout.write(chunk, encoding);
      }
      callback();
    }
  }) as any;
  mutableStdout.muted = false;

  const rl = readline.createInterface({
    input: process.stdin,
    output: mutableStdout,
    terminal: true,
  });

  // 2.6 Extract safe database info and prompt for confirmation
  try {
    const dbUrl = new URL(DATABASE_URL!);
    console.log(`Target Environment: Production`);
    console.log(`Target Host: ${dbUrl.hostname}`);
    console.log(`Target Database: ${dbUrl.pathname.replace("/", "")}`);
    const confirm = await prompt(rl, "\nAre you sure you want to bootstrap this database? (yes/no): ");
    if (confirm.trim().toLowerCase() !== "yes") {
      console.log("Bootstrap aborted.");
      process.exit(0);
    }
  } catch {
    console.error("❌ Invalid DATABASE_URL format.");
    process.exit(1);
  }
  
  // 3. Check for existing Head account
  try {
    const existingHead = await prisma.user.findFirst({
      where: { role: "head" }
    });

    if (existingHead) {
      console.error("❌ A Head account already exists. Bootstrap aborted.");
      process.exit(1);
    }
  } catch (err) {
    console.error("❌ Database connection failed.");
    console.error(err);
    process.exit(1);
  }

  try {
    console.log("Provide details for the initial production Head account.\n");
    
    let username = "";
    while (!username.trim()) {
      username = await prompt(rl, "Username (e.g. DLUHEAD): ");
    }
    username = username.trim();

    let name = "";
    while (!name.trim()) {
      name = await prompt(rl, "Full Name: ");
    }
    name = name.trim();

    const email = (await prompt(rl, "Email Address (optional): ")).trim().toLowerCase();
    
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      console.error("❌ Invalid email format.");
      process.exit(1);
    }

    let password = "";
    while (password.length < 8) {
      password = await prompt(rl, "Password (min 8 chars): ", true);
      if (password.length < 8) {
        console.error("Password is too short.");
      }
    }

    // 5. Hash password securely (NEVER STORE PLAINTEXT)
    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);

    // 6. Transactional creation
    await prisma.$transaction(async (tx) => {
      // Final sanity check inside transaction to prevent race conditions
      const concurrentHead = await tx.user.findFirst({
        where: { role: "head" }
      });
      if (concurrentHead) {
        throw new Error("A Head account was created concurrently.");
      }

      await tx.user.create({
        data: {
          username: username,
          usernameNormalized: username.toLowerCase(),
          email: email || null,
          passwordHash: passwordHash,
          role: "head",
          isSecretary: false,
          isCorps: false,
          mustChangePassword: true, // Require change on first login
          isActive: true,
          profile: {
            create: {
              name: name,
              phone: "",
              designation: "Head of Unit",
              gradeLevel: "",
              sex: "",
              stateOfOrigin: "",
              color: "#8a6a1f" // Standard Head color
            }
          },
          preferences: { create: {} }
        }
      });
    });

    console.log(`\n✅ Production Head account '${username}' securely bootstrapped.`);
    console.log("You can now log in and invite additional members.");
} catch (err) {
    console.error("\n❌ Bootstrap creation failed.");
    console.error((err as Error).message || err);
    process.exit(1);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

main().catch(e => {
  console.error("❌ Unexpected bootstrap error.", e);
  process.exit(1);
});
