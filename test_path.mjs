import { chromium } from 'playwright';
import path from 'path';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`file://${path.resolve('public/test_path.html')}`);
  await page.screenshot({ path: 'public/test_path.png' });
  await browser.close();
})();
