import { NextResponse } from 'next/server';
import { requireStaffAccess, requireAdministratorAccess } from '@/lib/access';
import { supabaseServer } from '@/lib/supabaseServer';
import { amortizeLoanPayment } from '@/lib/depreciation';

export const dynamic = 'force-dynamic';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const PERIOD_RE = /^\d{4}-\d{2}$/;

function periodFromDate(dateStr: string): string {
  return dateStr.slice(0, 7);
}

function nextPeriod(period: string): string {
  const [year, month] = period.split('-').map(Number);
  const totalMonths = year * 12 + (month - 1) + 1;
  const newYear = Math.floor(totalMonths / 12);
  const newMonth = (totalMonths % 12) + 1;
  return `${newYear}-${String(newMonth).padStart(2, '0')}`;
}

/**
 * GET is staff-readable; every mutation requires an administrator — same reasoning as
 * `/api/assets` (task 3.11): loans are infrequent, high-stakes liability records.
 */
export async function GET(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (id) {
      const [loanResult, scheduleResult] = await Promise.all([
        supabaseServer.from('loans').select('*').eq('id', id).maybeSingle(),
        supabaseServer.from('loan_schedule').select('*').eq('loan_id', id).order('period', { ascending: true }),
      ]);
      if (loanResult.error) throw loanResult.error;
      if (!loanResult.data) return NextResponse.json({ error: 'Loan not found.' }, { status: 404 });
      if (scheduleResult.error) throw scheduleResult.error;
      return NextResponse.json({ loan: loanResult.data, schedule: scheduleResult.data || [] });
    }

    const { data: loans, error } = await supabaseServer.from('loans').select('*').order('started_on', { ascending: false });
    if (error) throw error;

    const loanIds = (loans || []).map((loan: any) => loan.id);
    const latestByLoan = new Map<string, any>();
    if (loanIds.length > 0) {
      const { data: scheduleRows, error: scheduleError } = await supabaseServer
        .from('loan_schedule')
        .select('loan_id, period, balance_after')
        .in('loan_id', loanIds)
        .order('period', { ascending: false });
      if (scheduleError) throw scheduleError;
      for (const row of scheduleRows || []) {
        if (!latestByLoan.has(row.loan_id)) latestByLoan.set(row.loan_id, row);
      }
    }

    const mapped = (loans || []).map((loan: any) => ({
      ...loan,
      remaining_balance: latestByLoan.has(loan.id) ? Number(latestByLoan.get(loan.id).balance_after) : Number(loan.principal),
    }));

    return NextResponse.json(mapped);
  } catch (error: any) {
    console.error('GET /api/loans error:', error);
    return NextResponse.json({ error: error.message || 'Unable to load loans.' }, { status: 500 });
  }
}

/**
 * Creates a loan and generates its full `loan_schedule` in the same request (task 3.12).
 *
 * **Opening-loan decision (DEC-024, per task 3.6/3.12's own latitude):** an opening loan's
 * schedule is seeded with a single lump `is_opening = true` entry representing everything before
 * go-live — `period = openingAsOf`, `installment/interest_part = 0`, `principal_part = principal -
 * openingBalance`, `balance_after = openingBalance` — then normal amortized periods continue from
 * `openingBalance` onward. This is the "single lump entry" option the task text offers, chosen
 * over enumerating (and back-dating) every pre-go-live period individually, since none of that
 * history is being imported (DEC-026 — all current data is mock, no backfill).
 */
export async function POST(req: Request) {
  const access = await requireAdministratorAccess(req);
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });

  try {
    const { lender, principal, annualRate, termMonths, startedOn, installment, isOpening, openingBalance, openingAsOf } = await req.json();

    if (!lender || typeof lender !== 'string') {
      return NextResponse.json({ error: 'lender is required.' }, { status: 400 });
    }
    const principalNum = Number(principal);
    if (!Number.isFinite(principalNum) || principalNum <= 0) {
      return NextResponse.json({ error: 'principal must be a positive number.' }, { status: 400 });
    }
    const rateNum = annualRate !== undefined ? Number(annualRate) : 0;
    if (!Number.isFinite(rateNum) || rateNum < 0) {
      return NextResponse.json({ error: 'annualRate must be a number >= 0.' }, { status: 400 });
    }
    const termNum = Number(termMonths);
    if (!Number.isFinite(termNum) || termNum <= 0) {
      return NextResponse.json({ error: 'termMonths must be a positive number.' }, { status: 400 });
    }
    if (typeof startedOn !== 'string' || !DATE_RE.test(startedOn) || Number.isNaN(new Date(startedOn).getTime())) {
      return NextResponse.json({ error: "startedOn must be a valid 'YYYY-MM-DD' date." }, { status: 400 });
    }
    const installmentNum = Number(installment);
    if (!Number.isFinite(installmentNum) || installmentNum <= 0) {
      return NextResponse.json({ error: 'installment must be a positive number.' }, { status: 400 });
    }

    let openingBalanceNum: number | null = null;
    let openingPeriod: string | null = null;
    if (isOpening) {
      openingBalanceNum = Number(openingBalance);
      if (!Number.isFinite(openingBalanceNum) || openingBalanceNum <= 0 || openingBalanceNum > principalNum) {
        return NextResponse.json(
          { error: 'openingBalance must be a positive number no greater than principal when isOpening is true.' },
          { status: 400 }
        );
      }
      if (typeof openingAsOf !== 'string' || !PERIOD_RE.test(openingAsOf)) {
        return NextResponse.json({ error: "openingAsOf must be a valid 'YYYY-MM' period when isOpening is true." }, { status: 400 });
      }
      openingPeriod = openingAsOf;
    }

    // Compute the schedule in memory first — if amortizeLoanPayment throws (installment too low
    // to cover a period's interest), fail with 400 before writing anything to the database.
    const scheduleRows: any[] = [];
    try {
      if (isOpening && openingBalanceNum !== null && openingPeriod) {
        scheduleRows.push({
          period: openingPeriod,
          installment: 0,
          interest_part: 0,
          principal_part: Math.round((principalNum - openingBalanceNum + Number.EPSILON) * 100) / 100,
          balance_after: openingBalanceNum,
          is_opening: true,
        });

        let balance = openingBalanceNum;
        let period = openingPeriod;
        for (let i = 0; i < termNum && balance > 0; i++) {
          period = nextPeriod(period);
          const result = amortizeLoanPayment(balance, rateNum, installmentNum);
          scheduleRows.push({
            period,
            installment: installmentNum,
            interest_part: result.interestPart,
            principal_part: result.principalPart,
            balance_after: result.balanceAfter,
            is_opening: false,
          });
          balance = result.balanceAfter;
        }
      } else {
        let balance = principalNum;
        let period = periodFromDate(startedOn);
        for (let i = 0; i < termNum && balance > 0; i++) {
          const result = amortizeLoanPayment(balance, rateNum, installmentNum);
          scheduleRows.push({
            period,
            installment: installmentNum,
            interest_part: result.interestPart,
            principal_part: result.principalPart,
            balance_after: result.balanceAfter,
            is_opening: false,
          });
          balance = result.balanceAfter;
          period = nextPeriod(period);
        }
      }
    } catch (scheduleCalcError: any) {
      return NextResponse.json({ error: scheduleCalcError.message || 'Unable to compute loan schedule.' }, { status: 400 });
    }

    const { data: loan, error: loanError } = await supabaseServer
      .from('loans')
      .insert({
        lender: lender.trim(),
        principal: principalNum,
        annual_rate: rateNum,
        term_months: termNum,
        started_on: startedOn,
        installment: installmentNum,
        is_opening: Boolean(isOpening),
      })
      .select()
      .single();
    if (loanError) throw loanError;

    const { data: schedule, error: scheduleError } = await supabaseServer
      .from('loan_schedule')
      .insert(scheduleRows.map((row) => ({ ...row, loan_id: loan.id })))
      .select();
    if (scheduleError) {
      // Roll back the loan row so a failed schedule insert doesn't leave an orphaned loan.
      await supabaseServer.from('loans').delete().eq('id', loan.id);
      throw scheduleError;
    }

    return NextResponse.json({ loan, schedule }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/loans error:', error);
    return NextResponse.json({ error: error.message || 'Unable to create loan.' }, { status: 500 });
  }
}

/**
 * Only `lender` is editable. Changing `principal`/`annualRate`/`termMonths`/`startedOn`/
 * `installment` would invalidate the already-generated `loan_schedule` — regenerating it isn't
 * supported here; delete and recreate the loan instead.
 */
export async function PATCH(req: Request) {
  const access = await requireAdministratorAccess(req);
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id query param is required.' }, { status: 400 });

  try {
    const body = await req.json();
    const { lender } = body;
    const disallowedKeys = ['principal', 'annualRate', 'termMonths', 'startedOn', 'installment'].filter(
      (key) => body[key] !== undefined
    );
    if (disallowedKeys.length > 0) {
      return NextResponse.json(
        {
          error: `Changing ${disallowedKeys.join(', ')} after a loan's schedule has been generated is not supported — delete and recreate the loan instead.`,
        },
        { status: 400 }
      );
    }
    if (lender === undefined) return NextResponse.json({ error: 'No fields to update.' }, { status: 400 });
    if (!lender || typeof lender !== 'string') {
      return NextResponse.json({ error: 'lender must be a non-empty string.' }, { status: 400 });
    }

    const { data, error } = await supabaseServer
      .from('loans')
      .update({ lender: lender.trim() })
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Loan not found.' }, { status: 404 });
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('PATCH /api/loans error:', error);
    return NextResponse.json({ error: error.message || 'Unable to update loan.' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const access = await requireAdministratorAccess(req);
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id query param is required.' }, { status: 400 });

  try {
    const { data, error } = await supabaseServer.from('loans').delete().eq('id', id).select();
    if (error) throw error;
    if (!data || data.length === 0) return NextResponse.json({ error: 'Loan not found.' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE /api/loans error:', error);
    return NextResponse.json({ error: error.message || 'Unable to delete loan.' }, { status: 500 });
  }
}
