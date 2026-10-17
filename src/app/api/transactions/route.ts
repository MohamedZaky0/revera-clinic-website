import { NextResponse } from 'next/server';
import { requireStaffAccess, hasFinancePermission } from '@/lib/access';
import { supabaseServer } from '@/lib/supabaseServer';
import { formatInvoiceNo } from '@/lib/ledger';

export const dynamic = 'force-dynamic';

const VALID_TRANSACTION_TYPES = [
  'payment', 'outstanding_payment', 'refund', 'wallet_topup', 'wallet_deduction',
  'service_charge', 'product_purchase', 'adjustment',
];

function formatTxnId(seqVal: number): string {
  return `TXN-${String(seqVal).padStart(6, '0')}`;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

// Africa/Cairo's UTC offset (+02:00 winter / +03:00 DST) in effect at the given instant.
function cairoOffsetStr(at: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Africa/Cairo', timeZoneName: 'shortOffset' }).formatToParts(at);
  const tzPart = parts.find((p) => p.type === 'timeZoneName')?.value || 'GMT+3';
  const match = tzPart.match(/GMT([+-])(\d+)(?::(\d+))?/);
  let offsetMinutes = 180;
  if (match) {
    const sign = match[1] === '-' ? -1 : 1;
    offsetMinutes = sign * (parseInt(match[2], 10) * 60 + (match[3] ? parseInt(match[3], 10) : 0));
  }
  const pad = (n: number) => String(Math.abs(n)).padStart(2, '0');
  return `${offsetMinutes >= 0 ? '+' : '-'}${pad(Math.floor(Math.abs(offsetMinutes) / 60))}:${pad(Math.abs(offsetMinutes) % 60)}`;
}

// Start/end instants of a Cairo calendar day given as YYYY-MM-DD.
function cairoDayBounds(ymd: string): { start: string; end: string } {
  const offset = cairoOffsetStr(new Date(`${ymd}T12:00:00Z`));
  return {
    start: new Date(`${ymd}T00:00:00${offset}`).toISOString(),
    end: new Date(`${ymd}T23:59:59.999${offset}`).toISOString(),
  };
}

export async function GET(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  if (!hasFinancePermission(access.access, 'transactions.view')) {
    return NextResponse.json({ error: 'Transactions access is required.' }, { status: 403 });
  }

  const searchParams = new URL(req.url).searchParams;
  const search = (searchParams.get('search') || '').trim().toLowerCase();
  const dateRange = searchParams.get('dateRange') || 'all';
  const startDateParam = searchParams.get('startDate');
  const endDateParam = searchParams.get('endDate');
  const typeFilter = searchParams.get('type') || 'all';
  const paymentMethodFilter = searchParams.get('paymentMethod') || 'all';
  const statusFilter = searchParams.get('status') || 'all';
  const sourceFilter = searchParams.get('source') || 'all';
  const branchId = searchParams.get('branchId') || 'all';
  const amountRange = searchParams.get('amountRange') || 'all';
  const sortBy = searchParams.get('sortBy') || 'date';
  const sortOrder = searchParams.get('sortOrder') || 'desc';
  const customerId = searchParams.get('customerId');
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '10', 10)));

  // branchId is interpolated into a PostgREST .or() expression below, so anything but a UUID
  // (e.g. "x,branch_id.not.is.null") could widen the filter to other branches' rows.
  if (branchId !== 'all' && !UUID_RE.test(branchId)) {
    return NextResponse.json({ error: 'Invalid branchId.' }, { status: 400 });
  }
  if (dateRange === 'custom' && startDateParam && endDateParam
    && !(YMD_RE.test(startDateParam) && YMD_RE.test(endDateParam))) {
    return NextResponse.json({ error: 'startDate and endDate must be YYYY-MM-DD.' }, { status: 400 });
  }

  try {
    // 1. Fetch transactions with relations
    let query = supabaseServer
      .from('transactions')
      .select(`
        *,
        customer:customers(id, name, mobile, wallet_balance, outstanding, spent_amount),
        branch:branches(id, name_en, name_ar),
        invoice:invoices(id, invoice_no)
      `);

    if (customerId) {
      query = query.eq('customer_id', customerId);
    }

    if (branchId !== 'all' && branchId) {
      query = query.or(`branch_id.eq.${branchId},branch_id.is.null`);
    }

    if (typeFilter !== 'all') {
      query = query.eq('type', typeFilter);
    }

    if (paymentMethodFilter !== 'all') {
      query = query.eq('payment_method', paymentMethodFilter);
    }

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    if (sourceFilter !== 'all' && (sourceFilter === 'manual' || sourceFilter === 'automatic')) {
      query = query.eq('source', sourceFilter);
    }

    // Date range filter using Africa/Cairo local calendar dates
    const now = new Date();
    const getCairoIsoBounds = (daysOffset: number = 0) => {
      const targetDate = new Date(now.getTime() + daysOffset * 86400000);
      const dayYmd = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(targetDate);
      return { dayStr: dayYmd, ...cairoDayBounds(dayYmd) };
    };

    if (dateRange === 'today') {
      const { start, end } = getCairoIsoBounds(0);
      query = query.gte('occurred_at', start).lte('occurred_at', end);
    } else if (dateRange === 'yesterday') {
      const { start, end } = getCairoIsoBounds(-1);
      query = query.gte('occurred_at', start).lte('occurred_at', end);
    } else if (dateRange === 'week') {
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      query = query.gte('occurred_at', weekStart);
    } else if (dateRange === 'month') {
      const { dayStr } = getCairoIsoBounds(0);
      query = query.gte('occurred_at', cairoDayBounds(`${dayStr.slice(0, 7)}-01`).start);
    } else if (dateRange === 'custom' && startDateParam && endDateParam) {
      query = query.gte('occurred_at', cairoDayBounds(startDateParam).start)
                   .lte('occurred_at', cairoDayBounds(endDateParam).end);
    }

    // Sorting
    if (sortBy === 'amount') {
      query = query.order('amount', { ascending: sortOrder === 'asc' });
    } else {
      query = query.order('occurred_at', { ascending: sortOrder === 'asc' });
    }

    const { data: rawTxns, error: fetchErr } = await query;

    if (fetchErr) {
      console.error('transactions fetch error:', fetchErr.message);
      return NextResponse.json({ error: 'Failed to fetch transactions.' }, { status: 500 });
    }

    let items = (rawTxns || []).map((t: any) => ({
      ...t,
      invoice_no: t.invoice?.invoice_no || null,
      customer: t.customer ? {
        id: t.customer.id,
        name: t.customer.name,
        // `customers` stores the number in `mobile`; exposed as `phone` so the client-facing
        // TransactionCustomer shape stays stable.
        phone: t.customer.mobile,
        wallet_balance: Number(t.customer.wallet_balance || 0),
        outstanding: Number(t.customer.outstanding || 0),
        spent: Number(t.customer.spent_amount || 0),
      } : null,
      branch: t.branch ? {
        id: t.branch.id,
        name_en: t.branch.name_en,
        name_ar: t.branch.name_ar,
      } : null,
    }));

    // Client-side search filtering (for joined customer name/phone, description, ref, or reservation)
    if (search) {
      items = items.filter((t: any) => {
        const tId = (t.transaction_id || '').toLowerCase();
        const desc = (t.description || '').toLowerCase();
        const cName = (t.customer?.name || '').toLowerCase();
        const cPhone = (t.customer?.phone || '').toLowerCase();
        const invNo = (t.invoice_no || '').toLowerCase();
        const refNo = (t.reference_no || '').toLowerCase();
        const resId = (t.reservation_id || '').toLowerCase();
        return (
          tId.includes(search) ||
          desc.includes(search) ||
          cName.includes(search) ||
          cPhone.includes(search) ||
          invNo.includes(search) ||
          refNo.includes(search) ||
          resId.includes(search)
        );
      });
    }

    // Amount range filtering
    if (amountRange !== 'all') {
      items = items.filter((t: any) => {
        const absAmt = Math.abs(Number(t.amount || 0));
        if (amountRange === 'under500') return absAmt < 500;
        if (amountRange === '500_1000') return absAmt >= 500 && absAmt <= 1000;
        if (amountRange === '1000_5000') return absAmt > 1000 && absAmt <= 5000;
        if (amountRange === 'above5000') return absAmt > 5000;
        return true;
      });
    }

    const totalMatching = items.length;
    const totalPages = Math.max(1, Math.ceil(totalMatching / limit));
    const paginatedItems = items.slice((page - 1) * limit, page * limit);

    // 2. Compute Quick Overview Statistics
    // NOTE: `customers` has no `branch_id` column — a patient is not owned by a branch, they can
    // book at any of them. So the Outstanding / Wallet Balance totals below are always
    // clinic-wide, even when a branch filter is applied to the transaction list itself.
    const { data: allCustomers, error: custErr } = await supabaseServer
      .from('customers')
      .select('id, name, mobile, wallet_balance, outstanding, spent_amount');
    if (custErr) console.error('customers stats fetch error:', custErr.message);

    let totalOutstanding = 0;
    let outstandingCount = 0;
    let totalWalletBalance = 0;
    let activeWalletCount = 0;
    const outstandingPatientsList: any[] = [];
    const walletPatientsList: any[] = [];

    (allCustomers || []).forEach((c: any) => {
      const rawOut = Number(c.outstanding || 0);
      const rawWal = Number(c.wallet_balance || 0);
      const out = Math.round(rawOut * 100) / 100;
      const wal = Math.round(rawWal * 100) / 100;

      if (out >= 0.01) {
        totalOutstanding += out;
        outstandingCount += 1;
        outstandingPatientsList.push({
          id: c.id,
          name: c.name || 'Patient',
          phone: c.mobile || '',
          outstanding: out,
          wallet_balance: wal >= 0.01 ? wal : 0,
          spent_amount: Math.round(Number(c.spent_amount || 0) * 100) / 100,
        });
      }
      if (wal >= 0.01) {
        totalWalletBalance += wal;
        activeWalletCount += 1;
        walletPatientsList.push({
          id: c.id,
          name: c.name || 'Patient',
          phone: c.mobile || '',
          wallet_balance: wal,
          outstanding: out >= 0.01 ? out : 0,
          spent_amount: Math.round(Number(c.spent_amount || 0) * 100) / 100,
        });
      }
    });

    outstandingPatientsList.sort((a, b) => b.outstanding - a.outstanding);
    walletPatientsList.sort((a, b) => b.wallet_balance - a.wallet_balance);

    // Compute Today's Net Payments (الخزينة) = Cash In Today - Cash Refunds Today
    const { start: todayStartIso, end: todayEndIso } = getCairoIsoBounds(0);

    let todayTxnsQuery = supabaseServer
      .from('transactions')
      .select(`
        id, transaction_id, type, amount, status, payment_method, occurred_at, reference_no, description, customer_id, branch_id,
        customer:customers(id, name, mobile)
      `)
      .gte('occurred_at', todayStartIso)
      .lte('occurred_at', todayEndIso)
      .in('status', ['completed', 'refunded', 'paid']);

    if (branchId !== 'all' && branchId) {
      todayTxnsQuery = todayTxnsQuery.or(`branch_id.eq.${branchId},branch_id.is.null`);
    }

    const { data: todayTxns, error: todayTxnsErr } = await todayTxnsQuery;
    if (todayTxnsErr) console.error('today txns fetch error:', todayTxnsErr.message);

    const CASH_IN_TYPES = new Set(['payment', 'outstanding_payment', 'wallet_topup']);
    let todayNetPayments = 0;
    let todayPaymentsCount = 0;
    const todayPaymentsList: any[] = [];

    (todayTxns || []).forEach((tx: any) => {
      const amt = Math.round(Number(tx.amount || 0) * 100) / 100;
      const absAmt = Math.abs(amt);
      if (CASH_IN_TYPES.has(tx.type)) {
        todayNetPayments += absAmt;
        todayPaymentsCount += 1;
        todayPaymentsList.push({
          id: tx.id,
          transaction_id: tx.transaction_id,
          customer_id: tx.customer_id,
          customer_name: (tx.customer as any)?.name || 'Guest / Patient',
          customer_phone: (tx.customer as any)?.mobile || '',
          amount: absAmt,
          payment_method: tx.payment_method || 'cash',
          occurred_at: tx.occurred_at,
          reference_no: tx.reference_no,
          type: tx.type,
          description: tx.description,
        });
      } else if (tx.type === 'refund') {
        todayNetPayments -= absAmt;
        todayPaymentsCount += 1;
        todayPaymentsList.push({
          id: tx.id,
          transaction_id: tx.transaction_id,
          customer_id: tx.customer_id,
          customer_name: (tx.customer as any)?.name || 'Guest / Patient',
          customer_phone: (tx.customer as any)?.mobile || '',
          amount: -absAmt,
          payment_method: tx.payment_method || 'cash',
          occurred_at: tx.occurred_at,
          reference_no: tx.reference_no,
          type: tx.type,
          description: tx.description,
        });
      }
    });

    todayPaymentsList.sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());

    let todayEstimatedTotal = 0;
    (todayTxns || []).forEach((tx: any) => {
      if (tx.type === 'service_charge' || tx.type === 'product_purchase') {
        todayEstimatedTotal += Math.abs(Number(tx.amount || 0));
      }
    });

    // Patient specific stats if customerId provided
    let patientStats = {};
    if (customerId) {
      const selectedCustomer = (allCustomers || []).find((c: any) => c.id === customerId);
      const patientTransactions = items;
      let spent = Number(selectedCustomer?.spent_amount || 0);
      if (spent === 0 && patientTransactions.length > 0) {
        spent = patientTransactions
          .filter((t: any) => t.status === 'completed' && Number(t.amount) > 0)
          .reduce((sum: number, t: any) => sum + Number(t.amount), 0);
      }
      patientStats = {
        totalSpent: Math.round(spent * 100) / 100,
        patientOutstanding: Math.round(Number(selectedCustomer?.outstanding || 0) * 100) / 100,
        patientWalletBalance: Math.round(Number(selectedCustomer?.wallet_balance || 0) * 100) / 100,
        patientTransactionsCount: patientTransactions.length,
      };
    }

    const stats = {
      todayNetPayments: Math.max(0, Math.round(todayNetPayments * 100) / 100),
      todayPaymentsCount,
      todayEstimatedTotal: Math.round(todayEstimatedTotal * 100) / 100,
      totalOutstanding: Math.round(totalOutstanding * 100) / 100,
      outstandingCount,
      totalWalletBalance: Math.round(totalWalletBalance * 100) / 100,
      activeWalletCount,
      todayPaymentsList,
      outstandingPatientsList,
      walletPatientsList,
      ...patientStats,
    };

    return NextResponse.json({
      transactions: paginatedItems,
      total: totalMatching,
      page,
      totalPages,
      stats,
    });
  } catch (err: any) {
    console.error('GET /api/transactions error:', err?.message || err);
    return NextResponse.json({ error: 'Failed to fetch transactions.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  if (!hasFinancePermission(access.access, 'transactions.create')) {
    return NextResponse.json({ error: 'Permission to create transactions is required.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const {
      transaction_type,
      customer_id,
      amount,
      payment_method = 'cash',
      branch_id,
      reference_no,
      reservation_id,
      invoice_id,
      related_transaction_id,
      description,
      reason,
      refund_destination = 'cash',
      occurred_at,
      notes,
      item_type,
      item_id,
      item_name,
      quantity,
      unit_price,
    } = body;

    if (!transaction_type) {
      return NextResponse.json({ error: 'Transaction Type is required.' }, { status: 400 });
    }

    // Allowed manual transaction types
    const ALLOWED_MANUAL_TYPES = [
      'payment',
      'outstanding_payment',
      'wallet_topup',
      'wallet_deduction',
      'refund',
      'service_charge',
      'product_purchase',
    ];
    if (!ALLOWED_MANUAL_TYPES.includes(transaction_type)) {
      return NextResponse.json({
        error: `Manual transaction type "${transaction_type}" is not supported.`,
      }, { status: 400 });
    }

    // Refunds require granular transactions.refund permission
    if (transaction_type === 'refund' && !hasFinancePermission(access.access, 'transactions.refund')) {
      return NextResponse.json({ error: 'Permission to process refunds is required.' }, { status: 403 });
    }

    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: 'Please enter a valid positive amount in EGP.' }, { status: 400 });
    }

    // Patient is strictly required for all manual transactions
    if (!customer_id) {
      return NextResponse.json({ error: 'Please select a patient for this transaction.' }, { status: 400 });
    }

    // Retrieve patient record
    const { data: customer, error: custErr } = await supabaseServer
      .from('customers')
      .select('id, name, mobile, wallet_balance, outstanding, spent_amount')
      .eq('id', customer_id)
      .maybeSingle();

    if (custErr) {
      console.error('customer lookup error:', custErr.message);
      return NextResponse.json({ error: 'Could not look up the selected patient.' }, { status: 500 });
    }
    if (!customer) {
      return NextResponse.json({ error: 'Selected patient could not be found.' }, { status: 404 });
    }

    // Business Logic Validations per Transaction Type
    let finalAmount = parsedAmount;
    let finalStatus = 'completed';
    let finalDescription = description?.trim() || '';

    if (transaction_type === 'refund') {
      finalAmount = -parsedAmount;
      finalStatus = 'refunded';

      if (!reason?.trim()) {
        return NextResponse.json({ error: 'A reason is required for refunds.' }, { status: 400 });
      }

      if (related_transaction_id) {
        const { data: origTxn, error: origErr } = await supabaseServer
          .from('transactions')
          .select('id, amount, status, customer_id')
          .eq('id', related_transaction_id)
          .maybeSingle();

        if (origErr) {
          console.error('original transaction lookup error:', origErr.message);
          return NextResponse.json({ error: 'Could not look up the original transaction.' }, { status: 500 });
        }
        if (!origTxn) {
          return NextResponse.json({ error: 'The original transaction could not be found.' }, { status: 404 });
        }

        // A refund must be issued against the same patient's own payment
        if (origTxn.customer_id && origTxn.customer_id !== customer_id) {
          return NextResponse.json({
            error: 'That transaction belongs to a different patient.',
          }, { status: 400 });
        }

        // Cap against what is left to refund, not just the original amount
        const { data: priorRefunds, error: priorErr } = await supabaseServer
          .from('transactions')
          .select('amount')
          .eq('related_transaction_id', related_transaction_id)
          .eq('type', 'refund');

        if (priorErr) {
          console.error('prior refunds lookup error:', priorErr.message);
          return NextResponse.json({ error: 'Could not verify previous refunds.' }, { status: 500 });
        }

        const origAmt = Math.abs(Number(origTxn.amount || 0));
        const alreadyRefunded = (priorRefunds || []).reduce(
          (sum: number, r: any) => sum + Math.abs(Number(r.amount || 0)),
          0
        );
        const refundable = origAmt - alreadyRefunded;

        if (refundable <= 0) {
          return NextResponse.json({
            error: `That payment of EGP ${origAmt.toLocaleString()} has already been fully refunded.`,
          }, { status: 400 });
        }
        if (parsedAmount > refundable) {
          return NextResponse.json({
            error: alreadyRefunded > 0
              ? `Only EGP ${refundable.toLocaleString()} is left to refund on that payment (EGP ${alreadyRefunded.toLocaleString()} already refunded).`
              : `Refund amount cannot exceed the original payment of EGP ${origAmt.toLocaleString()}.`,
          }, { status: 400 });
        }
      }

      finalDescription = finalDescription || `Refund: ${reason.trim()}`;
    } else if (transaction_type === 'payment') {
      finalAmount = parsedAmount;
      finalStatus = 'completed';
      finalDescription = finalDescription || `Payment received from ${customer.name || 'patient'}`;
    } else if (transaction_type === 'outstanding_payment') {
      finalAmount = parsedAmount;
      finalStatus = 'completed';
      finalDescription = finalDescription || `Debt settlement from ${customer.name || 'patient'}`;
    } else if (transaction_type === 'wallet_topup') {
      finalAmount = parsedAmount;
      finalStatus = 'completed';
      finalDescription = finalDescription || `Wallet top-up for ${customer.name || 'patient'}`;
    } else if (transaction_type === 'wallet_deduction') {
      if (parsedAmount > Number(customer.wallet_balance || 0)) {
        return NextResponse.json({
          error: `Deduction amount exceeds patient's wallet balance of EGP ${Number(customer.wallet_balance || 0).toLocaleString()}.`,
        }, { status: 400 });
      }
      finalAmount = -parsedAmount;
      finalStatus = 'completed';
      finalDescription = finalDescription || `Wallet deduction for ${customer.name || 'patient'}`;
    } else if (transaction_type === 'service_charge') {
      if (!description?.trim()) {
        return NextResponse.json({ error: 'A description is required for service charges.' }, { status: 400 });
      }
      finalAmount = parsedAmount;
      finalStatus = 'completed';
      finalDescription = description.trim();
    } else if (transaction_type === 'product_purchase') {
      finalAmount = parsedAmount;
      finalStatus = 'completed';
      const cleanItemName = item_name?.trim();
      const qty = Number(quantity) || 1;
      if (finalDescription) {
        // Keep custom description if provided
      } else if (cleanItemName) {
        finalDescription = `${cleanItemName} (Qty: ${qty})`;
      } else {
        finalDescription = 'Product / Package Purchase';
      }
    }

    // Generate formatted transaction ID from the real transaction_seq sequence
    const { data: seqVal, error: seqErr } = await supabaseServer.rpc('next_transaction_seq');
    if (seqErr || seqVal == null) {
      console.error('next_transaction_seq RPC error:', seqErr);
      return NextResponse.json({ error: 'Failed to generate a transaction ID.' }, { status: 500 });
    }
    const txnIdString = formatTxnId(Number(seqVal));

    const staffName = access.access.employee?.email?.split('@')[0] || 'Staff User';

    // Auto-generate reference_no in INV-000001 format if missing or blank
    let finalReferenceNo = reference_no?.trim() || null;
    if (!finalReferenceNo) {
      try {
        const { data: invSeqVal } = await supabaseServer.rpc('next_invoice_no');
        if (invSeqVal != null) {
          finalReferenceNo = formatInvoiceNo(Number(invSeqVal));
        }
      } catch (refErr) {
        console.warn('Auto-reference generation error:', refErr);
      }
    }

    // Insert transaction
    const newTxnRow = {
      transaction_id: txnIdString,
      branch_id: branch_id || null,
      customer_id: customer_id,
      invoice_id: invoice_id || null,
      reservation_id: reservation_id || null,
      type: transaction_type,
      description: finalDescription,
      payment_method: payment_method,
      amount: finalAmount,
      status: finalStatus,
      source: 'manual',
      reference_no: finalReferenceNo,
      related_transaction_id: related_transaction_id || null,
      reason: reason?.trim() || null,
      notes: notes?.trim() || null,
      created_by_employee_id: access.access.employee?.id || null,
      created_by_name: staffName,
      occurred_at: occurred_at ? new Date(occurred_at).toISOString() : new Date().toISOString(),
    };

    const { data: createdTxn, error: insertErr } = await supabaseServer
      .from('transactions')
      .insert(newTxnRow)
      .select()
      .single();

    if (insertErr) {
      console.error('Error inserting transaction:', insertErr);
      return NextResponse.json({ error: 'Failed to record transaction.' }, { status: 500 });
    }

    // Update Customer scalar balances
    let newWallet = Number(customer.wallet_balance || 0);
    let newOutstanding = Number(customer.outstanding || 0);
    let newSpent = Number(customer.spent_amount || 0);

    if (transaction_type === 'refund') {
      newSpent = Math.max(0, newSpent - parsedAmount);
      if (refund_destination === 'wallet') {
        newWallet += parsedAmount;
        await supabaseServer.from('wallet_txns').insert({
          customer_id,
          direction: 'in',
          amount: parsedAmount,
          reason: finalDescription || 'Refund credited to wallet',
          invoice_id: invoice_id || null,
        });
      }
    } else if (transaction_type === 'payment') {
      newSpent += parsedAmount;
    } else if (transaction_type === 'outstanding_payment') {
      newOutstanding = Math.max(0, newOutstanding - parsedAmount);
      newSpent += parsedAmount;
    } else if (transaction_type === 'wallet_topup') {
      newWallet += parsedAmount;
      await supabaseServer.from('wallet_txns').insert({
        customer_id,
        direction: 'in',
        amount: parsedAmount,
        reason: finalDescription || 'Manual wallet top-up',
        invoice_id: invoice_id || null,
      });
    } else if (transaction_type === 'wallet_deduction') {
      newWallet = Math.max(0, newWallet - parsedAmount);
      await supabaseServer.from('wallet_txns').insert({
        customer_id,
        direction: 'out',
        amount: parsedAmount,
        reason: finalDescription || 'Manual wallet deduction',
        invoice_id: invoice_id || null,
      });
    } else if (transaction_type === 'service_charge' || transaction_type === 'product_purchase') {
      newSpent += parsedAmount;
    }

    await supabaseServer
      .from('customers')
      .update({
        wallet_balance: Math.round(newWallet * 100) / 100,
        outstanding: Math.round(newOutstanding * 100) / 100,
        spent_amount: Math.round(newSpent * 100) / 100,
        updated_at: new Date().toISOString(),
      })
      .eq('id', customer_id);

    // Insert Audit Log Record
    await supabaseServer.from('transaction_audit_logs').insert({
      transaction_id: createdTxn.id,
      action: 'created_manual_transaction',
      performed_by_employee_id: access.access.employee?.id || null,
      performed_by_name: staffName,
      details: {
        transaction_type,
        amount: finalAmount,
        payment_method,
        customer_name: customer?.name || null,
        description: finalDescription,
        item_type: item_type || null,
        item_id: item_id || null,
        item_name: item_name || null,
        quantity: quantity || null,
        unit_price: unit_price || null,
      },
    });

    return NextResponse.json({
      success: true,
      transaction: createdTxn,
      message: 'Transaction created successfully.',
    });
  } catch (err: any) {
    console.error('POST /api/transactions error:', err?.message || err);
    return NextResponse.json({ error: 'Transaction could not be created. Please try again.' }, { status: 500 });
  }
}
