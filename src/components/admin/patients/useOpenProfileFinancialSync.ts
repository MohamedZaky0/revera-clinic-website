"use client";

import { useEffect } from "react";

/**
 * Keeps the money fields of the OPEN patient profile in step with the derived patients list (DEC-127).
 *
 * The profile drawer reads Total Spend / Outstanding / Wallet from a local copy of the customer
 * (`viewingCustomerProfile`) taken when the drawer opens. The figures that must be shown are the
 * derived ones from the admin page's `customers` list: the stored column combined with what the
 * bookings say was paid and is still owed (DEC-121, src/lib/patientSpend.ts).
 *
 * THIS HOOK MUST STAY THE ONLY WRITER of those fields. A second effect that copied the raw stored
 * `dbCustomers` record into the same state made the two fight: each one undid the other on every
 * render, so the numbers flickered between the stored and the calculated value for as long as the
 * drawer was open, for any patient whose stored and calculated figures differ (RISK-132).
 */

export interface DerivedFinancials {
  spent: number;
  outstanding: number;
  wallet: number;
  number_of_bookings: number | undefined;
}

/** The money fields of one row of the derived `customers` list, as plain numbers. */
export function financialsOf(row: any): DerivedFinancials {
  return {
    spent: Number(row?.spent || 0),
    outstanding: Number(row?.outstanding || 0),
    wallet: Number(row?.wallet_balance ?? row?.wallet ?? 0),
    number_of_bookings: row?.number_of_bookings,
  };
}

/** True when the open profile does not yet carry the derived figures. */
export function profileNeedsSync(profile: any, derived: DerivedFinancials): boolean {
  return (
    derived.spent !== Number(profile?.spent_amount || 0) ||
    derived.spent !== Number(profile?.spent || 0) ||
    derived.outstanding !== Number(profile?.outstanding || 0) ||
    derived.wallet !== Number(profile?.wallet_balance || 0) ||
    derived.wallet !== Number(profile?.wallet || 0) ||
    derived.number_of_bookings !== profile?.number_of_bookings
  );
}

export function useOpenProfileFinancialSync(
  customers: any[],
  viewingCustomerProfile: any,
  setViewingCustomerProfile: (updater: (prev: any) => any) => void
) {
  useEffect(() => {
    if (!viewingCustomerProfile?.id) return;
    const fresh = customers.find((c) => String(c.id) === String(viewingCustomerProfile.id));
    if (!fresh) return;
    const derived = financialsOf(fresh);
    if (!profileNeedsSync(viewingCustomerProfile, derived)) return;
    setViewingCustomerProfile((prev: any) =>
      prev
        ? {
            ...prev,
            spent_amount: derived.spent,
            spent: derived.spent,
            outstanding: derived.outstanding,
            wallet_balance: derived.wallet,
            wallet: derived.wallet,
            number_of_bookings: derived.number_of_bookings,
          }
        : prev
    );
  }, [customers, viewingCustomerProfile, setViewingCustomerProfile]);
}
