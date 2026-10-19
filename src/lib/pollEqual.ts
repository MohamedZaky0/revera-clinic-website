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
