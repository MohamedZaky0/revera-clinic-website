import { NextResponse } from 'next/server';
import { requireStaffAccess, hasFinancePermission } from '@/lib/access';
import { supabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

const VALID_TRANSACTION_TYPES = [
  'payment', 'outstanding_payment', 'refund', 'wallet_topup', 'wallet_deduction',
  'service_charge', 'product_purchase', 'adjustment',
];

function formatTxnId(seqVal: number): string {
  return `TXN-${String(seqVal).padStart(6, '0')}`;
}

export async function GET(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  if (!hasFinancePermission(access.access, 'transactions.view')) {
    return NextResponse.json({ error: 'Transactions access is required.' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const search = (searchParams.get('search') || '').trim().toLowerCase();
  const dateRange = searchParams.get('dateRange') || 'all';
  const startDateParam = searchParams.get('startDate');
  const endDateParam = searchParams.get('endDate');
  const typeFilter = searchParams.get('type') || 'all';
  const paymentMethodFilter = searchParams.get('paymentMethod') || 'all';
  const statusFilter = searchParams.get('status') || 'all';
  const branchId = searchParams.get('branchId') || 'all';
  const amountRange = searchParams.get('amountRange') || 'all';
  const sortBy = searchParams.get('sortBy') || 'date';
  const sortOrder = searchParams.get('sortOrder') || 'desc';
  const customerId = searchParams.get('customerId');
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '10', 10)));

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
      query = query.eq('branch_id', branchId);
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

    // Date range filter
    const now = new Date();
    if (dateRange === 'today') {
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();
      query = query.gte('occurred_at', todayStart).lte('occurred_at', todayEnd);
    } else if (dateRange === 'yesterday') {
      const yestStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString();
      const yestEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999).toISOString();
      query = query.gte('occurred_at', yestStart).lte('occurred_at', yestEnd);
    } else if (dateRange === 'week') {
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      query = query.gte('occurred_at', weekStart);
    } else if (dateRange === 'month') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      query = query.gte('occurred_at', monthStart);
    } else if (dateRange === 'custom' && startDateParam && endDateParam) {
      query = query.gte('occurred_at', new Date(startDateParam).toISOString())
                   .lte('occurred_at', new Date(endDateParam + 'T23:59:59.999Z').toISOString());
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

    // Client-side search filtering (for joined customer name/phone or description)
    if (search) {
      items = items.filter((t: any) => {
        const tId = (t.transaction_id || '').toLowerCase();
        const desc = (t.description || '').toLowerCase();
        const cName = (t.customer?.name || '').toLowerCase();
        const cPhone = (t.customer?.phone || '').toLowerCase();
        const invNo = (t.invoice_no || '').toLowerCase();
        const refNo = (t.reference_no || '').toLowerCase();
        return (
          tId.includes(search) ||
          desc.includes(search) ||
          cName.includes(search) ||
          cPhone.includes(search) ||
          invNo.includes(search) ||
          refNo.includes(search)
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
    // clinic-wide, even when a branch filter is applied to the transaction list itself. An
    // earlier version filtered on `customers.branch_id`, which silently errored and zeroed both
    // cards whenever a branch was selected (RISK-076).
    const { data: allCustomers, error: custErr } = await supabaseServer
      .from('customers')
      .select('id, wallet_balance, outstanding, spent_amount');
    if (custErr) console.error('customers stats fetch error:', custErr.message);

    let totalOutstanding = 0;
    let outstandingCount = 0;
    let totalWalletBalance = 0;
    let activeWalletCount = 0;

    (allCustomers || []).forEach((c: any) => {
      const out = Number(c.outstanding || 0);
      const wal = Number(c.wallet_balance || 0);
      if (out > 0) {
        totalOutstanding += out;
        outstandingCount += 1;
      }
      if (wal > 0) {
        totalWalletBalance += wal;
        activeWalletCount += 1;
      }
    });

    // Compute Today's Net Payments = Completed Payments Today - Completed Refunds Today
    const todayStartIso = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const todayEndIso = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();

    let todayTxnsQuery = supabaseServer
      .from('transactions')
      .select('type, amount, status')
      .gte('occurred_at', todayStartIso)
      .lte('occurred_at', todayEndIso)
      .eq('status', 'completed');

    if (branchId !== 'all' && branchId) {
      todayTxnsQuery = todayTxnsQuery.eq('branch_id', branchId);
    }

    const { data: todayTxns, error: todayTxnsErr } = await todayTxnsQuery;
    if (todayTxnsErr) console.error('today txns fetch error:', todayTxnsErr.message);

    let todayNetPayments = 0;
    let todayPaymentsCount = 0;

    (todayTxns || []).forEach((tx: any) => {
      const amt = Number(tx.amount || 0);
      todayNetPayments += amt;
      todayPaymentsCount += 1;
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
        totalSpent: spent,
        patientOutstanding: Number(selectedCustomer?.outstanding || 0),
        patientWalletBalance: Number(selectedCustomer?.wallet_balance || 0),
        patientTransactionsCount: patientTransactions.length,
      };
    }

    const stats = {
      todayNetPayments,
      todayPaymentsCount,
      totalOutstanding,
      outstandingCount,
      totalWalletBalance,
      activeWalletCount,
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
      adjustment_direction = 'increase',
      occurred_at,
      notes,
    } = body;

    if (!transaction_type) {
      return NextResponse.json({ error: 'Transaction Type is required.' }, { status: 400 });
    }
    if (!VALID_TRANSACTION_TYPES.includes(transaction_type)) {
      return NextResponse.json({ error: `Unknown transaction type "${transaction_type}".` }, { status: 400 });
    }

    // Refunds and manual balance adjustments are gated separately from ordinary transaction
    // creation, per the transactions.refund permission defined in RoleManagementView.
    if ((transaction_type === 'refund' || transaction_type === 'adjustment') && !hasFinancePermission(access.access, 'transactions.refund')) {
      return NextResponse.json({ error: 'Permission to process refunds/adjustments is required.' }, { status: 403 });
    }

    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: 'Please enter a valid positive amount in EGP.' }, { status: 400 });
    }

    // Patient required validation for patient-related operations
    const requiresPatient = [
      'payment',
      'outstanding_payment',
      'refund',
      'wallet_topup',
      'wallet_deduction',
      'adjustment'
    ].includes(transaction_type);

    if (requiresPatient && !customer_id) {
      return NextResponse.json({ error: 'Please select a patient for this transaction.' }, { status: 400 });
    }

    // Retrieve patient record if selected
    let customer: any = null;
    if (customer_id) {
      const { data: custData, error: custErr } = await supabaseServer
        .from('customers')
        .select('id, name, mobile, wallet_balance, outstanding, spent_amount')
        .eq('id', customer_id)
        .maybeSingle();

      if (custErr) {
        console.error('customer lookup error:', custErr.message);
        return NextResponse.json({ error: 'Could not look up the selected patient.' }, { status: 500 });
      }
      if (!custData) {
        return NextResponse.json({ error: 'Selected patient could not be found.' }, { status: 404 });
      }
      customer = custData;
    }

    // Business Logic Validations per Transaction Type
    let finalAmount = parsedAmount;
    let finalStatus = 'completed';
    let finalDescription = description?.trim() || '';

    if (transaction_type === 'outstanding_payment') {
      const currentOutstanding = Number(customer?.outstanding || 0);
      if (parsedAmount > currentOutstanding) {
        return NextResponse.json({
          error: `Amount exceeds the patient's outstanding balance of EGP ${currentOutstanding.toLocaleString()}.`
        }, { status: 400 });
      }
      finalDescription = finalDescription || 'Outstanding balance payment';
    } else if (transaction_type === 'wallet_topup') {
      finalDescription = finalDescription || 'Wallet deposit / top-up';
    } else if (transaction_type === 'wallet_deduction') {
      const currentWallet = Number(customer?.wallet_balance || 0);
      if (parsedAmount > currentWallet) {
        return NextResponse.json({
          error: `Insufficient wallet balance. Available: EGP ${currentWallet.toLocaleString()}.`
        }, { status: 400 });
      }
      finalAmount = -parsedAmount;
      finalDescription = finalDescription || 'Wallet withdrawal';
    } else if (transaction_type === 'refund') {
      finalAmount = -parsedAmount;
      finalStatus = 'refunded';
      if (!reason?.trim()) {
        return NextResponse.json({ error: 'A reason is required for refunds.' }, { status: 400 });
      }
      if (related_transaction_id) {
        const { data: origTxn } = await supabaseServer
          .from('transactions')
          .select('id, amount, status')
          .eq('id', related_transaction_id)
          .maybeSingle();

        if (origTxn) {
          const origAmt = Math.abs(Number(origTxn.amount || 0));
          if (parsedAmount > origAmt) {
            return NextResponse.json({
              error: `Refund amount cannot exceed the original payment of EGP ${origAmt.toLocaleString()}.`
            }, { status: 400 });
          }
        }
      }
      finalDescription = finalDescription || `Refund: ${reason}`;
    } else if (transaction_type === 'adjustment') {
      if (!description?.trim() && !reason?.trim()) {
        return NextResponse.json({ error: 'A description is required explaining why the adjustment was made.' }, { status: 400 });
      }
      if (adjustment_direction === 'decrease') {
        finalAmount = -parsedAmount;
      }
      finalDescription = finalDescription || `Adjustment: ${reason || description}`;
    } else if (transaction_type === 'payment') {
      finalDescription = finalDescription || 'Manual payment receipt';
    }

    // Generate formatted transaction ID from the real transaction_seq sequence (atomic,
    // race-condition-free — a random number here would collide against transaction_id's UNIQUE
    // constraint at realistic transaction volume).
    const { data: seqVal, error: seqErr } = await supabaseServer.rpc('next_transaction_seq');
    if (seqErr || seqVal == null) {
      console.error('next_transaction_seq RPC error:', seqErr);
      return NextResponse.json({ error: 'Failed to generate a transaction ID.' }, { status: 500 });
    }
    const txnIdString = formatTxnId(Number(seqVal));

    const staffName = access.access.employee?.email?.split('@')[0] || 'Staff User';

    // Insert transaction
    const newTxnRow = {
      transaction_id: txnIdString,
      branch_id: branch_id || null,
      customer_id: customer_id || null,
      invoice_id: invoice_id || null,
      reservation_id: reservation_id || null,
      type: transaction_type,
      description: finalDescription,
      payment_method: payment_method,
      amount: finalAmount,
      status: finalStatus,
      source: 'manual',
      reference_no: reference_no?.trim() || null,
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
    if (customer_id && customer) {
      let newWallet = customer.wallet_balance || 0;
      let newOutstanding = customer.outstanding || 0;
      let newSpent = customer.spent_amount || 0;

      if (transaction_type === 'wallet_topup') {
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
          reason: finalDescription || 'Manual wallet withdrawal',
          invoice_id: invoice_id || null,
        });
      } else if (transaction_type === 'outstanding_payment') {
        newOutstanding = Math.max(0, newOutstanding - parsedAmount);
        newSpent += parsedAmount;
      } else if (transaction_type === 'payment') {
        newSpent += parsedAmount;
      } else if (transaction_type === 'refund') {
        newSpent = Math.max(0, newSpent - parsedAmount);
      } else if (transaction_type === 'adjustment') {
        // No target-field selector exists in the UI for "Adjustment" — adjustment_direction
        // mirrors wallet_topup/wallet_deduction's exact shape, so this treats a manual adjustment
        // as a wallet correction (the most common interpretation, and consistent with every other
        // signed-amount type here moving a real balance). Revisit if a different target field is
        // ever intended.
        if (adjustment_direction === 'decrease') {
          newWallet = Math.max(0, newWallet - parsedAmount);
        } else {
          newWallet += parsedAmount;
        }
        await supabaseServer.from('wallet_txns').insert({
          customer_id,
          direction: adjustment_direction === 'decrease' ? 'out' : 'in',
          amount: parsedAmount,
          reason: finalDescription || 'Manual balance adjustment',
          invoice_id: invoice_id || null,
        });
      }

      await supabaseServer
        .from('customers')
        .update({
          wallet_balance: newWallet,
          outstanding: newOutstanding,
          spent_amount: newSpent,
          updated_at: new Date().toISOString(),
        })
        .eq('id', customer_id);
    }

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
