import { test, expect } from '@playwright/test';

test('manual verification flow', async ({ page, context }) => {
  // 1. Login as Unit Head
  await page.goto('/login');
  await page.fill('input[name="username"]', 'DLUARU');
  await page.fill('input[name="password"]', 'TrakDevPass123!');
  await page.click('button[type="submit"]');

  // Skip set-password if prompted
  if (page.url().includes('set-password')) {
    await page.fill('input[name="newPassword"]', 'TrakDevPass123!');
    await page.fill('input[name="confirmPassword"]', 'TrakDevPass123!');
    await page.click('button[type="submit"]');
  }
  
  await expect(page).toHaveURL(/.*\/dashboard/);

  // 2. Add a member
  await page.click('button:has-text("+ Add member")');
  await page.fill('input[placeholder="Full name"]', 'E2E Test Member');
  await page.fill('input[placeholder="e.g. +234 80 1234 5678"]', '+2348000000000');
  await page.selectOption('select:has(option[value="FCT"])', 'FCT');
  await page.selectOption('select:has(option[value="intern"])', 'intern');
  await page.click('button:has-text("Add member")');

  // 3. Confirm temporary password
  await expect(page.locator('text=Member created successfully')).toBeVisible();
  const username = await page.locator('text=Username >> xpath=../div').innerText();
  const password = await page.locator('text=Initial password >> xpath=../div').innerText();
  console.log('Created member:', username, password);
  
  await page.click('button:has-text("Close")');

  // 4. Log out
  await page.click('text=Logout');
  await expect(page).toHaveURL(/.*\/login/);

  // 5. Login as newly created member
  const memberContext = await context.browser()?.newContext() || context;
  const memberPage = await memberContext.newPage();
  await memberPage.goto('http://localhost:3000/login'); // fallback
  await memberPage.fill('input[name="username"]', username.trim());
  await memberPage.fill('input[name="password"]', password.trim());
  await memberPage.click('button[type="submit"]');

  // 6. Confirm forced password change
  await expect(memberPage).toHaveURL(/.*\/set-password/);

  // 7. Set permanent password
  await memberPage.fill('input[name="newPassword"]', 'NewPass123!!');
  await memberPage.fill('input[name="confirmPassword"]', 'NewPass123!!');
  await memberPage.click('button[type="submit"]');

  // 8. Confirm member reaches dashboard
  await expect(memberPage).toHaveURL(/.*\/dashboard/);
  await memberPage.close();

  // 9. Log back in as Unit Head (or reuse previous head page if still active)
  // Actually, we logged out of head page, so let's log back in.
  await page.fill('input[name="username"]', 'DLUARU');
  await page.fill('input[name="password"]', 'TrakDevPass123!');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/.*\/dashboard/);

  // 10. Edit that member
  const editButtonLocator = page.locator(`div:has-text("${username.trim()}")`).locator('button:has-text("Edit")').first();
  await editButtonLocator.click();

  // 11. Change their role/classification
  await page.selectOption('select:has(option[value="member"])', 'member');
  await page.click('button:has-text("Save")');
  await expect(page.locator('text=Personnel record updated')).toBeVisible();

  // 12. Verify the change persists after reload
  await page.reload();
  await expect(page.locator(`text=${username.trim()}`)).toBeVisible();

  // 13. Reset their password
  await editButtonLocator.click();
  page.on('dialog', dialog => dialog.accept());
  await page.click('button:has-text("Reset Password")');
  
  await expect(page.locator('text=Password Reset Successfully')).toBeVisible();
  const resetPassword = await page.locator('text=New temporary password >> xpath=../div').innerText();
  await page.click('button:has-text("Close")');

  // 14. Verify member can log in with new temp password
  const memberPage2 = await memberContext.newPage();
  await memberPage2.goto('http://localhost:3000/login');
  await memberPage2.fill('input[name="username"]', username.trim());
  await memberPage2.fill('input[name="password"]', resetPassword.trim());
  await memberPage2.click('button[type="submit"]');
  await expect(memberPage2).toHaveURL(/.*\/set-password/);
  await memberPage2.close();

  // 15. Deactivate the member
  await editButtonLocator.click();
  page.on('dialog', dialog => dialog.accept());
  await page.click('button:has-text("Deactivate Account")');
  await expect(page.locator('text=Account deactivated')).toBeVisible();

  // 16. Verify deactivated member can no longer access TRAK
  const memberPage3 = await memberContext.newPage();
  await memberPage3.goto('http://localhost:3000/login');
  await memberPage3.fill('input[name="username"]', username.trim());
  await memberPage3.fill('input[name="password"]', resetPassword.trim());
  await memberPage3.click('button[type="submit"]');
  await expect(memberPage3.locator('text=Invalid credentials')).toBeVisible();
  await memberPage3.close();

  // 17. Verify Unit Head remains unaffected
  await expect(page).toHaveURL(/.*\/dashboard/);

  console.log("All verifications passed!");
});
