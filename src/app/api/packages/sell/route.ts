import { NextResponse } from 'next/server';
import { requireStaffAccess } from '@/lib/access';
import { buildInvoiceLine, buildInvoiceTotals, formatInvoiceNo } from '@/lib/ledger';
import { supabaseServer } from '@/lib/supabaseServer';
import { recordWalletMovement } from '@/lib/wallet';

const VALID_PAYMENT_METHODS = ['cash', 'card', 'wallet', 'instapay', 'transfer'] as const;
type PaymentMethod = typeof VALID_PAYMENT_METHODS[number];

export const dynamic = 'force-dynamic';

type PackageRecord = {
  id: string;
  name: string;
  branch_id: string | null;
  price: number | string;
  tax_rate: number | string;
  validity_days: number;
  active: boolean;
};

type PackageItemRecord = {
  service_id: number;
  qty: number;
};

async function removeIncompleteSale(invoiceId: string, customerPackageId?: string) {
  if (customerPackageId) {
    const { error } = await supabaseServer
      .from('customer_packages')
      .delete()
      .eq('id', customerPackageId);
    if (error) console.error('Failed to remove incomplete customer package:', error);
  }

  const { error } = await supabaseServer
    .from('invoices')
    .delete()
    .eq('id', invoiceId);
  if (error) console.error('Failed to remove incomplete package invoice:', error);
}

export async function POST(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const { customerId, packageId, branchId, paymentMethod: rawPaymentMethod } = await req.json();
    if (!customerId || !packageId) {
      return NextResponse.json(
        { error: 'customerId and packageId are required.' },
        { status: 400 }
      );
    }

    const paymentMethod: PaymentMethod | null = rawPaymentMethod
      ? (VALID_PAYMENT_METHODS.includes(rawPaymentMethod) ? rawPaymentMethod : null)
      : 'cash';
    if (!paymentMethod) {
      return NextResponse.json(
        { error: `Invalid paymentMethod. Must be one of: ${VALID_PAYMENT_METHODS.join(', ')}` },
        { status: 400 }
      );
    }

    const [customerResult, packageResult, packageItemsResult] = await Promise.all([
      supabaseServer.from('customers').select('id').eq('id', customerId).maybeSingle(),
      supabaseServer
        .from('packages')
        .select('id, name, branch_id, price, tax_rate, validity_days, active')
        .eq('id', packageId)
        .maybeSingle(),
      supabaseServer
        .from('package_items')
        .select('service_id, qty')
        .eq('package_id', packageId),
    ]);

    if (customerResult.error) throw customerResult.error;
    if (!customerResult.data) {
      return NextResponse.json({ error: 'Customer not found.' }, { status: 404 });
    }
    if (packageResult.error) throw packageResult.error;

    const pkg = packageResult.data as PackageRecord | null;
    if (!pkg || !pkg.active) {
      return NextResponse.json({ error: 'Active package not found.' }, { status: 404 });
    }
    if (packageItemsResult.error) throw packageItemsResult.error;

    const packageItems = (packageItemsResult.data || []) as PackageItemRecord[];
    if (packageItems.length === 0 || packageItems.some((item) => !Number.isInteger(item.qty) || item.qty <= 0)) {
      return NextResponse.json({ error: 'Package must contain at least one service with a positive quantity.' }, { status: 400 });
    }

    if (branchId && pkg.branch_id && branchId !== pkg.branch_id) {
      return NextResponse.json({ error: 'Package is not available at the requested branch.' }, { status: 400 });
    }

    const price = Number(pkg.price);
    const taxRate = Number(pkg.tax_rate);
    const validityDays = Number(pkg.validity_days);
    if (!Number.isFinite(price) || price < 0 || !Number.isFinite(taxRate) || taxRate < 0 || !Number.isInteger(validityDays) || validityDays < 0) {
      return NextResponse.json({ error: 'Package configuration is invalid.' }, { status: 400 });
    }

    const line = buildInvoiceLine({
      lineType: 'package',
      description: pkg.name,
      qty: 1,
      unitPrice: price,
      taxRate,
      packageId: pkg.id,
    });
    const totals = buildInvoiceTotals([line]);

    // Wallet guard: check balance before proceeding, refuse with 409 if short
    if (paymentMethod === 'wallet') {
      const { data: walletRow, error: walletReadErr } = await supabaseServer
        .from('customers')
        .select('wallet_balance')
        .eq('id', customerId)
        .maybeSingle();
      if (walletReadErr) throw walletReadErr;
      const available = Number(walletRow?.wallet_balance || 0);
      if (available < totals.grandTotal) {
        return NextResponse.json(
          { error: `Insufficient wallet balance — EGP ${available} available, EGP ${totals.grandTotal} required.` },
          { status: 409 }
        );
      }
    }
    const expiresAt = new Date();
    expiresAt.setUTCDate(expiresAt.getUTCDate() + validityDays);

    const { data: sequenceValue, error: sequenceError } = await supabaseServer.rpc('next_invoice_no');
    if (sequenceError) throw sequenceError;

    const { data: invoice, error: invoiceError } = await supabaseServer
      .from('invoices')
      .insert({
        invoice_no: formatInvoiceNo(Number(sequenceValue)),
        customer_id: customerId,
        branch_id: branchId || pkg.branch_id,
        subtotal: totals.subtotal,
        discount_total: totals.discountTotal,
        grand_total: totals.grandTotal,
        status: 'issued',
      })
      .select('id, invoice_no, subtotal, discount_total, grand_total, branch_id')
      .single();
    if (invoiceError) throw invoiceError;

    const { error: invoiceLineError } = await supabaseServer
      .from('invoice_lines')
      .insert({ ...line, invoice_id: invoice.id });
    if (invoiceLineError) {
      await removeIncompleteSale(invoice.id);
      throw invoiceLineError;
    }

    const { data: customerPackage, error: customerPackageError } = await supabaseServer
      .from('customer_packages')
      .insert({
        customer_id: customerId,
        package_id: pkg.id,
        invoice_id: invoice.id,
        expires_at: expiresAt.toISOString(),
        price_paid: totals.grandTotal,
        status: 'active',
      })
      .select('id, customer_id, package_id, invoice_id, purchased_at, expires_at, price_paid, status')
      .single();
    if (customerPackageError) {
      await removeIncompleteSale(invoice.id);
      throw customerPackageError;
    }

    const { error: customerPackageItemsError } = await supabaseServer
      .from('customer_package_items')
      .insert(
        packageItems.map((item) => ({
          customer_package_id: customerPackage.id,
          service_id: item.service_id,
          qty_total: item.qty,
          qty_used: 0,
          qty_remaining: item.qty,
        }))
      );
    if (customerPackageItemsError) {
      await removeIncompleteSale(invoice.id, customerPackage.id);
      throw customerPackageItemsError;
    }

    const { error: paymentError } = await supabaseServer
      .from('payments')
      .insert({
        invoice_id: invoice.id,
        amount: totals.grandTotal,
        method: paymentMethod,
        received_by_employee_id: access.access.employee.id,
      });
    if (paymentError) {
      await removeIncompleteSale(invoice.id, customerPackage.id);
      throw paymentError;
    }

    // Update spent_amount on the customer (read-then-write, same shape as addToCustomerSpend)
    try {
      const { data: customer, error: readErr } = await supabaseServer
        .from('customers')
        .select('spent_amount, wallet_balance')
        .eq('id', customerId)
        .maybeSingle();

      if (!readErr && customer) {
        await supabaseServer
          .from('customers')
          .update({
            spent_amount: Number(customer.spent_amount || 0) + totals.grandTotal,
            updated_at: new Date().toISOString()
          })
          .eq('id', customerId);

        // Deduct wallet if paying from wallet
        if (paymentMethod === 'wallet') {
          const newBalance = Math.max(0, Number(customer.wallet_balance || 0) - totals.grandTotal);
          await recordWalletMovement({
            customerId,
            direction: 'out',
            amount: totals.grandTotal,
            reason: 'package sale payment',
            newBalance,
            invoiceId: invoice.id,
          });
        }
      }
    } catch (spendErr) {
      console.error('Failed to update customer spent_amount after package sale:', spendErr);
    }

    return NextResponse.json({
      invoice,
      customerPackage,
      packageItems: packageItems.map((item) => ({
        serviceId: item.service_id,
        qtyTotal: item.qty,
        qtyUsed: 0,
        qtyRemaining: item.qty,
      })),
    }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/packages/sell error:', error);
    return NextResponse.json({ error: error.message || 'Unable to sell package.' }, { status: 500 });
  }
}
