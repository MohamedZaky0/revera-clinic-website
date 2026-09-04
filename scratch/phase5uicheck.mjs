import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:3000';
const EMAIL = 'saif@superadmin.com';
const PASSWORD = '12345678Sa#';

const browser = await chromium.launch();
const page = await browser.newPage();
const consoleErrors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});
page.on('pageerror', (err) => consoleErrors.push(String(err)));

await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle' });
await page.fill('input[placeholder*="email" i]', EMAIL);
await page.fill('input[type="password"]', PASSWORD);
await page.click('button[type="submit"]:has-text("Access Dashboard")');
await page.waitForSelector('text=Authenticating...', { state: 'hidden', timeout: 20000 }).catch(() => {});
await page.waitForTimeout(2000);

// Navigate to Finance section
const financeNav = page.locator('text=Finance').first();
await financeNav.click({ timeout: 10000 }).catch(async () => {
  console.log('Could not click Finance nav directly, trying sidebar item');
});
await page.waitForTimeout(1500);

for (const tabLabel of ['Capacity', 'Service Mix']) {
  const tab = page.locator(`button:has-text("${tabLabel}")`).first();
  const visible = await tab.isVisible().catch(() => false);
  console.log(`Tab "${tabLabel}" visible in sidebar: ${visible}`);
  if (!visible) continue;
  await tab.click();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `D:/Work/Revera/screenshots_2026-07-29/phase5-${tabLabel.toLowerCase().replace(/\s+/g, '-')}.png`, fullPage: true });
  console.log(`Screenshot taken for ${tabLabel}`);
}

console.log('Console errors:', consoleErrors.length ? consoleErrors : 'none');
await browser.close();
