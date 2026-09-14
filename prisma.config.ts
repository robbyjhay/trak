// Prisma 7 config — datasource URL lives here, not in schema.prisma
import "dotenv/config";
import { defineConfig } from "prisma/config";

// Derive a shadow database URL from the main datasource (same server, same
// credentials) so `migrate dev`/`migrate diff` can reconcile without sharing
// credentials in this file.
const dbUrl = process.env.DATABASE_URL;
let shadowDatabaseUrl: string | undefined;
if (dbUrl) {
  const u = new URL(dbUrl);
  u.pathname = "/trak_shadow";
  shadowDatabaseUrl = u.toString();
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL as string,
    ...(shadowDatabaseUrl ? { shadowDatabaseUrl } : {}),
  },
});
