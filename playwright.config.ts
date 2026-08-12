import { defineConfig, devices } from '@playwright/test';

/**
 * E2E execution model (matches CI intent in .github/workflows/ci.yml):
 * - Playwright starts `npm run dev` (custom server + HTTP) unless one is already on :3000
 * - Chromium only; browsers must be installed: `npx playwright install chromium`
 * - CI uses a dedicated Postgres service DB (`trak_test`) and seeds demo users
 * - Local runs inherit process env / `.env` — prefer a non-production DATABASE_URL
 *
 * Isolation: tests are non-destructive (no migrate reset, no seed, no user deletes).
 * Do not point DATABASE_URL at production when running E2E.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000/api/health',
    // Local: reuse a running dev server. CI: always start fresh.
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      // Ensure health probe path works; inherit the rest from the parent env.
      ...process.env,
      NODE_ENV: process.env.NODE_ENV || 'development',
    },
  },
});
