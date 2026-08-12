
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const BACKUP_DIR = path.join(process.cwd(), 'backups');

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR);
}

const timestamp = new Date().toISOString().replace(/[:.-]/g, '_');
const filename = path.join(BACKUP_DIR, `backup_${timestamp}.sql`);
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("Error: DATABASE_URL is not set.");
  process.exit(1);
}

console.log(`Creating backup to ${filename}...`);

try {
  execSync(`pg_dump "${databaseUrl}" > "${filename}"`, { stdio: 'inherit' });
  console.log("Backup successful!");
} catch (error) {
  console.error("Backup failed", error);
  process.exit(1);
}
