# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: login.spec.ts >> login smoke test
- Location: e2e/login.spec.ts:3:5

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/login
Call log:
  - navigating to "http://localhost:3000/login", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test('login smoke test', async ({ page }) => {
> 4  |   await page.goto('/login');
     |              ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/login
  5  |   await expect(page).toHaveTitle(/Trak/);
  6  |   await expect(page.locator('form')).toBeVisible();
  7  | 
  8  |   // Test dashboard redirects to login if unauth
  9  |   await page.goto('/dashboard');
  10 |   await expect(page).toHaveURL(/.*login.*/);
  11 | });
  12 | 
```