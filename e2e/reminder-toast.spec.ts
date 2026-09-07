import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

/**
 * Reminder toast E2E (TRAK Smart Task Reminder).
 *
 * Verifies the FULL live pipeline against the running dev server + local Postgres:
 *   scheduler tick → processDueReminders → Notification row → client poll
 *   (/api/bootstrap?mode=poll) → in-app toast.
 *
 * The task is inserted ALREADY due so the scheduler (60s tick) fires it on its
 * next run; the client poll (~15s) then surfaces the toast. Non-destructive.
 */
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL required for reminder E2E");

const adapter = new PrismaPg({ connectionString: DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const REMINDER_SUFFIX = "Don't forget to complete and log it.";

test.setTimeout(360_000);

test("due task fires an in-app reminder toast", async ({ page }) => {
  // --- 1. Insert a Task for the dev user, ALREADY due (fires next scheduler tick). ---
  const dev = await prisma.user.findUnique({ where: { usernameNormalized: "dev" } });
  if (!dev) throw new Error("dev user not found — run prisma seed first");

  const dueAt = new Date(Date.now() - 60 * 1000); // due 1 min ago
  const startUtcDay = Date.UTC(dueAt.getUTCFullYear(), dueAt.getUTCMonth(), dueAt.getUTCDate());
  const dateOnly = new Date(startUtcDay);
  const startTime =
    `${String(dueAt.getUTCHours()).padStart(2, "0")}:${String(dueAt.getUTCMinutes()).padStart(2, "0")}`;

  const act = await prisma.activity.create({
    data: {
      title: `Toast E2E ${Date.now()}`,
      type: "Task",
      description: "reminder toast verification",
      createdById: dev.id,
      startDate: dateOnly,
      endDate: dateOnly,
      startTime,
      endTime: "",
      dueAt,
      reminderStatus: { cancelled: false, morningSent: false, dueSent: false, eodSent: false },
      reminderVersion: 1,
    },
  });
  console.log(`[reminder-e2e] inserted task ${act.id} dueAt=${dueAt.toISOString()}`);

  // --- 2. Log in as dev and stay on /dashboard (not the target route). ---
  await page.goto("/login");
  await page.fill("#loginUser", "dev");
  await page.fill("#loginPass", "dev");
  await page.click('button[type="submit"]');
  await page.waitForURL(/dashboard/, { timeout: 15_000 });
  await page.waitForTimeout(3000);

  // --- 3. Wait for scheduler + poll to deliver the reminder toast. ---
  const toast = page.locator('[role="status"]', { hasText: REMINDER_SUFFIX });
  await toast.waitFor({ state: "visible", timeout: 300_000 });

  const text = await toast.innerText();
  console.log(`[reminder-e2e] visible toast: ${text.replace(/\n/g, " | ")}`);

  await prisma.$disconnect();
});