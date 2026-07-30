import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:3000';
const EMAIL = 'saif@superadmin.com';
const PASSWORD = process.env.SUPERADMIN_PASSWORD ?? '';

if (!PASSWORD) {
  console.error('Set SUPERADMIN_PASSWORD env var to run this check.');
  process.exit(1);
}

const browser = await chromium.launch();
const page = await browser.newPage();
const dialogMessages = [];
page.on('dialog', async (dialog) => {
  dialogMessages.push(dialog.message());
  if (dialog.message().includes('Permanently delete')) {
    await dialog.dismiss(); // choose soft delete
  } else {
    await dialog.accept();
  }
});
page.on('console', (msg) => { if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text()); });

await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle' });
await page.fill('input[placeholder*="email" i]', EMAIL);
await page.fill('input[type="password"]', PASSWORD);
await page.click('button[type="submit"]:has-text("Access Dashboard")');
await page.waitForSelector('text=Authenticating...', { state: 'hidden', timeout: 20000 }).catch(() => {});
await page.waitForTimeout(2000);

await page.locator('text=Inventory').first().click({ timeout: 10000 });
await page.waitForTimeout(1200);
await page.locator('button:has-text("Products & Supplies")').first().click({ timeout: 10000 });
await page.waitForTimeout(1200);

// Create a throwaway product via the real Add Product modal.
await page.locator('button:has-text("Add Item")').first().click({ timeout: 10000 });
await page.waitForTimeout(500);
await page.fill('input[placeholder="e.g. Botox Type A (100U)"]', 'ZZTEST_UIDeleteCheck');
await page.fill('input[placeholder="0.00"] >> nth=0', '1');
await page.click('button[type="submit"]:has-text("Create Product")');
await page.waitForTimeout(1500);

// Find its row and click delete.
const row = page.locator('tr', { hasText: 'ZZTEST_UIDeleteCheck' }).first();
await row.locator('button[title="Delete Product"]').click({ timeout: 10000 });
await page.waitForTimeout(1500);

const stillVisible = await page.locator('tr', { hasText: 'ZZTEST_UIDeleteCheck' }).first().isVisible().catch(() => false);
console.log('Dialog messages seen:', dialogMessages);
console.log('Product row still visible after soft-delete via UI (should be false):', stillVisible);

await page.screenshot({ path: 'D:/Work/Revera/screenshots_2026-07-29/product-delete-after.png', fullPage: true });
await browser.close();
