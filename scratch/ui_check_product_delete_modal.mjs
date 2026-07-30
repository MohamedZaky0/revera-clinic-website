import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:3000';
const EMAIL = 'saif@superadmin.com';
const PASSWORD = process.env.SUPERADMIN_PASSWORD ?? '';
const BASELINE_REAL_PRODUCTS = ['Hamada Botox', 'Hamada', 'k']; // must never be touched by this script

if (!PASSWORD) {
  console.error('Set SUPERADMIN_PASSWORD env var to run this check.');
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
page.on('console', (msg) => { if (msg.type() === 'error' && !msg.text().includes('401')) console.log('CONSOLE ERROR:', msg.text()); });

async function assertBaselineIntact(label) {
  const rows = await page.locator('tbody tr').allTextContents();
  const missing = BASELINE_REAL_PRODUCTS.filter((name) => !rows.some((r) => r.includes(name)));
  if (missing.length > 0) {
    throw new Error(`SAFETY CHECK FAILED at "${label}": missing real products from catalog: ${missing.join(', ')}`);
  }
  console.log(`Safety check passed at "${label}": all baseline real products present (${rows.length} total rows).`);
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

await assertBaselineIntact('before creating test product');

// Create a throwaway product via the real Add Product modal.
await page.locator('button:has-text("Add Item")').first().click({ timeout: 10000 });
await page.waitForTimeout(500);
await page.fill('input[placeholder="e.g. Botox Type A (100U)"]', 'ZZTEST_ModalDeleteCheck2');
await page.fill('input[placeholder="0.00"] >> nth=0', '1');
await page.click('button[type="submit"]:has-text("Create Product")');
await page.waitForTimeout(1500);

await assertBaselineIntact('after creating test product');

// Scope strictly to THIS product's own row via a stable data-testid, never by page-wide text.
const row = page.locator('tr', { has: page.locator('td', { hasText: 'ZZTEST_ModalDeleteCheck2' }) }).first();
const rowId = await row.locator('button[data-testid^="soft-delete-product-"]').getAttribute('data-testid');
const productId = rowId.replace('soft-delete-product-', '');
console.log('Created test product id:', productId);

const softBtn = page.locator(`[data-testid="soft-delete-product-${productId}"]`);
const hardBtn = page.locator(`[data-testid="hard-delete-product-${productId}"]`);
const modal = page.locator('[data-testid="product-delete-modal"]');
const modalCancel = page.locator('[data-testid="product-delete-modal-cancel"]');
const modalConfirm = page.locator('[data-testid="product-delete-modal-confirm"]');

console.log('Soft-delete button visible:', await softBtn.isVisible());
console.log('Hard-delete button visible:', await hardBtn.isVisible());

// Open soft-delete modal, verify content, cancel.
await softBtn.click();
await page.waitForTimeout(400);
console.log('Soft-delete modal appeared:', await modal.isVisible());
console.log('Soft-delete modal text:', (await modal.innerText()).split('\n')[0]);
await modalCancel.click();
await page.waitForTimeout(400);
await assertBaselineIntact('after cancelling soft-delete modal');

// Open hard-delete modal, verify content, cancel.
await hardBtn.click();
await page.waitForTimeout(400);
console.log('Hard-delete modal appeared:', await modal.isVisible());
console.log('Hard-delete modal text:', (await modal.innerText()).split('\n')[0]);
await modalCancel.click();
await page.waitForTimeout(400);
await assertBaselineIntact('after cancelling hard-delete modal');

// Now actually confirm the soft delete for real, via the modal button only.
await softBtn.click();
await page.waitForTimeout(400);
await modalConfirm.click();
await page.waitForTimeout(1500);

const stillVisible = await page.locator('td', { hasText: 'ZZTEST_ModalDeleteCheck2' }).first().isVisible().catch(() => false);
console.log('Test product row still visible after confirmed soft-delete (should be false):', stillVisible);
await assertBaselineIntact('after confirmed soft-delete of test product');

console.log('Any native window dialog fired at any point (should be false):', nativeDialogFired);

await browser.close();
