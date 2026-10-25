import React, { useEffect, useRef, useState } from 'react';
import { describe, it, expect } from 'vitest';
import { render, act } from '@testing-library/react';
import { useOpenProfileFinancialSync } from '@/components/admin/patients/useOpenProfileFinancialSync';
import { totalOutstandingFromBookings, totalPaidFromBookings } from '@/lib/patientSpend';

// The patient from the production report: stored spent 0 / outstanding 2820, bookings say 2700 / 2920.
const STORED = { id: 'e428fecd', name: 'hazem al hadary', spent_amount: 0, outstanding: 2820, wallet_balance: 0, number_of_bookings: 3 };
const BOOKINGS = [
  { status: 'completed', amountPaid: 1200, amountLeft: 100 },
  { status: 'approved', amountPaid: 1500, amountLeft: 0 },
  { status: 'completed', amountPaid: 0, amountLeft: 2820 },
];

/** Same combination the admin page's `customers` memo applies (DEC-121). */
function derivedRow() {
  return {
    ...STORED,
    spent: Math.max(STORED.spent_amount, totalPaidFromBookings(BOOKINGS)),
    outstanding: Math.max(STORED.outstanding, totalOutstandingFromBookings(BOOKINGS)),
    wallet: STORED.wallet_balance,
  };
}

type Shown = { spent: number; outstanding: number };

/** Records every state the drawer would have painted. */
function Harness({ legacyRawWriter, history }: { legacyRawWriter: boolean; history: Shown[] }) {
  const customers = React.useMemo(() => [derivedRow()], []);
  const dbCustomers = React.useMemo(() => [STORED], []);
  // Drawer opens with the row clicked in the (derived) list.
  const [profile, setProfile] = useState<any>(() => ({ ...derivedRow() }));
  const legacyWrites = useRef(0);

  useOpenProfileFinancialSync(customers, profile, setProfile);

  // The old second writer, kept only to reproduce the bug. Capped so a failing run cannot hang.
  useEffect(() => {
    if (!legacyRawWriter || legacyWrites.current > 25) return;
    const fresh = dbCustomers[0];
    if (fresh.spent_amount !== profile.spent_amount || fresh.outstanding !== profile.outstanding) {
      legacyWrites.current += 1;
      setProfile((prev: any) => ({ ...prev, spent_amount: fresh.spent_amount, spent: fresh.spent_amount, outstanding: fresh.outstanding }));
    }
  }, [dbCustomers, profile, legacyRawWriter]);

  const shown = { spent: Math.max(Number(profile.spent_amount || 0), Number(profile.spent || 0)), outstanding: Number(profile.outstanding || 0) };
  history.push(shown);
  return <div data-testid="n">{shown.spent}/{shown.outstanding}</div>;
}

const settle = () => act(async () => { await new Promise((r) => setTimeout(r, 50)); });

describe('open profile financial sync (RISK-132)', () => {
  it('shows the derived numbers and then stops writing (no flicker)', async () => {
    const history: Shown[] = [];
    const { getByTestId } = render(<Harness legacyRawWriter={false} history={history} />);
    await settle();
    expect(getByTestId('n').textContent).toBe('2700/2920');
    // every paint is already the derived pair, and the number of paints is small and settled
    expect(history.every((h) => h.spent === 2700 && h.outstanding === 2920)).toBe(true);
    const settled = history.length;
    await settle();
    expect(history.length).toBe(settled);
    expect(settled).toBeLessThanOrEqual(3);
  });

  it('documents the bug: a second writer from the raw stored record makes the numbers alternate', async () => {
    const history: Shown[] = [];
    render(<Harness legacyRawWriter={true} history={history} />);
    await settle();
    const distinct = new Set(history.map((h) => `${h.spent}/${h.outstanding}`));
    expect(distinct.size).toBeGreaterThan(1);
    expect(history.length).toBeGreaterThan(10);
  });

  it('follows the list when the bookings change (e.g. a payment is recorded)', async () => {
    function Live() {
      const [rows, setRows] = useState<any[]>([{ id: 'c1', spent: 100, outstanding: 50, wallet: 0, wallet_balance: 0, number_of_bookings: 1 }]);
      const [profile, setProfile] = useState<any>({ id: 'c1', spent_amount: 100, spent: 100, outstanding: 50, wallet_balance: 0, wallet: 0, number_of_bookings: 1 });
      useOpenProfileFinancialSync(rows, profile, setProfile);
      return (
        <div>
          <span data-testid="v">{profile.spent}/{profile.outstanding}</span>
          <button onClick={() => setRows([{ id: 'c1', spent: 400, outstanding: 0, wallet: 0, wallet_balance: 0, number_of_bookings: 2 }])}>pay</button>
        </div>
      );
    }
    const { getByTestId, getByText } = render(<Live />);
    expect(getByTestId('v').textContent).toBe('100/50');
    await act(async () => { getByText('pay').click(); });
    expect(getByTestId('v').textContent).toBe('400/0');
  });
});
