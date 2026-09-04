import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:3000';
const EMAIL = 'saif@superadmin.com';
const PASSWORD = process.env.SUPERADMIN_PASSWORD ?? '';
const PRODUCT_ID = process.argv[2]; // e.g. prod-fktest-1785421460400
const BASELINE_REAL_PRODUCTS = ['Hamada Botox', 'Hamada', 'k'];

if (!PASSWORD || !PRODUCT_ID) {
  console.error('Usage: SUPERADMIN_PASSWORD=... node ui_check_product_delete_error.mjs <product-id>');
  process.exit(1);
}

const browser = await chromium.launch();
const page = await browser.newPage();
let nativeDialogFired = false;
page.on('dialog', async (dialog) => {
  nativeDialogFired = true;
  console.log('NATIVE dialog fired (should never happen):', dialog.message());
  await dialog.dismiss();
});

async function assertBaselineIntact(label) {
  const rows = await page.locator('tbody tr').allTextContents();
  const missing = BASELINE_REAL_PRODUCTS.filter((name) => !rows.some((r) => r.includes(name)));
  if (missing.length > 0) throw new Error(`SAFETY CHECK FAILED at "${label}": missing ${missing.join(', ')}`);
  console.log(`Safety check passed at "${label}" (${rows.length} rows).`);
}

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

await assertBaselineIntact('start');

const hardBtn = page.locator(`[data-testid="hard-delete-product-${PRODUCT_ID}"]`);
const modal = page.locator('[data-testid="product-delete-modal"]');
const modalConfirm = page.locator('[data-testid="product-delete-modal-confirm"]');
const modalCancel = page.locator('[data-testid="product-delete-modal-cancel"]');

console.log('Hard-delete button visible for FK-test product:', await hardBtn.isVisible().catch(() => false));
await hardBtn.click();
await page.waitForTimeout(400);
await modalConfirm.click();
await page.waitForTimeout(1500);

const errorVisible = await page.locator('text=Cannot permanently delete this product').first().isVisible().catch(() => false);
console.log('Inline error banner visible inside modal (should be true):', errorVisible);
const modalStillOpen = await modal.isVisible().catch(() => false);
console.log('Modal still open after failed delete (should be true):', modalStillOpen);
await page.screenshot({ path: 'D:/Work/Revera/screenshots_2026-07-29/product-delete-error-inline.png' });

await modalCancel.click();
await page.waitForTimeout(400);
await assertBaselineIntact('after cancelling error modal');

console.log('Any native window dialog fired (should be false):', nativeDialogFired);
await browser.close();
