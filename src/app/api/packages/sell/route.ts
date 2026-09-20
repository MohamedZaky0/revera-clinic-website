import { NextResponse } from 'next/server';
import { requireStaffAccess } from '@/lib/access';
import { buildInvoiceLine, buildInvoiceTotals, formatInvoiceNo } from '@/lib/ledger';
import { supabaseServer } from '@/lib/supabaseServer';
import { recordWalletMovement } from '@/lib/wallet';
import { recordTransaction } from '@/lib/transactionLedger';

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

export async function GET(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  return NextResponse.json({
    status: 'ok',
    feature: 'packages_sell_engine',
    supportedPaymentMethods: VALID_PAYMENT_METHODS,
  });
}

export async function POST(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const body = await req.json();
    const { customerId, packageId, branchId, paymentMethod: rawPaymentMethod, amountPaid, paidAmount } = body;
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

    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    let finalCustomerId: string | null = null;

    if (UUID_REGEX.test(customerId)) {
      finalCustomerId = customerId;
    } else {
      // It's a synthetic ID like "res-cust-01016302772" or phone number
      const digits = String(customerId).replace(/\D/g, "");
      if (digits) {
        const last9Digits = digits.length >= 9 ? digits.slice(-9) : digits;
        // Try finding existing customer by mobile or phone
        const { data: matchedCust } = await supabaseServer
          .from('customers')
          .select('id')
          .or(`mobile.ilike.%${last9Digits}%,phone.ilike.%${last9Digits}%`)
          .limit(1)
          .maybeSingle();

        if (matchedCust?.id) {
          finalCustomerId = matchedCust.id;
        } else {
          // Look in reservations for patient details to create the real customer record
          const { data: resv } = await supabaseServer
            .from('reservations')
            .select('name, phone, email')
            .or(`phone.ilike.%${last9Digits}%`)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          const { data: newCust, error: createCustErr } = await supabaseServer
            .from('customers')
            .insert({
              name: resv?.name || 'Patient',
              mobile: digits,
              phone: digits,
              email: resv?.email || null,
            })
            .select('id')
            .single();

          if (createCustErr) {
            console.error('Failed to auto-create customer in package sale:', createCustErr);
          } else if (newCust?.id) {
            finalCustomerId = newCust.id;
          }
        }
      }
    }

    if (!finalCustomerId) {
      return NextResponse.json({ error: 'Customer not found or invalid customer ID.' }, { status: 404 });
    }

    const [customerResult, packageResult, packageItemsResult] = await Promise.all([
      supabaseServer.from('customers').select('id, spent_amount, wallet_balance').eq('id', finalCustomerId).maybeSingle(),
      supabaseServer
        .from('packages')
        .select('id, name, branch_id, price, tax_rate, validity_days, active, package_type, total_pulses')
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
    
    let pkgData: any = packageResult.data;
    if (packageResult.error && (packageResult.error.message?.includes('column') || packageResult.error.code === '42703')) {
      const fallbackPkgRes = await supabaseServer
        .from('packages')
        .select('id, name, branch_id, price, tax_rate, validity_days, active')
        .eq('id', packageId)
        .maybeSingle();
      if (fallbackPkgRes.error) throw fallbackPkgRes.error;
      pkgData = fallbackPkgRes.data;
    } else if (packageResult.error) {
      throw packageResult.error;
    }

    const pkg = pkgData as (PackageRecord & { package_type?: string; total_pulses?: number }) | null;
    if (!pkg || !pkg.active) {
      return NextResponse.json({ error: 'Active package not found.' }, { status: 404 });
    }
    if (packageItemsResult.error) throw packageItemsResult.error;

    const packageItems = (packageItemsResult.data || []) as PackageItemRecord[];

    // Read packages_meta from page_settings for schema-resilient package attributes
    let pkgMetaStore: Record<string, { packageType?: string; totalPulses?: number }> = {};
    try {
      const { data: psData } = await supabaseServer
        .from('page_settings')
        .select('value')
        .eq('key', 'packages_meta')
        .maybeSingle();
      if (psData?.value && typeof psData.value === 'object') {
        pkgMetaStore = psData.value;
      }
    } catch (e) {
      console.warn('Error reading packages_meta:', e);
    }

    const pkgMeta = pkgMetaStore[packageId];
    const extractedPulsesFromName = (() => {
      const nameStr = String(pkg.name || '');
      const kMatch = nameStr.match(/(\d+)\s*k\b/i);
      if (kMatch) return Number(kMatch[1]) * 1000;
      const numMatch = nameStr.match(/(\d+(?:,\d+)?)\s*(?:pulses|pulse|shots|shot|نبضة|نبضات|طلقة|طلقات)/i);
      if (numMatch) return Number(numMatch[1].replace(/,/g, ''));
      const genericMatch = nameStr.match(/(\d+(?:,\d+)?)/);
      if (genericMatch && (nameStr.toLowerCase().includes('pulse') || nameStr.toLowerCase().includes('laser') || nameStr.includes('نبض') || nameStr.includes('ليزر'))) {
        return Number(genericMatch[1].replace(/,/g, ''));
      }
      return 0;
    })();

    const isPulsesPkg = Boolean(
      pkg.package_type === 'pulses' ||
      pkgMeta?.packageType === 'pulses' ||
      Number(pkg.total_pulses || 0) > 0 ||
      Number(pkgMeta?.totalPulses || 0) > 0 ||
      packageItems.length === 0 ||
      extractedPulsesFromName > 0 ||
      pkg.name?.toLowerCase().includes('pulse') ||
      pkg.name?.toLowerCase().includes('laser') ||
      pkg.name?.toLowerCase().includes('shot') ||
      pkg.name?.includes('نبضة') ||
      pkg.name?.includes('نبضات') ||
      pkg.name?.includes('ليزر')
    );

    if (!isPulsesPkg && (packageItems.length === 0 || packageItems.some((item) => !Number.isInteger(item.qty) || item.qty <= 0))) {
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
    const isPartialSpecified = (amountPaid !== undefined || paidAmount !== undefined);
    const actualPaid = isPartialSpecified
      ? Math.min(totals.grandTotal, Math.max(0, Number(amountPaid !== undefined ? amountPaid : paidAmount)))
      : totals.grandTotal;
    const remainingDue = Math.max(0, totals.grandTotal - actualPaid);
    const invoiceStatus = actualPaid >= totals.grandTotal ? 'paid' : (actualPaid > 0 ? 'partially_paid' : 'issued');

    // Wallet guard: check balance before proceeding, refuse with 409 if short
    if (paymentMethod === 'wallet') {
      const { data: walletRow, error: walletReadErr } = await supabaseServer
        .from('customers')
        .select('wallet_balance')
        .eq('id', finalCustomerId)
        .maybeSingle();
      if (walletReadErr) throw walletReadErr;
      const available = Number(walletRow?.wallet_balance || 0);
      const requiredWallet = actualPaid > 0 ? actualPaid : totals.grandTotal;
      if (available < requiredWallet) {
        return NextResponse.json(
          { error: `Insufficient wallet balance — EGP ${available} available, EGP ${requiredWallet} required.` },
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
        customer_id: finalCustomerId,
        branch_id: branchId || pkg.branch_id,
        subtotal: totals.subtotal,
        discount_total: totals.discountTotal,
        grand_total: totals.grandTotal,
        status: invoiceStatus,
      })
      .select('id, invoice_no, subtotal, discount_total, grand_total, branch_id, status')
      .single();
    if (invoiceError) throw invoiceError;

    const { error: invoiceLineError } = await supabaseServer
      .from('invoice_lines')
      .insert({ ...line, invoice_id: invoice.id });
    if (invoiceLineError) {
      await removeIncompleteSale(invoice.id);
      throw invoiceLineError;
    }

    const totalPulsesVal = isPulsesPkg
      ? (Number(pkg.total_pulses || 0) || Number(pkgMeta?.totalPulses || 0) || extractedPulsesFromName || 1000)
      : 0;
    const cpInsertPayload: any = {
      customer_id: finalCustomerId,
      package_id: pkg.id,
      invoice_id: invoice.id,
      expires_at: expiresAt.toISOString(),
      price_paid: totals.grandTotal,
      status: 'active',
      package_type: isPulsesPkg ? 'pulses' : 'services',
      total_pulses: isPulsesPkg ? totalPulsesVal : 0,
      pulses_remaining: isPulsesPkg ? totalPulsesVal : 0,
      pulses_used: 0,
    };

    let { data: customerPackage, error: customerPackageError } = await supabaseServer
      .from('customer_packages')
      .insert(cpInsertPayload)
      .select('id, customer_id, package_id, invoice_id, purchased_at, expires_at, price_paid, status')
      .single();

    if (customerPackageError && (customerPackageError.message?.includes('column') || customerPackageError.code === '42703')) {
      const fallbackCpPayload = {
        customer_id: finalCustomerId,
        package_id: pkg.id,
        invoice_id: invoice.id,
        expires_at: expiresAt.toISOString(),
        price_paid: totals.grandTotal,
        status: 'active',
      };
      const fbCpRes = await supabaseServer.from('customer_packages').insert(fallbackCpPayload).select('id, customer_id, package_id, invoice_id, purchased_at, expires_at, price_paid, status').single();
      if (fbCpRes.error) {
        await removeIncompleteSale(invoice.id);
        throw fbCpRes.error;
      }
      customerPackage = fbCpRes.data;
    } else if (customerPackageError) {
      await removeIncompleteSale(invoice.id);
      throw customerPackageError;
    }

    // Persist pulses to page_settings pulse store for full ecosystem compatibility
    if (isPulsesPkg && totalPulsesVal > 0 && customerPackage?.id) {
      try {
        const { data: psData } = await supabaseServer
          .from('page_settings')
          .select('value')
          .eq('key', 'customer_package_pulses')
          .maybeSingle();
        const store = psData?.value && typeof psData.value === 'object' ? psData.value : {};
        store[customerPackage.id] = {
          included_pulses: totalPulsesVal,
          used_pulses: 0,
          remaining_pulses: totalPulsesVal,
          usage_history: []
        };
        await supabaseServer.from('page_settings').upsert({
          key: 'customer_package_pulses',
          value: store,
          updated_at: new Date().toISOString()
        });
      } catch (pulseErr) {
        console.warn('Error saving customer package pulses in store:', pulseErr);
      }
    }

    if (packageItems.length > 0) {
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
    }

    if (actualPaid > 0) {
      const { error: paymentError } = await supabaseServer
        .from('payments')
        .insert({
          invoice_id: invoice.id,
          amount: actualPaid,
          method: paymentMethod,
          received_by_employee_id: access.access.employee.id,
        });
      if (paymentError) {
        await removeIncompleteSale(invoice.id, customerPackage.id);
        throw paymentError;
      }

      // Customer-facing history (RISK-076).
      await recordTransaction({
        type: 'payment',
        amount: actualPaid,
        description: `Package purchase — ${pkg.name}${remainingDue > 0 ? ` (Deposit paid: ${actualPaid} EGP, Remaining: ${remainingDue} EGP)` : ''}`,
        customerId: finalCustomerId,
        branchId: branchId || null,
        invoiceId: invoice.id,
        paymentMethod,
        createdByEmployeeId: access.access.employee.id,
      });
    }

    // Update spent_amount and outstanding on the customer
    try {
      const { data: customer, error: readErr } = await supabaseServer
        .from('customers')
        .select('spent_amount, wallet_balance, outstanding')
        .eq('id', finalCustomerId)
        .maybeSingle();

      if (!readErr && customer) {
        const updatePayload: any = {
          spent_amount: Number(customer.spent_amount || 0) + actualPaid,
          updated_at: new Date().toISOString()
        };
        if (remainingDue > 0 && customer.outstanding !== undefined) {
          updatePayload.outstanding = Number(customer.outstanding || 0) + remainingDue;
        }

        await supabaseServer
          .from('customers')
          .update(updatePayload)
          .eq('id', finalCustomerId);

        // Deduct wallet if paying from wallet
        if (paymentMethod === 'wallet' && actualPaid > 0) {
          const newBalance = Math.max(0, Number(customer.wallet_balance || 0) - actualPaid);
          await recordWalletMovement({
            customerId: finalCustomerId,
            direction: 'out',
            amount: actualPaid,
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
