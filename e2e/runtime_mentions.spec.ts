import { test, expect } from '@playwright/test';

test('Real Runtime Verification of @Mentions', async ({ browser }) => {
  // 1. Create two contexts
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();
  
  // 2. Login User A (dev)
  await pageA.goto('/login');
  await pageA.fill('input[name="username"]', 'dev');
  await pageA.fill('input[type="password"]', 'dev');
  await pageA.click('button[type="submit"]');
  await expect(pageA).toHaveURL(/.*dashboard.*/);
  
  // 3. Login User B (DLUFFF)
  await pageB.goto('/login');
  await pageB.fill('input[name="username"]', 'DLUFFF');
  await pageB.fill('input[type="password"]', 'dev');
  await pageB.click('button[type="submit"]');
  await expect(pageB).toHaveURL(/.*dashboard.*/);
  
  // 4. Navigate to Community Messages
  await pageA.goto('/messages');
  await pageB.goto('/messages');
  
  // Make sure we are in the community tab/conversation
  // Usually there's a button or it's default. Let's find "Community" or "Unit" and click it
  await pageA.click('text=Community');
  await pageB.click('text=Community');

  const uniqueString = `Test ${Date.now()}`;
  
  // 5. User A sends a message mentioning User B (fffff)
  // Need to use the textarea. Wait, Composer might have placeholder="Message the whole unit…"
  const composerA = pageA.locator('textarea[placeholder*="Message the whole unit"]');
  await composerA.fill(`Hello @`);
  
  // Wait for mention autocomplete to appear
  await pageA.waitForSelector('text=fffff');
  await pageA.click('text=fffff');
  
  // Ensure the mention inserted space and then type unique string
  await composerA.pressSequentially(` ${uniqueString}`);
  
  // Click send button
  // Look for button with title "Send message" or aria-label="Send" or icon
  // Wait, let's just press Enter? No, textarea might require Shift+Enter. Or there's a send button.
  // Actually, we can click the SVG button or whatever button submits.
  const sendButton = pageA.locator('button[type="submit"], button[aria-label="Send message"], button[aria-label="Send"]');
  await sendButton.click();
  
  // 6. Verify User A sees the mention as an interactive element
  const msgA = pageA.locator(`text=${uniqueString}`).locator('..'); 
  const mentionA = msgA.locator('button:has-text("fffff")');
  await expect(mentionA).toBeVisible();
  
  // 7. Verify clicking mention opens DM
  await mentionA.click();
  // Check that the URL changes to DM or it says "fffff" in the header
  await expect(pageA.locator('h1, h2, h3').locator('text=fffff')).toBeVisible();
  
  // 8. Go back to community and reload
  await pageA.goto('/messages');
  await pageA.click('text=Community');
  await pageA.reload();
  
  // 9. Verify User A STILL sees the mention as an interactive element
  const msgA_reloaded = pageA.locator(`text=${uniqueString}`).locator('..');
  const mentionA_reloaded = msgA_reloaded.locator('button:has-text("fffff")');
  await expect(mentionA_reloaded).toBeVisible();
  await mentionA_reloaded.click();
  await expect(pageA.locator('h1, h2, h3').locator('text=fffff')).toBeVisible();
  
  // 10. Verify User B sees the mention
  await pageB.goto('/messages');
  await pageB.click('text=Community');
  await pageB.reload(); // just to be safe
  
  const msgB = pageB.locator(`text=${uniqueString}`).locator('..');
  const mentionB = msgB.locator('button:has-text("fffff")');
  await expect(mentionB).toBeVisible();
  
  // 11. User B clicks mention
  await mentionB.click();
  // Ensure it opens their own DM (or their profile? Mentions usually open DM)
  await expect(pageB.locator('h1, h2, h3').locator('text=fffff')).toBeVisible();

  console.log("SUCCESS! All real runtime verifications passed!");
});
