# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: accessibility.spec.ts >> Accessibility - Health Endpoints >> health endpoint returns valid JSON
- Location: e2e/accessibility.spec.ts:97:7

# Error details

```
Error: expect(received).toBeTruthy()

Received: false
```

# Test source

```ts
  1   | import { test, expect } from "@playwright/test";
  2   | 
  3   | test.describe("Accessibility - Login Page", () => {
  4   |   test("has proper heading hierarchy", async ({ page }) => {
  5   |     await page.goto("/login");
  6   | 
  7   |     const h1 = page.locator("h1");
  8   |     await expect(h1).toBeVisible();
  9   |   });
  10  | 
  11  |   test("skip link targets main content", async ({ page }) => {
  12  |     await page.goto("/login");
  13  |     const skip = page.locator('a[href="#main"]');
  14  |     await expect(skip).toHaveCount(1);
  15  |     await expect(page.locator("#main")).toHaveCount(1);
  16  |   });
  17  | 
  18  |   test("form inputs have associated labels", async ({ page }) => {
  19  |     await page.goto("/login");
  20  | 
  21  |     const usernameInput = page.locator("#loginUser");
  22  |     const usernameLabel = page.locator('label[for="loginUser"]');
  23  |     await expect(usernameInput).toBeVisible();
  24  |     await expect(usernameLabel).toBeVisible();
  25  | 
  26  |     const passwordInput = page.locator("#loginPass");
  27  |     const passwordLabel = page.locator('label[for="loginPass"]');
  28  |     await expect(passwordInput).toBeVisible();
  29  |     await expect(passwordLabel).toBeVisible();
  30  |   });
  31  | 
  32  |   test("form inputs have autocomplete attributes", async ({ page }) => {
  33  |     await page.goto("/login");
  34  | 
  35  |     await expect(page.locator("#loginUser")).toHaveAttribute(
  36  |       "autocomplete",
  37  |       "username",
  38  |     );
  39  |     await expect(page.locator("#loginPass")).toHaveAttribute(
  40  |       "autocomplete",
  41  |       "current-password",
  42  |     );
  43  |   });
  44  | 
  45  |   test('error messages have role="alert"', async ({ page }) => {
  46  |     await page.goto("/login");
  47  | 
  48  |     await page.fill("#loginUser", "invaliduser");
  49  |     await page.fill("#loginPass", "wrongpassword");
  50  |     await page.click('button[type="submit"]');
  51  | 
  52  |     // Form-scoped: avoid Next.js #__next-route-announcer__ [role=alert]
  53  |     const alert = page.locator('form [role="alert"]');
  54  |     await expect(alert).toBeVisible({ timeout: 15_000 });
  55  |     await expect(alert).not.toBeEmpty();
  56  |   });
  57  | 
  58  |   test("buttons are keyboard accessible", async ({ page }) => {
  59  |     await page.goto("/login");
  60  | 
  61  |     await page.locator("#loginUser").focus();
  62  |     await expect(page.locator("#loginUser")).toBeFocused();
  63  | 
  64  |     await page.keyboard.press("Tab");
  65  |     await expect(page.locator("#loginPass")).toBeFocused();
  66  |   });
  67  | 
  68  |   test("page language is set", async ({ page }) => {
  69  |     await page.goto("/login");
  70  |     await expect(page.locator("html")).toHaveAttribute("lang", "en");
  71  |   });
  72  | 
  73  |   test("forgot password link is present and reachable", async ({ page }) => {
  74  |     await page.goto("/login");
  75  |     const link = page.getByRole("link", { name: /forgot password/i });
  76  |     await expect(link).toBeVisible();
  77  |     await link.click();
  78  |     await expect(page).toHaveURL(/forgot-password/);
  79  |     await expect(page.getByRole("heading", { name: /forgot password/i })).toBeVisible();
  80  |   });
  81  | });
  82  | 
  83  | test.describe("Accessibility - Forgot / Reset password", () => {
  84  |   test("forgot password form has labels", async ({ page }) => {
  85  |     await page.goto("/forgot-password");
  86  |     await expect(page.locator("#forgotIdentifier")).toBeVisible();
  87  |     await expect(page.locator('label[for="forgotIdentifier"]')).toBeVisible();
  88  |   });
  89  | 
  90  |   test("reset password without token shows alert", async ({ page }) => {
  91  |     await page.goto("/reset-password");
  92  |     await expect(page.locator('[role="alert"]')).toBeVisible();
  93  |   });
  94  | });
  95  | 
  96  | test.describe("Accessibility - Health Endpoints", () => {
  97  |   test("health endpoint returns valid JSON", async ({ request }) => {
  98  |     const response = await request.get("/api/health");
> 99  |     expect(response.ok()).toBeTruthy();
      |                           ^ Error: expect(received).toBeTruthy()
  100 | 
  101 |     const contentType = response.headers()["content-type"];
  102 |     expect(contentType).toContain("application/json");
  103 |   });
  104 | });
  105 | 
  106 | test.describe("Accessibility - Focus Management", () => {
  107 |   test("login form has focusable controls", async ({ page }) => {
  108 |     await page.goto("/login");
  109 |     await page.locator("#loginUser").focus();
  110 |     await expect(page.locator("#loginUser")).toBeFocused();
  111 |   });
  112 | });
  113 | 
  114 | test.describe("Accessibility - Color Contrast helpers", () => {
  115 |   test("error text uses critical color token", async ({ page }) => {
  116 |     await page.goto("/login");
  117 | 
  118 |     await page.fill("#loginUser", "invaliduser");
  119 |     await page.fill("#loginPass", "wrongpassword");
  120 |     await page.click('button[type="submit"]');
  121 | 
  122 |     const error = page.locator('form [role="alert"]');
  123 |     await expect(error).toBeVisible({ timeout: 15_000 });
  124 |     await expect(error).not.toBeEmpty();
  125 | 
  126 |     const color = await error.evaluate(
  127 |       (el) => window.getComputedStyle(el).color,
  128 |     );
  129 |     expect(color).toContain("rgb");
  130 |   });
  131 | });
  132 | 
```