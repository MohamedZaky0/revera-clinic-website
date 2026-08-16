---
trigger: always_on
---

# React state and money-handling rules

## React: never read state you just set

`setX(...)` does not update the value in the current closure. Reading it on the next line — even
after `await` — gives you the **previous** value.

- **What happened:** `openApprove` awaited `refreshApproveAvailability()` (which calls
  `setApproveUnavailableSlots`) and then read `approveUnavailableSlots` to decide whether the
  patient's requested time was available. It got the *previously opened booking's* availability, so
  the check was silently wrong on every open after the first.
- **Fix pattern:** have the function **return** the value it computed, and use the returned value:

```ts
async function refreshX() {
  const fresh = await compute();
  setX(fresh);
  return fresh;        // <- caller uses this, not the state variable
}
const fresh = await refreshX();
```

## React: data fetched after a write must bypass the cache

`cachedFetch` (`src/lib/fetchCache.ts`) has a short TTL and **no write invalidation**. Refetching
immediately after a mutation returns the stale list.

- **What happened:** a newly created booking didn't appear until a full page reload.
- `fetchAllReservations()` in `src/app/admin/page.tsx` now bypasses the cache by default. Keep it
  that way. If you add a new post-write refetch elsewhere, call `clearFetchCache(url)` first.

## React: lift state that a parent needs

- **What happened:** additional services a doctor added during a session lived in `useState` inside
  a child tab and were never passed up, so the parent's invoice total had no idea they existed.
- If a parent computes a total, every input to that total must reach the parent.

## Money: correctness rules

1. **Payment state comes from money columns only.** `amountPaid` / `amountLeft`. Never from
   `status`. A `completed` booking can be entirely unpaid.
2. **Wallet movements go through `src/lib/wallet.ts`.** `recordWalletMovement()` writes the
   `wallet_txns` ledger row *and* updates `customers.wallet_balance` together — ledger first, so a
   failure can't leave a balance change with no audit trail. Never write `wallet_balance` with a
   bare `.update()`.
   - `wallet_txns.amount` has a `CHECK > 0`; direction is carried by `direction: 'in' | 'out'`,
     never by a negative amount. A zero delta must write **no row** (the insert would be rejected).
3. **Check the balance before spending wallet credit**, and refuse the sale (409) if short. Letting
   it through mints credit the clinic never received — which is exactly what happened before: POS
   wallet payments were recorded but never deducted, so the same credit was spendable repeatedly.
4. **Do not modify `computeSettledBalances()`** in `src/lib/billing.ts`. It is deliberately
   delta-based and idempotent, and was verified correct. Bugs in this area have been in the *callers*
   that bypassed it, not in it.
5. **`payments.method`** must be the real method. It is constrained to
   `cash | card | wallet | instapay | transfer`. It was hardcoded to `'cash'` for every package
   sale, corrupting all payment-method reporting.
6. **Never trust a client-supplied price or total.** Re-resolve prices server-side from the service
   / package record.

## Money: what not to touch without being asked

`src/lib/billing.ts`, `src/lib/ledger.ts`, `src/lib/wallet.ts`, `src/lib/customerBalances.ts` and
`GET /api/customers/reconcile` are the accounting core. Change them only when a task names them
explicitly.

## Components with a known bug history

`src/components/BookingModal.tsx` and `src/app/admin/page.tsx` (27k lines) have repeatedly produced
subtle regressions. In these two files: make the **smallest possible** change, keep it surgical, and
do not restructure surrounding code while you are in there.
