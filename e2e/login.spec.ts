import { test, expect } from '@playwright/test';

test('login smoke test', async ({ page }) => {
  await page.goto('/login');
  await expect(page).toHaveTitle(/Trak/);
  await expect(page.locator('form')).toBeVisible();

  // Test dashboard redirects to login if unauth
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/.*login.*/);
});
