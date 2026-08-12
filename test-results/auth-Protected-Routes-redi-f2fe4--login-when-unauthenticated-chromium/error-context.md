# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.ts >> Protected Routes >> redirects /profile to login when unauthenticated
- Location: e2e/auth.spec.ts:72:9

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/profile
Call log:
  - navigating to "http://localhost:3000/profile", waiting until "load"

```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | test.describe('Authentication Flow', () => {
  4   |   test('login page renders correctly', async ({ page }) => {
  5   |     await page.goto('/login');
  6   |     await expect(page).toHaveTitle(/Trak/);
  7   |     await expect(page.locator('form')).toBeVisible();
  8   |     await expect(page.locator('input[type="text"], input[name="username"]')).toBeVisible();
  9   |     await expect(page.locator('input[type="password"]')).toBeVisible();
  10  |     await expect(page.locator('button[type="submit"]')).toBeVisible();
  11  |   });
  12  | 
  13  |   test('unauthenticated user redirects to login', async ({ page }) => {
  14  |     await page.goto('/dashboard');
  15  |     await expect(page).toHaveURL(/.*login.*/);
  16  |   });
  17  | 
  18  |   test('unauthenticated user redirects from activities', async ({ page }) => {
  19  |     await page.goto('/activities');
  20  |     await expect(page).toHaveURL(/.*login.*/);
  21  |   });
  22  | 
  23  |   test('unauthenticated user redirects from profile', async ({ page }) => {
  24  |     await page.goto('/profile');
  25  |     await expect(page).toHaveURL(/.*login.*/);
  26  |   });
  27  | 
  28  |   test('login with invalid credentials shows error', async ({ page }) => {
  29  |     await page.goto('/login');
  30  |     await page.fill('#loginUser', 'invaliduser');
  31  |     await page.fill('#loginPass', 'wrongpassword');
  32  |     await page.click('button[type="submit"]');
  33  | 
  34  |     // Scope to the login form — Next.js also mounts an empty route announcer
  35  |     // with role="alert" (#__next-route-announcer__).
  36  |     const alert = page.locator('form [role="alert"]');
  37  |     await expect(alert).toBeVisible({ timeout: 15_000 });
  38  |     // AuthError path: "not recognised". Infrastructure outage path: "Unable to sign in…".
  39  |     await expect(alert).toContainText(
  40  |       /not recognised|incorrect|invalid|unable to sign in|try again/i,
  41  |     );
  42  |   });
  43  | 
  44  |   test('login form has proper accessibility attributes', async ({ page }) => {
  45  |     await page.goto('/login');
  46  |     
  47  |     // Check for labels or aria-labels
  48  |     const usernameInput = page.locator('input[name="username"], input[type="text"]').first();
  49  |     const passwordInput = page.locator('input[type="password"]').first();
  50  |     
  51  |     await expect(usernameInput).toBeVisible();
  52  |     await expect(passwordInput).toBeVisible();
  53  |     
  54  |     // Check form has proper structure
  55  |     const form = page.locator('form');
  56  |     await expect(form).toBeVisible();
  57  |   });
  58  | });
  59  | 
  60  | test.describe('Protected Routes', () => {
  61  |   const protectedRoutes = [
  62  |     '/dashboard',
  63  |     '/activities',
  64  |     '/profile',
  65  |     '/settings',
  66  |     '/responsibilities',
  67  |     '/messages',
  68  |     '/contacts',
  69  |   ];
  70  | 
  71  |   for (const route of protectedRoutes) {
  72  |     test(`redirects ${route} to login when unauthenticated`, async ({ page }) => {
> 73  |       await page.goto(route);
      |                  ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/profile
  74  |       await expect(page).toHaveURL(/.*login.*/);
  75  |     });
  76  |   }
  77  | });
  78  | 
  79  | test.describe('Public Routes', () => {
  80  |   test('/login is accessible without authentication', async ({ page }) => {
  81  |     await page.goto('/login');
  82  |     await expect(page).toHaveURL(/\/login/);
  83  |     await expect(page.locator('form')).toBeVisible();
  84  |   });
  85  | 
  86  |   test('/forgot-password is accessible without authentication', async ({ page }) => {
  87  |     await page.goto('/forgot-password');
  88  |     // Must stay on forgot-password (not bounce to login)
  89  |     await expect(page).toHaveURL(/\/forgot-password/);
  90  |     await expect(page.getByRole('heading', { name: /forgot password/i })).toBeVisible();
  91  |   });
  92  | 
  93  |   test('/reset-password is accessible without authentication', async ({ page }) => {
  94  |     await page.goto('/reset-password');
  95  |     // Must stay on reset-password (not bounce to login)
  96  |     await expect(page).toHaveURL(/\/reset-password/);
  97  |     await expect(page.getByRole('heading', { name: /reset password/i })).toBeVisible();
  98  |   });
  99  | });
  100 | 
```