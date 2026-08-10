import { execSync } from 'child_process';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const file = process.argv[2];

if (!file) {
  console.error("Usage: npx tsx scripts/restore-drill.ts <backup_file>");
  process.exit(1);
}

if (!fs.existsSync(file)) {
  console.error(`Error: File ${file} not found.`);
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("Error: DATABASE_URL is not set.");
  process.exit(1);
}

console.log(`Restoring from ${file}...`);

try {
  execSync(`psql "${databaseUrl}" < "${file}"`, { stdio: 'inherit' });
  console.log("Restore successful!");
} catch (error) {
  console.error("Restore failed", error);
  process.exit(1);
}
