import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { deductInventoryStock } from '@/app/api/inventory/products/route';
import { requireStaffAccess } from '@/lib/access';
import { buildInvoiceLine, buildInvoiceTotals, formatInvoiceNo } from '@/lib/ledger';

export const dynamic = 'force-dynamic';

/**
 * API contract. The admin UI reads `total_amount`, `product_sku` and
 * `customer_mobile` directly (src/app/admin/page.tsx:11664, 18038, 18046), so
 * these names must not change.
 *
 * The `product_sales` table uses DIFFERENT column names — `total_price`, `sku`,
 * `customer_phone`, `cashier_name`. Sending the API names straight to Supabase
 * is what caused every POS insert to fail and silently fall through to the
 * `page_settings` JSON blob (RISK-014). Translate at the DB boundary only, via
 * mapSaleToDbRow / mapDbRowToSale below.
 */
export interface ProductSaleRecord {
  id: string;
  product_id: string;
  product_name: string;
  product_sku?: string;
  customer_id: string;
  customer_name: string;
  customer_mobile: string;
  customer_email?: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  branch_name?: string;
  created_at: string;
  sold_by?: string;
  payment_method?: string;
  notes?: string;
}

/** Actual column names on public.product_sales — verified against the live DB 2026-07-25. */
interface ProductSaleDbRow {
  id: string;
  product_id: string | null;
  product_name: string;
  sku: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  customer_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  cashier_name: string | null;
  branch_name: string | null;
  payment_method: string | null;
  notes: string | null;
  sale_date: string;
  created_at: string;
}

function mapSaleToDbRow(sale: ProductSaleRecord): ProductSaleDbRow {
  return {
    id: sale.id,
    product_id: sale.product_id || null,
    product_name: sale.product_name,
    sku: sale.product_sku || null,
    quantity: sale.quantity,
    unit_price: sale.unit_price,
    total_price: sale.total_amount,
    customer_id: sale.customer_id || null,
    customer_name: sale.customer_name || null,
    customer_phone: sale.customer_mobile || null,
    customer_email: sale.customer_email || null,
    cashier_name: sale.sold_by || null,
    branch_name: sale.branch_name || null,
    payment_method: sale.payment_method || 'Cash',
    notes: sale.notes || null,
    sale_date: sale.created_at,
    created_at: sale.created_at
  };
}

function mapDbRowToSale(row: ProductSaleDbRow): ProductSaleRecord {
  return {
    id: row.id,
    product_id: row.product_id || '',
    product_name: row.product_name,
    product_sku: row.sku || '',
    customer_id: row.customer_id || '',
    customer_name: row.customer_name || '',
    customer_mobile: row.customer_phone || '',
    customer_email: row.customer_email || '',
    quantity: Number(row.quantity || 0),
    unit_price: Number(row.unit_price || 0),
    total_amount: Number(row.total_price || 0),
    branch_name: row.branch_name || '',
    created_at: row.created_at || row.sale_date,
    sold_by: row.cashier_name || '',
    payment_method: row.payment_method || 'Cash',
    notes: row.notes || ''
  };
}

/** `id` is a text primary key with no database default, so it must be supplied. */
function generateSaleId(): string {
  return `sale-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
}

/**
 * Roll a retail sale into the patient's lifetime spend.
 *
 * This used to be done from the browser with the anon key
 * (src/app/admin/page.tsx, `supabase.from("customers").update(...)`), which read a
 * possibly-stale spent_amount out of React state. It moved here because enabling RLS
 * on `customers` would have made that browser write silently affect zero rows while
 * still reporting success.
 *
 * Still a read-modify-write, so concurrent sales to the same patient can lose an
 * update. PROPOSAL-002 Phase 1 removes the problem properly by deriving spent_amount
 * from the invoice ledger rather than storing a running scalar (RISK-016).
 */
async function addToCustomerSpend(customerId: string, amount: number) {
  if (!customerId || !amount) return;
  try {
    const { data: customer, error: readErr } = await supabaseServer
      .from('customers')
      .select('spent_amount')
      .eq('id', customerId)
      .maybeSingle();

    if (readErr || !customer) {
      console.error('Could not read customer for spend update:', customerId, readErr?.message);
      return;
    }

    const { error: writeErr } = await supabaseServer
      .from('customers')
      .update({
        spent_amount: Number(customer.spent_amount || 0) + Number(amount),
        updated_at: new Date().toISOString()
      })
      .eq('id', customerId);

    if (writeErr) {
      console.error('Failed to update customer spent_amount:', customerId, writeErr.message);
    }
  } catch (err) {
    console.error('Error updating customer spent_amount:', err);
  }
}

async function getStoredSalesData(): Promise<{ sales: ProductSaleRecord[] }> {
  try {
    // 1. Prefer the native product_sales table, but only trust it when it has rows.
    //    An empty array is truthy, so guarding on `dbSales` alone made the
    //    page_settings fallback below unreachable and sales history read back
    //    empty (RISK-014). Same pattern as the customer_product_balances fix in 8f280cc.
    const { data: dbSales, error: dbErr } = await supabaseServer
      .from('product_sales')
      .select('*')
      .order('created_at', { ascending: false });

    if (!dbErr && dbSales && dbSales.length > 0) {
      return { sales: (dbSales as ProductSaleDbRow[]).map(mapDbRowToSale) };
    }

    // 2. Fallback to page_settings. Rows here are already in API shape.
    const { data, error } = await supabaseServer
      .from('page_settings')
      .select('value')
      .eq('key', 'product_sales_history')
      .maybeSingle();

    if (error || !data || !data.value) {
      const payload = { sales: [] };
      await supabaseServer
        .from('page_settings')
        .upsert({ key: 'product_sales_history', value: payload, updated_at: new Date().toISOString() });
      return payload;
    }
    return data.value;
  } catch (err) {
    console.error('Error fetching product sales history:', err);
    return { sales: [] };
  }
}

async function saveSalesData(payload: { sales: ProductSaleRecord[] }) {
  await supabaseServer
    .from('page_settings')
    .upsert({
      key: 'product_sales_history',
      value: payload,
      updated_at: new Date().toISOString()
    });
}

function toPaymentMethod(method?: string): 'cash' | 'card' | 'wallet' | 'instapay' | 'transfer' {
  switch (method?.trim().toLowerCase()) {
    case 'card':
    case 'credit card':
    case 'debit card':
      return 'card';
    case 'wallet':
      return 'wallet';
    case 'instapay':
      return 'instapay';
    case 'transfer':
    case 'bank transfer':
      return 'transfer';
    default:
      return 'cash';
  }
}

async function resolveBranchId(branchName?: string): Promise<string | null> {
  const normalizedName = branchName?.trim();
  if (!normalizedName) return null;

  const { data: englishMatch, error: englishError } = await supabaseServer
    .from('branches')
    .select('id')
    .eq('name_en', normalizedName)
    .maybeSingle();
  if (englishError) throw englishError;
  if (englishMatch) return englishMatch.id;

  const { data: arabicMatch, error: arabicError } = await supabaseServer
    .from('branches')
    .select('id')
    .eq('name_ar', normalizedName)
    .maybeSingle();
  if (arabicError) throw arabicError;
  return arabicMatch?.id ?? null;
}

async function writePosSaleStockMovement(sale: ProductSaleRecord): Promise<void> {
  const { data: product, error: productError } = await supabaseServer
    .from('inventory_products')
    .select('cost_price')
    .eq('id', sale.product_id)
    .maybeSingle();
  if (productError) throw productError;

  const { error } = await supabaseServer.from('stock_movements').insert({
    product_id: sale.product_id,
    direction: 'out',
    qty: sale.quantity,
    unit_cost: Number(product?.cost_price || 0),
    reason: 'sale',
    ref_id: sale.id,
  });
  if (error) throw error;
}

async function writePosSaleInvoice(sale: ProductSaleRecord, receivedByEmployeeId: string | null): Promise<void> {
  const line = buildInvoiceLine({
    lineType: 'product',
    description: sale.product_name,
    qty: sale.quantity,
    unitPrice: sale.unit_price,
    productId: sale.product_id,
  });
  const totals = buildInvoiceTotals([line]);
  const branchId = await resolveBranchId(sale.branch_name);

  const { data: seqValue, error: seqError } = await supabaseServer.rpc('next_invoice_no');
  if (seqError) throw seqError;

  const { data: invoice, error: invoiceError } = await supabaseServer
    .from('invoices')
    .insert({
      invoice_no: formatInvoiceNo(Number(seqValue)),
      customer_id: sale.customer_id,
      branch_id: branchId,
      subtotal: totals.subtotal,
      discount_total: totals.discountTotal,
      grand_total: totals.grandTotal,
      status: 'issued',
    })
    .select('id')
    .single();
  if (invoiceError) throw invoiceError;

  const { error: lineError } = await supabaseServer
    .from('invoice_lines')
    .insert({ ...line, invoice_id: invoice.id });
  if (lineError) throw lineError;

  if (sale.total_amount > 0) {
    const { error: paymentError } = await supabaseServer
      .from('payments')
      .insert({
        invoice_id: invoice.id,
        amount: sale.total_amount,
        method: toPaymentMethod(sale.payment_method),
        received_by_employee_id: receivedByEmployeeId,
      });
    if (paymentError) throw paymentError;
  }
}

export async function GET(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const data = await getStoredSalesData();
    return NextResponse.json({ success: true, sales: data.sales || [] });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  // POS sales are entered by staff only — no patient-facing caller exists for this route.
  const access = await requireStaffAccess(req);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const body = await req.json();
    const {
      product_id,
      product_name,
      product_sku,
      customer_id,
      customer_name,
      customer_mobile,
      customer_email,
      quantity,
      unit_price,
      total_amount,
      branch_name,
      sold_by,
      payment_method,
      notes
    } = body;

    if (!product_id || !customer_id || !quantity || quantity <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid sale parameters: product_id, customer_id, and positive quantity are required.' },
        { status: 400 }
      );
    }

    // Verify the customer actually exists before touching stock or writing anything. Without
    // this, a mistyped/stale customer_id violates product_sales.customer_id's FK constraint,
    // which made the native insert fail and fall through to the page_settings blob — the exact
    // RISK-014 failure mode, just triggered by a different input. Once the native table has any
    // rows, getStoredSalesData() trusts it exclusively and never merges the blob back in, so that
    // sale becomes permanently invisible in sales history — while deductInventoryStock still runs
    // unconditionally below, so stock is genuinely lost with no discoverable record. Found and
    // fixed 2026-07-26 while manually verifying task 1.11 — see FINANCE_PHASE_1_MANUAL_TESTS.md.
    const { data: customerExists, error: customerCheckErr } = await supabaseServer
      .from('customers')
      .select('id')
      .eq('id', customer_id)
      .maybeSingle();
    if (customerCheckErr) throw customerCheckErr;
    if (!customerExists) {
      return NextResponse.json(
        { success: false, error: `Customer '${customer_id}' does not exist.` },
        { status: 404 }
      );
    }

    // Re-check current stock server-side rather than trusting the browser's cached figure.
    // The admin UI already blocks selling more than its own (possibly stale) copy of
    // stock_quantity shows, but until now nothing stopped it here — deductInventoryStock just
    // clamps at 0, so a bypassed/raced client check would silently oversell: the sale would
    // record full revenue against a quantity the clinic never actually had in stock.
    const { data: productForStockCheck, error: stockCheckErr } = await supabaseServer
      .from('inventory_products')
      .select('stock_quantity, role, deleted_at')
      .eq('id', product_id)
      .maybeSingle();
    if (stockCheckErr) throw stockCheckErr;
    // DEC-038: a soft-deleted product is gone from the catalog everywhere else — selling it here
    // would keep generating real product_sales/invoice_lines revenue against something the clinic
    // marked as deleted, which is exactly the Finance-integrity gap soft delete exists to close.
    if (productForStockCheck && (productForStockCheck as any).deleted_at) {
      return NextResponse.json(
        { success: false, error: 'This product has been deleted and can no longer be sold.' },
        { status: 410 }
      );
    }
    if (productForStockCheck && (productForStockCheck as any).role === 'consumable') {
      return NextResponse.json(
        {
          success: false,
          error: 'Consumable products are reserved for clinic service usage and cannot be sold to patients.'
        },
        { status: 400 }
      );
    }
    if (productForStockCheck && Number(productForStockCheck.stock_quantity || 0) < Number(quantity)) {
      return NextResponse.json(
        {
          success: false,
          error: `Only ${productForStockCheck.stock_quantity} unit(s) in stock — cannot sell ${quantity}.`
        },
        { status: 409 }
      );
    }

    const newSale: ProductSaleRecord = {
      id: generateSaleId(),
      product_id,
      product_name: product_name || 'Product',
      product_sku: product_sku || '',
      customer_id,
      customer_name: customer_name || 'Customer',
      customer_mobile: customer_mobile || '',
      customer_email: customer_email || '',
      quantity: Number(quantity),
      unit_price: Number(unit_price || 0),
      total_amount: Number(total_amount || 0),
      branch_name: branch_name || '',
      sold_by: sold_by || 'Admin/Receptionist',
      payment_method: payment_method || 'Cash',
      notes: notes || '',
      created_at: new Date().toISOString()
    };

    // Try the native product_sales table first.
    const { data: insertedDb, error: dbInsertErr } = await supabaseServer
      .from('product_sales')
      .insert(mapSaleToDbRow(newSale))
      .select()
      .single();

    await deductInventoryStock(product_id || product_name, Number(quantity));
    await addToCustomerSpend(customer_id, newSale.total_amount);

    if (!dbInsertErr && insertedDb) {
      try {
        await Promise.all([
          writePosSaleInvoice(newSale, access.access.employee.id),
          writePosSaleStockMovement(newSale),
        ]);
      } catch (ledgerError) {
        console.error('Failed to write POS finance dual-write:', ledgerError);
      }

      const allSales = await getStoredSalesData();
      return NextResponse.json({
        success: true,
        sale: mapDbRowToSale(insertedDb as ProductSaleDbRow),
        sales: allSales.sales
      });
    }

    // Surface the reason rather than failing over silently — a schema mismatch
    // here previously looked like success while sales went to a JSON blob.
    if (dbInsertErr) {
      console.error('product_sales insert failed, falling back to page_settings:', dbInsertErr.message);
    }

    const currentData = await getStoredSalesData();
    const updatedSales = [newSale, ...(currentData.sales || [])];
    await saveSalesData({ sales: updatedSales });

    return NextResponse.json({ success: true, sale: newSale, sales: updatedSales });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
