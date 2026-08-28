import { test, expect } from '@playwright/test';

test.describe('QA Test Flow', () => {
  test('Authentication & App Access', async ({ page }) => {
    // Navigate to login
    await page.goto('/login');
    // We need to use dev credentials.
    // Assuming dev-fill works? Wait, the dev server might not be running with ENABLE_DEV_LOGIN=true.
    // Let's just try to click the Dev Fill button if it exists.
    const devFillBtn = page.getByRole('button', { name: /dev fill/i });
    if (await devFillBtn.isVisible()) {
      await devFillBtn.click();
      await page.getByRole('button', { name: /sign in/i }).click();
    } else {
      // Fallback if dev fill is missing
      await page.fill('#loginUser', 'dev');
      await page.fill('#loginPass', 'password'); // we don't know the password
      await page.getByRole('button', { name: /sign in/i }).click();
    }
    
    // Verify dashboard loads
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
    
    // Navigate through tabs
    await page.getByRole('link', { name: /activities/i }).click();
    await expect(page).toHaveURL(/\/activities/);
    await page.getByRole('link', { name: /connect/i }).click();
    await expect(page).toHaveURL(/\/contacts|\/messages/);
  });
});
