// Equality check for poll-fed state. The admin shell's 15 s / 30 s polls parse a
// fresh array out of every response, so a plain setState always stores a new
// identity and re-renders the whole shell even when the data is identical.
// Comparing the serialized payload lets callers keep the previous reference when
// nothing actually changed.
//
// Why a JSON compare rather than per-field diffing: the rows come back from the
// same endpoint through the same serializer, so identical data produces an
// identical string — including fields a hand-picked key list (id/status/updated-at)
// would miss, like amounts or notes. Cost is one serialization of a few thousand
// small rows per poll tick, which is negligible at 15–30 s intervals.
export function pollDataEqual(prev: unknown, next: unknown): boolean {
  if (prev === next) return true;
  if (prev == null || next == null) return prev === next;
  return JSON.stringify(prev) === JSON.stringify(next);
}

// Cheaper row-wise comparator for large unbounded lists (e.g. the Bookings
// screen's select("*") on reservations, polled every 3 s). JSON.compare costs
// ~8 ms on a 5,000-row reservation payload and ~30 ms on 20,000 rows (measured
// 2026-10-19), which is over budget at that cadence; comparing a fixed key set
// stays in low single-digit ms.
//
// Compares `keys` on each row pair by index, plus the array lengths. Array-valued
// cells (e.g. service_ids, rooms) are compared element-by-element so freshly
// parsed arrays don't look "changed" every tick.
//
// What it can miss: a column not listed in `keys` — `created_at`/`updated_at`
// are deliberately excluded (updated_at is only a DEFAULT now() on insert, no
// trigger), and values nested inside array elements are compared by identity.
// Keep the key list in sync with the table's mutable columns.
export function pollRowsEqualByKeys(
  prev: readonly Record<string, any>[] | null | undefined,
  next: readonly Record<string, any>[] | null | undefined,
  keys: readonly string[]
): boolean {
  if (prev === next) return true;
  if (!Array.isArray(prev) || !Array.isArray(next) || prev.length !== next.length) return false;
  for (let i = 0; i < prev.length; i++) {
    const a = prev[i];
    const b = next[i];
    if (a === b) continue;
    if (a == null || b == null) return false;
    for (let k = 0; k < keys.length; k++) {
      if (!pollCellEqual(a[keys[k]], b[keys[k]])) return false;
    }
  }
  return true;
}

function pollCellEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }
  return false;
}
