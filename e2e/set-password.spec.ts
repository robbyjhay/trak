import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import pg from 'pg';
import 'dotenv/config';

let prisma: PrismaClient;

test.beforeAll(() => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const pool = new pg.Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  prisma = new PrismaClient({ adapter });
});

test.afterAll(async () => {
  await prisma.$disconnect();
});

test.describe('Set Password Screen', () => {
  const testUsername = `testuser_${Date.now()}`;
  const tempPassword = 'TempPassword123!';
  const newPassword = 'NewPassword123!@#';

  test.beforeAll(async () => {
    // Clean up if somehow it already exists
    await prisma.user.deleteMany({ where: { username: testUsername } });

    const passwordHash = await bcrypt.hash(tempPassword, 10);
    await prisma.user.create({
      data: {
        username: testUsername,
        usernameNormalized: testUsername.toLowerCase(),
        passwordHash,
        role: 'member',
        mustChangePassword: true,
        isActive: true,
        profile: {
          create: {
            name: 'Test User',
            phone: '1234567890',
            designation: 'Tester',
            gradeLevel: 'GL 08',
            sex: 'Any',
            stateOfOrigin: 'Any',
            color: '#000000',
          }
        },
        preferences: {
          create: {}
        }
      }
    });
  });

  test.afterAll(async () => {
    await prisma.user.deleteMany({ where: { username: testUsername } });
  });

  test('user can log out from /set-password, then log back in and change password', async ({ page }) => {
    // 1. Log in with temp password
    await page.goto('/login');
    await page.fill('input[name="username"]', testUsername);
    await page.fill('input[name="password"]', tempPassword);
    await page.click('button[type="submit"]');

    // Should be forced to /set-password
    await expect(page).toHaveURL(/.*set-password/);
    
    // Check if the "Log out" button is there
    const logoutBtn = page.locator('button:has-text("Log out")');
    await expect(logoutBtn).toBeVisible();

    // 2. Click "Log out"
    await logoutBtn.click();

    // 3. Verify redirect to /login and session invalidation
    await expect(page).toHaveURL(/.*login.*/);

    // 4. Verify we cannot access /set-password without logging in
    await page.goto('/set-password');
    await expect(page).toHaveURL(/.*login.*/);

    // 5. Verify temporary password remains valid after logout and we can log in again
    await page.goto('/login');
    await page.fill('input[name="username"]', testUsername);
    await page.fill('input[name="password"]', tempPassword);
    await page.click('button[type="submit"]');

    // Should be back to /set-password
    await expect(page).toHaveURL(/.*set-password/);

    // 6. Complete the new-password form
    await page.fill('input[name="password"]', newPassword);
    await page.fill('input[name="confirm"]', newPassword);
    await page.locator('button[type="submit"]', { hasText: 'Save password & continue' }).click();

    // Should be redirected to dashboard
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 30_000 });

    // Verify in DB that mustChangePassword is false
    const dbUser = await prisma.user.findUnique({
      where: { usernameNormalized: testUsername.toLowerCase() }
    });
    expect(dbUser?.mustChangePassword).toBe(false);

    // Clean up session by logging out again (from Topbar)
    await page.click('button[aria-haspopup="menu"]'); // open menu
    await page.click('button[role="menuitem"]:has-text("Log out")');
    await expect(page).toHaveURL(/.*login.*/);
  });
});
