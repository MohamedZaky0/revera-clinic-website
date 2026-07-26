import { NextResponse } from 'next/server';
import { requireStaffAccess } from '@/lib/access';
import { supabaseServer } from '@/lib/supabaseServer';
import { computeLedgerBalances, type LedgerBalances, type LedgerInvoice, type LedgerPayment, type LedgerWalletTxn } from '@/lib/customerBalances';

interface ReconciliationRow {
  customerId: string;
  customerName: string | null;
  ledger: LedgerBalances;
  scalar: { outstanding: number; spent: number; wallet: number };
  matches: boolean;
}

export const dynamic = 'force-dynamic';

/**
 * Read-only reconciliation report (task 1.14). Compares the ledger-derived balance for every
 * customer against the existing delta-maintained scalar on `customers`. Writes nothing — this is
 * the "prove it agrees before anything is allowed to read from it" step the task requires, not the
 * cutover of any live read itself.
 */
export async function GET(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const [customersResult, invoicesResult, paymentsResult, walletTxnsResult] = await Promise.all([
      supabaseServer.from('customers').select('id, name, outstanding, spent_amount, wallet_balance'),
      supabaseServer.from('invoices').select('id, customer_id, grand_total, status'),
      supabaseServer.from('payments').select('invoice_id, amount'),
      supabaseServer.from('wallet_txns').select('customer_id, direction, amount'),
    ]);
    if (customersResult.error) throw customersResult.error;
    if (invoicesResult.error) throw invoicesResult.error;
    if (paymentsResult.error) throw paymentsResult.error;
    if (walletTxnsResult.error) throw walletTxnsResult.error;

    const invoicesByCustomer = new Map<string, LedgerInvoice[]>();
    const invoiceIdToCustomer = new Map<string, string>();
    for (const invoice of invoicesResult.data || []) {
      if (!invoice.customer_id) continue;
      invoiceIdToCustomer.set(invoice.id, invoice.customer_id);
      const list = invoicesByCustomer.get(invoice.customer_id) || [];
      list.push({ id: invoice.id, grandTotal: Number(invoice.grand_total || 0), status: invoice.status });
      invoicesByCustomer.set(invoice.customer_id, list);
    }

    const paymentsByCustomer = new Map<string, LedgerPayment[]>();
    for (const payment of paymentsResult.data || []) {
      const customerId = invoiceIdToCustomer.get(payment.invoice_id);
      if (!customerId) continue;
      const list = paymentsByCustomer.get(customerId) || [];
      list.push({ invoiceId: payment.invoice_id, amount: Number(payment.amount || 0) });
      paymentsByCustomer.set(customerId, list);
    }

    const walletTxnsByCustomer = new Map<string, LedgerWalletTxn[]>();
    for (const txn of walletTxnsResult.data || []) {
      if (!txn.customer_id) continue;
      const list = walletTxnsByCustomer.get(txn.customer_id) || [];
      list.push({ direction: txn.direction, amount: Number(txn.amount || 0) });
      walletTxnsByCustomer.set(txn.customer_id, list);
    }

    const EPSILON = 0.01;
    const results: ReconciliationRow[] = (customersResult.data || []).map((customer: any) => {
      const ledger = computeLedgerBalances(
        invoicesByCustomer.get(customer.id) || [],
        paymentsByCustomer.get(customer.id) || [],
        walletTxnsByCustomer.get(customer.id) || []
      );
      const scalar = {
        outstanding: Number(customer.outstanding || 0),
        spent: Number(customer.spent_amount || 0),
        wallet: Number(customer.wallet_balance || 0),
      };
      const matches =
        Math.abs(ledger.outstanding - scalar.outstanding) < EPSILON &&
        Math.abs(ledger.spent - scalar.spent) < EPSILON &&
        Math.abs(ledger.wallet - scalar.wallet) < EPSILON;

      return {
        customerId: customer.id,
        customerName: customer.name,
        ledger,
        scalar,
        matches,
      };
    });

    const discrepancies = results.filter((result) => !result.matches);

    return NextResponse.json({
      customersChecked: results.length,
      discrepancyCount: discrepancies.length,
      discrepancies,
      allMatched: discrepancies.length === 0,
    });
  } catch (err: any) {
    console.error('GET /api/customers/reconcile error:', err);
    return NextResponse.json({ error: err.message || 'Reconciliation failed.' }, { status: 500 });
  }
}
