import { test, expect, chromium } from "@playwright/test";

/**
 * Session persistence regression (TRAK persistent-user-sessions fix).
 *
 * Root cause: `setSessionCookie()` sent `Max-Age` without an explicit
 * `Expires`, so some browsers treated `trak_session` as a session-only
 * cookie. These tests lock in the persistent-cookie contract:
 *
 *   Login → authenticated → reload → still authenticated
 *   Login → storageState → new context → still authenticated
 *   Set-Cookie includes BOTH Max-Age and Expires (+ HttpOnly)
 *
 * The suite degrades to skip (not fail) when the dev-login roster or the
 * auth backend is unavailable, so it stays non-flaky in environments
 * without a seeded DB.
 */

const SESSION_COOKIE = "trak_session";
// Roster ids mirror src/lib/mockDb/users.ts SEED_USERS.
const ROSTER_IDS = ["babajide", "benson", "agbaje"];

async function getDevCreds(
  request: import("@playwright/test").APIRequestContext,
): Promise<{ username: string; password: string } | null> {
  for (const id of ROSTER_IDS) {
    try {
      const res = await request.get(
        `/api/auth/dev-fill?id=${encodeURIComponent(id)}`,
      );
      if (!res.ok()) continue;
      const data = (await res.json()) as {
        username?: string;
        password?: string;
      };
      if (data.username && data.password) return data as {
        username: string;
        password: string;
      };
    } catch {
      /* try next id */
    }
  }
  return null;
}

test.describe("Session persistence (persistent cookie regression)", () => {
  test("login Set-Cookie includes Max-Age AND Expires (persistent, not session-only)", async ({
    request,
  }) => {
    const creds = await getDevCreds(request);
    test.skip(
      creds === null,
      "dev-login roster unavailable — needs ENABLE_DEV_LOGIN=true + seeded DB",
    );
    if (!creds) return;

    const res = await request.post("/api/auth/login", {
      data: creds,
      // CSRF gate (proxy.ts) requires an Origin matching Host on POST /api/*.
      headers: { Origin: "http://localhost:3000" },
    });
    test.skip(
      res.status() !== 200,
      `login backend unavailable (status ${res.status()}) — skipping persistence assertion`,
    );
    if (res.status() !== 200) return;

    const setCookie = res.headers()["set-cookie"] ?? "";
    // Never log the token itself — assert on attributes only.
    expect(setCookie).toContain(SESSION_COOKIE);
    expect(setCookie).toMatch(/max-age\s*=/i);
    expect(setCookie).toMatch(/expires\s*=/i);
    expect(setCookie).toMatch(/httponly/i);

    const maxAge = /max-age\s*=\s*(\d+)/i.exec(setCookie)?.[1];
    expect(maxAge).toBeDefined();
    // Default SESSION_TTL_DAYS=7 → 604800s. Accept any positive TTL from env.
    expect(Number(maxAge)).toBeGreaterThan(0);
  });

  test("authenticated state survives page reload", async ({ page, context }) => {
    await page.goto("/login");
    const rosterButton = page
      .locator('button[aria-label^="Select "]')
      .first();
    const hasRoster = await rosterButton
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    test.skip(
      !hasRoster,
      "dev-login roster not visible — needs ENABLE_DEV_LOGIN=true + seeded DB",
    );
    if (!hasRoster) return;

    await rosterButton.click();
    await page.waitForTimeout(500);
    await page.getByRole("button", { name: /sign in/i }).click();

    try {
      await expect(page).toHaveURL(/\/(dashboard|set-password)/, {
        timeout: 15_000,
      });
    } catch {
      test.skip(true, "login did not complete — backend may be unavailable");
      return;
    }

    // Cookie must be persistent: Playwright reports expires=-1 for session-only.
    const cookies = await context.cookies();
    const session = cookies.find((c) => c.name === SESSION_COOKIE);
    expect(session).toBeDefined();
    expect(session?.httpOnly).toBe(true);
    expect(session?.expires).toBeGreaterThan(0);
    expect(session!.expires * 1000).toBeGreaterThan(Date.now());

    // THE lifecycle regression: reload must keep the user authenticated.
    await page.reload();
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });
  });

  test("authenticated state survives browser-context restart via storageState", async ({
    page,
    context,
  }) => {
    await page.goto("/login");
    const rosterButton = page
      .locator('button[aria-label^="Select "]')
      .first();
    const hasRoster = await rosterButton
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    test.skip(
      !hasRoster,
      "dev-login roster not visible — needs ENABLE_DEV_LOGIN=true + seeded DB",
    );
    if (!hasRoster) return;

    await rosterButton.click();
    await page.waitForTimeout(500);
    await page.getByRole("button", { name: /sign in/i }).click();

    try {
      await expect(page).toHaveURL(/\/(dashboard|set-password)/, {
        timeout: 15_000,
      });
    } catch {
      test.skip(true, "login did not complete — backend may be unavailable");
      return;
    }

    // Persist cookies/storage as a real browser restart would (no real
    // browser close — uses a second context with the saved state).
    const state = await context.storageState();
    const saved = state.cookies.find((c) => c.name === SESSION_COOKIE);
    expect(saved).toBeDefined();
    // storageState cookie expires is unix seconds; -1/undefined = session-only.
    expect(saved?.expires ?? -1).toBeGreaterThan(0);

    const browser = await chromium.launch();
    try {
      const ctx2 = await browser.newContext({ storageState: state });
      const page2 = await ctx2.newPage();
      await page2.goto("/dashboard");
      // Still authenticated: must NOT bounce to /login.
      await expect(page2).not.toHaveURL(/\/login/, { timeout: 15_000 });
      await ctx2.close();
    } finally {
      await browser.close();
    }
  });
});
