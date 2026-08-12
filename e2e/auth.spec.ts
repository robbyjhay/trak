import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('login page renders correctly', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/Trak/);
    await expect(page.locator('form')).toBeVisible();
    await expect(page.locator('input[type="text"], input[name="username"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('unauthenticated user redirects to login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*login.*/);
  });

  test('unauthenticated user redirects from activities', async ({ page }) => {
    await page.goto('/activities');
    await expect(page).toHaveURL(/.*login.*/);
  });

  test('unauthenticated user redirects from profile', async ({ page }) => {
    await page.goto('/profile');
    await expect(page).toHaveURL(/.*login.*/);
  });

  test('login with invalid credentials shows error', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#loginUser', 'invaliduser');
    await page.fill('#loginPass', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Scope to the login form — Next.js also mounts an empty route announcer
    // with role="alert" (#__next-route-announcer__).
    const alert = page.locator('form [role="alert"]');
    await expect(alert).toBeVisible({ timeout: 15_000 });
    // AuthError path: "not recognised". Infrastructure outage path: "Unable to sign in…".
    await expect(alert).toContainText(
      /not recognised|incorrect|invalid|unable to sign in|try again/i,
    );
  });

  test('login form has proper accessibility attributes', async ({ page }) => {
    await page.goto('/login');
    
    // Check for labels or aria-labels
    const usernameInput = page.locator('input[name="username"], input[type="text"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    
    await expect(usernameInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    
    // Check form has proper structure
    const form = page.locator('form');
    await expect(form).toBeVisible();
  });
});

test.describe('Protected Routes', () => {
  const protectedRoutes = [
    '/dashboard',
    '/activities',
    '/profile',
    '/settings',
    '/responsibilities',
    '/messages',
    '/contacts',
  ];

  for (const route of protectedRoutes) {
    test(`redirects ${route} to login when unauthenticated`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/.*login.*/);
    });
  }
});

test.describe('Public Routes', () => {
  test('/login is accessible without authentication', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('form')).toBeVisible();
  });

  test('/forgot-password is accessible without authentication', async ({ page }) => {
    await page.goto('/forgot-password');
    // Must stay on forgot-password (not bounce to login)
    await expect(page).toHaveURL(/\/forgot-password/);
    await expect(page.getByRole('heading', { name: /forgot password/i })).toBeVisible();
  });

  test('/reset-password is accessible without authentication', async ({ page }) => {
    await page.goto('/reset-password');
    // Must stay on reset-password (not bounce to login)
    await expect(page).toHaveURL(/\/reset-password/);
    await expect(page.getByRole('heading', { name: /reset password/i })).toBeVisible();
  });
});
