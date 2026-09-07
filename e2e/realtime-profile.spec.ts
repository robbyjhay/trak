import { test, expect, type Page } from "@playwright/test";

const MEMBER_U = "qa_member";
const MEMBER_PW = "QaTestPass123!";
const HEAD_U = "qa_head";
const HEAD_PW = "QaTestPass123!";

async function login(page: Page, username: string, password: string) {
  await page.goto("/login");
  await page.waitForLoadState("domcontentloaded");
  // Same-context sessions auto-redirect to /dashboard (no login form).
  if ((await page.locator('input[name="username"]').count()) === 0) {
    await expect(page).toHaveURL(/\/dashboard/);
    return;
  }
  await page.fill('input[name="username"]', username);
  await page.fill('input[name="password"]', password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

async function memberRow(page: Page) {
  return page
    .locator("div.mb-3.flex.items-center.gap-3")
    .filter({ hasText: "qa_member" })
    .filter({ has: page.getByRole("button", { name: "Edit", exact: true }) })
    .last();
}

async function openMemberModal(page: Page) {
  await (await memberRow(page)).getByRole("button", { name: "Edit", exact: true }).click();
  await expect(page.locator("div.bg-modal").getByText("Edit personnel record")).toBeVisible({ timeout: 10000 });
  return page.locator("div.bg-modal");
}

test.describe("Realtime profile synchronization", () => {
  test("member phone+email change reaches open Head Dashboard without refresh", async ({ browser }) => {
    const headCtx = await browser.newContext();
    const memberCtx = await browser.newContext();
    const headPage = await headCtx.newPage();
    const memberPage = await memberCtx.newPage();

    await login(headPage, HEAD_U, HEAD_PW); // Session B — Head Dashboard
    await expect(headPage.getByText("Team profiles").first()).toBeVisible({ timeout: 15000 });
    await login(memberPage, MEMBER_U, MEMBER_PW); // Session A — member

    // Member's profile page: read current phone, then change + save.
    await memberPage.goto("/profile");
    const phoneInput = memberPage.getByPlaceholder("+234...");
    await expect(phoneInput).toBeVisible({ timeout: 15000 });
    const oldPhone = (await phoneInput.inputValue()).trim();
    const newPhone = oldPhone === "+234 911 777 7777" ? "+234 911 777 8888" : "+234 911 777 7777";
    await phoneInput.fill(newPhone);
    await memberPage.getByRole("button", { name: /save changes/i }).click();
    await expect(memberPage.getByText("Contact details saved")).toBeVisible({ timeout: 15000 });

    // Head dashboard was never refreshed. Open the member's personnel modal and
    // confirm the store already reflects the WS-delivered update.
    const modal = await openMemberModal(headPage);
    await expect(modal.locator("input.field-input").nth(2)).toHaveValue(newPhone, { timeout: 15000 });
    expect((await modal.locator("input.field-input").nth(2).inputValue()).trim()).not.toBe(oldPhone);

    await headCtx.close();
    await memberCtx.close();
  });

  test("Head editing a member updates Team profiles row without refresh", async ({ browser }) => {
    const headCtx = await browser.newContext();
    const headPage = await headCtx.newPage();
    await login(headPage, HEAD_U, HEAD_PW);
    await expect(headPage.getByText("Team profiles").first()).toBeVisible({ timeout: 15000 });

    const modal = await openMemberModal(headPage);
    const newDesig = `QA Desig ${Date.now()}`;
    await modal.locator("input.field-input").nth(0).fill(newDesig);
    await modal.getByRole("button", { name: "Save", exact: true }).click();
    await expect(modal).toBeHidden({ timeout: 10000 });

    // Row label updates from the live store without any page reload.
    await expect(headPage.getByText(newDesig).first()).toBeVisible({ timeout: 15000 });

    await headCtx.close();
  });

  test("same-user two tabs: newest tab holds the live WebSocket", async ({ browser }) => {
    const headCtx = await browser.newContext();
    const tabA = await headCtx.newPage(); // /dashboard — first/older socket
    const tabB = await headCtx.newPage(); // /dashboard — second/newer socket
    await login(tabA, HEAD_U, HEAD_PW);
    await expect(tabA.getByText("Team profiles").first()).toBeVisible({ timeout: 15000 });
    await login(tabB, HEAD_U, HEAD_PW);
    await expect(tabB.getByText("Team profiles").first()).toBeVisible({ timeout: 15000 });

    const memberCtx = await browser.newContext();
    const memberPage = await memberCtx.newPage();
    await login(memberPage, MEMBER_U, MEMBER_PW);
    await memberPage.goto("/profile");
    const phoneInput = memberPage.getByPlaceholder("+234...");
    await expect(phoneInput).toBeVisible({ timeout: 15000 });
    const oldPhone = (await phoneInput.inputValue()).trim();
    const newPhone = `+234 911 ${Math.floor(1000 + Math.random() * 9000)} 0001`;
    await phoneInput.fill(newPhone);
    await memberPage.getByRole("button", { name: /save changes/i }).click();
    await expect(memberPage.getByText("Contact details saved")).toBeVisible({ timeout: 15000 });

    // Tab B (newest) holds the live socket: it reflects the WS-delivered phone.
    tabB.bringToFront();
    const modalB = await openMemberModal(tabB);
    await expect(modalB.locator("input.field-input").nth(2)).toHaveValue(newPhone, { timeout: 15000 });
    await modalB.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(modalB).toBeHidden({ timeout: 10000 });

    // Tab A (older) had its socket replaced (code 4000): it does NOT receive the
    // live event and still shows the old phone until the 75s fallback poll.
    tabA.bringToFront();
    const modalA = await openMemberModal(tabA);
    await modalA.locator("input.field-input").nth(2).waitFor({ timeout: 5000 });
    const tabAPhone = (await modalA.locator("input.field-input").nth(2).inputValue()).trim();
    console.log(`MULTITAB_OBSERVATION oldTab(a)="${tabAPhone}" newTab(b)="${newPhone}" savedPhone="${newPhone}"`);
    expect(tabAPhone).toBe(oldPhone);

    await headCtx.close();
    await memberCtx.close();
  });
});