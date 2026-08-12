import { test, expect } from "@playwright/test";

test.describe("Accessibility - Login Page", () => {
  test("has proper heading hierarchy", async ({ page }) => {
    await page.goto("/login");

    const h1 = page.locator("h1");
    await expect(h1).toBeVisible();
  });

  test("skip link targets main content", async ({ page }) => {
    await page.goto("/login");
    const skip = page.locator('a[href="#main"]');
    await expect(skip).toHaveCount(1);
    await expect(page.locator("#main")).toHaveCount(1);
  });

  test("form inputs have associated labels", async ({ page }) => {
    await page.goto("/login");

    const usernameInput = page.locator("#loginUser");
    const usernameLabel = page.locator('label[for="loginUser"]');
    await expect(usernameInput).toBeVisible();
    await expect(usernameLabel).toBeVisible();

    const passwordInput = page.locator("#loginPass");
    const passwordLabel = page.locator('label[for="loginPass"]');
    await expect(passwordInput).toBeVisible();
    await expect(passwordLabel).toBeVisible();
  });

  test("form inputs have autocomplete attributes", async ({ page }) => {
    await page.goto("/login");

    await expect(page.locator("#loginUser")).toHaveAttribute(
      "autocomplete",
      "username",
    );
    await expect(page.locator("#loginPass")).toHaveAttribute(
      "autocomplete",
      "current-password",
    );
  });

  test('error messages have role="alert"', async ({ page }) => {
    await page.goto("/login");

    await page.fill("#loginUser", "invaliduser");
    await page.fill("#loginPass", "wrongpassword");
    await page.click('button[type="submit"]');

    // Form-scoped: avoid Next.js #__next-route-announcer__ [role=alert]
    const alert = page.locator('form [role="alert"]');
    await expect(alert).toBeVisible({ timeout: 15_000 });
    await expect(alert).not.toBeEmpty();
  });

  test("buttons are keyboard accessible", async ({ page }) => {
    await page.goto("/login");

    await page.locator("#loginUser").focus();
    await expect(page.locator("#loginUser")).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(page.locator("#loginPass")).toBeFocused();
  });

  test("page language is set", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });

  test("forgot password link is present and reachable", async ({ page }) => {
    await page.goto("/login");
    const link = page.getByRole("link", { name: /forgot password/i });
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/forgot-password/);
    await expect(page.getByRole("heading", { name: /forgot password/i })).toBeVisible();
  });
});

test.describe("Accessibility - Forgot / Reset password", () => {
  test("forgot password form has labels", async ({ page }) => {
    await page.goto("/forgot-password");
    await expect(page.locator("#forgotIdentifier")).toBeVisible();
    await expect(page.locator('label[for="forgotIdentifier"]')).toBeVisible();
  });

  test("reset password without token shows alert", async ({ page }) => {
    await page.goto("/reset-password");
    await expect(page.locator('[role="alert"]')).toBeVisible();
  });
});

test.describe("Accessibility - Health Endpoints", () => {
  test("health endpoint returns valid JSON", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.ok()).toBeTruthy();

    const contentType = response.headers()["content-type"];
    expect(contentType).toContain("application/json");
  });
});

test.describe("Accessibility - Focus Management", () => {
  test("login form has focusable controls", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#loginUser").focus();
    await expect(page.locator("#loginUser")).toBeFocused();
  });
});

test.describe("Accessibility - Color Contrast helpers", () => {
  test("error text uses critical color token", async ({ page }) => {
    await page.goto("/login");

    await page.fill("#loginUser", "invaliduser");
    await page.fill("#loginPass", "wrongpassword");
    await page.click('button[type="submit"]');

    const error = page.locator('form [role="alert"]');
    await expect(error).toBeVisible({ timeout: 15_000 });
    await expect(error).not.toBeEmpty();

    const color = await error.evaluate(
      (el) => window.getComputedStyle(el).color,
    );
    expect(color).toContain("rgb");
  });
});
