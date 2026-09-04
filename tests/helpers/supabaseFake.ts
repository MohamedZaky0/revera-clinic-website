/**
 * In-memory stand-in for `@/lib/supabaseServer`, for route-level tests.
 *
 * Route handlers are where most of this system's money logic lives, and none of it can be
 * exercised without a Supabase client. Mocking each `.from().select().eq()` call individually
 * produces tests that pass even when the route's filtering or aggregation is wrong — the mock
 * returns whatever the test author expected regardless of what the route asked for. This fake
 * instead stores rows in plain objects and actually applies the filters the route builds, so a
 * route that queries the wrong column or forgets a filter returns the wrong rows and the test
 * fails for the real reason.
 *
 * It is deliberately not a database: no joins, no RLS, no constraints, no type coercion. Anything
 * that depends on those belongs in a manual test against real Supabase (`ai_docs/manual_tests/`),
 * not here.
 *
 * Operator coverage is driven by what `src/app/api/**\/route.ts` actually calls. If a route starts
 * using an operator that is missing here, `resolve()` throws by name rather than silently ignoring
 * the filter and returning too many rows — a silently-dropped filter is exactly the failure mode
 * this file exists to prevent.
 *
 * Usage:
 *
 *   import { createSupabaseFake } from '../helpers/supabaseFake';
 *
 *   const fake = createSupabaseFake();
 *   vi.mock('@/lib/supabaseServer', () => ({
 *     supabaseServer: {
 *       auth: { getUser: (...args: any[]) => fake.authGetUser(...args) },
 *       from: (table: string) => fake.client.from(table),
 *     },
 *   }));
 *   import { GET } from '@/app/api/whatever/route';   // AFTER the vi.mock call
 *
 *   beforeEach(() => { fake.reset(); });
 *   fake.seed('customers', [{ id: 'c1', wallet_balance: 100 }]);
 *
 * Pass `fake.authGetUser` and `fake.client.from` through arrow functions as shown, rather than
 * spreading `fake.client` directly into the factory. `vi.mock` is hoisted above every import, and
 * the route import is itself hoisted above `const fake = …` — so the factory body runs while
 * `fake` is still in its temporal dead zone. The arrows defer every `fake` dereference to call
 * time, which is inside a request handler, long after module init. Spreading `fake.client` into
 * the factory object reads `fake` immediately and throws `Cannot access 'fake' before
 * initialization`.
 */

import { vi, type Mock } from 'vitest';

export type FakeRow = Record<string, any>;

interface Filter {
  op: string;
  col: string;
  val: any;
  extra?: any;
}

function likeToRegExp(pattern: string, caseInsensitive: boolean): RegExp {
  const escaped = String(pattern)
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/%/g, '.*')
    .replace(/_/g, '.');
  return new RegExp(`^${escaped}$`, caseInsensitive ? 'i' : '');
}

/** Parse one leaf of a PostgREST `.or()` string, e.g. `branch_id.eq.5` or `name.ilike.%ali%`. */
function parseOrLeaf(leaf: string): Filter {
  const firstDot = leaf.indexOf('.');
  const secondDot = leaf.indexOf('.', firstDot + 1);
  if (firstDot < 0 || secondDot < 0) {
    throw new Error(`supabaseFake: cannot parse .or() leaf "${leaf}"`);
  }
  const col = leaf.slice(0, firstDot);
  const op = leaf.slice(firstDot + 1, secondDot);
  const rawVal = leaf.slice(secondDot + 1);
  const val = rawVal === 'null' ? null : rawVal;
  return { op, col, val };
}

function matchesFilter(row: FakeRow, f: Filter): boolean {
  const cell = row[f.col];
  switch (f.op) {
    case 'eq':
      // PostgREST compares as text over the wire; `.eq('id', 5)` matches a string '5' too.
      return cell === f.val || (cell != null && f.val != null && String(cell) === String(f.val));
    case 'neq':
      return !matchesFilter(row, { ...f, op: 'eq' });
    case 'in':
      return (f.val as any[]).some((v) => String(v) === String(cell));
    case 'gt':
      return cell != null && cell > f.val;
    case 'gte':
      return cell != null && cell >= f.val;
    case 'lt':
      return cell != null && cell < f.val;
    case 'lte':
      return cell != null && cell <= f.val;
    case 'like':
      return likeToRegExp(f.val, false).test(String(cell ?? ''));
    case 'ilike':
      return likeToRegExp(f.val, true).test(String(cell ?? ''));
    case 'is':
      return f.val === null ? cell === null || cell === undefined : cell === f.val;
    case 'not': {
      // Only the `.not(col, 'is', null)` shape is used by the routes today.
      if (f.extra === 'is' && f.val === null) return cell !== null && cell !== undefined;
      return !matchesFilter(row, { op: f.extra, col: f.col, val: f.val });
    }
    case 'or':
      return (f.val as Filter[]).some((leaf) => matchesFilter(row, leaf));
    default:
      throw new Error(
        `supabaseFake: unsupported operator ".${f.op}()". Add it to matchesFilter() rather than ` +
          `working around it in the test — an unsupported filter that is silently ignored returns ` +
          `too many rows and makes the test pass for the wrong reason.`
      );
  }
}

export interface SupabaseFake {
  /** The raw table store. Read it in assertions to check what a route actually wrote. */
  db: Record<string, FakeRow[]>;
  /** Drop-in replacement for the `supabaseServer` export. */
  client: any;
  /** `vi.fn()` backing `client.auth.getUser` — set its resolved value per test. */
  authGetUser: Mock<(...args: any[]) => any>;
  /** Replace a table's contents. */
  seed(table: string, rows: FakeRow[]): void;
  /** Empty every table, reset the auth mock, and clear registered RPC handlers. */
  reset(): void;
  /** Read a table's current rows (a copy). */
  rows(table: string): FakeRow[];
  /**
   * Register a handler for `supabaseServer.rpc(name, args)`. `next_invoice_no` already has a
   * sane default (an incrementing counter, matching the real Postgres sequence it wraps) — call
   * this only to override it or to support a different RPC name a route starts using.
   */
  setRpc(name: string, handler: (args: any) => { data: any; error: any } | Promise<{ data: any; error: any }>): void;
}

export function createSupabaseFake(): SupabaseFake {
  const db: Record<string, FakeRow[]> = {};
  let idCounter = 1;
  let invoiceSeq = 1;
  const authGetUser = vi.fn();
  const rpcHandlers = new Map<string, (args: any) => any>();
  rpcHandlers.set('next_invoice_no', () => ({ data: invoiceSeq++, error: null }));

  function table(name: string): FakeRow[] {
    if (!db[name]) db[name] = [];
    return db[name];
  }

  function createQueryBuilder(tableName: string): any {
    const filters: Filter[] = [];
    let orderCol: string | null = null;
    let orderAsc = true;
    let limitCount: number | null = null;
    let pendingInsert: FakeRow[] | null = null;
    let pendingUpdate: FakeRow | null = null;
    let pendingUpsert: { rows: FakeRow[]; onConflict: string[] } | null = null;
    let pendingDelete = false;

    function apply(rows: FakeRow[]): FakeRow[] {
      return rows.filter((row) => filters.every((f) => matchesFilter(row, f)));
    }

    async function resolve(): Promise<{ data: any; error: any }> {
      const rows = table(tableName);

      if (pendingInsert) {
        const inserted = pendingInsert.map((r) => ({ id: r.id ?? `${tableName}-${idCounter++}`, ...r }));
        rows.push(...inserted);
        return { data: inserted.map((r) => ({ ...r })), error: null };
      }

      if (pendingUpsert) {
        const { rows: upsertRows, onConflict } = pendingUpsert;
        // PostgREST defaults the conflict target to the table's primary key when `onConflict` is
        // not passed — this codebase relies on that default in 28 of its 31 `.upsert()` call
        // sites. Without matching it here, every bare `.upsert(rows)` would insert a duplicate
        // row instead of updating the existing one by `id`.
        const conflictCols = onConflict.length ? onConflict : ['id'];
        const results: FakeRow[] = [];
        for (const r of upsertRows) {
          const idx = rows.findIndex((row) =>
            conflictCols.every((c) => row[c] !== undefined && r[c] !== undefined && String(row[c]) === String(r[c]))
          );
          if (idx >= 0) {
            rows[idx] = { ...rows[idx], ...r };
            results.push({ ...rows[idx] });
          } else {
            const created = { id: r.id ?? `${tableName}-${idCounter++}`, ...r };
            rows.push(created);
            results.push({ ...created });
          }
        }
        return { data: results, error: null };
      }

      if (pendingUpdate) {
        const matched = apply(rows);
        matched.forEach((row) => Object.assign(row, pendingUpdate));
        return { data: matched.map((r) => ({ ...r })), error: null };
      }

      if (pendingDelete) {
        const matched = apply(rows);
        const removed = new Set(matched);
        db[tableName] = rows.filter((r) => !removed.has(r));
        return { data: matched.map((r) => ({ ...r })), error: null };
      }

      let result = apply(rows).map((r) => ({ ...r }));
      if (orderCol) {
        const col = orderCol;
        result = result.sort((a, b) => {
          if (a[col] === b[col]) return 0;
          if (a[col] == null) return 1;
          if (b[col] == null) return -1;
          return (a[col] < b[col] ? -1 : 1) * (orderAsc ? 1 : -1);
        });
      }
      if (limitCount != null) result = result.slice(0, limitCount);
      return { data: result, error: null };
    }

    const builder: any = {
      select() { return builder; },
      eq(col: string, val: any) { filters.push({ op: 'eq', col, val }); return builder; },
      neq(col: string, val: any) { filters.push({ op: 'neq', col, val }); return builder; },
      gt(col: string, val: any) { filters.push({ op: 'gt', col, val }); return builder; },
      gte(col: string, val: any) { filters.push({ op: 'gte', col, val }); return builder; },
      lt(col: string, val: any) { filters.push({ op: 'lt', col, val }); return builder; },
      lte(col: string, val: any) { filters.push({ op: 'lte', col, val }); return builder; },
      like(col: string, val: any) { filters.push({ op: 'like', col, val }); return builder; },
      ilike(col: string, val: any) { filters.push({ op: 'ilike', col, val }); return builder; },
      is(col: string, val: any) { filters.push({ op: 'is', col, val }); return builder; },
      in(col: string, val: any[]) { filters.push({ op: 'in', col, val }); return builder; },
      not(col: string, op: string, val: any) { filters.push({ op: 'not', col, val, extra: op }); return builder; },
      or(expr: string) {
        filters.push({ op: 'or', col: '', val: String(expr).split(',').map(parseOrLeaf) });
        return builder;
      },
      order(col: string, opts: { ascending?: boolean } = {}) {
        orderCol = col;
        orderAsc = opts.ascending !== false;
        return builder;
      },
      limit(n: number) { limitCount = n; return builder; },
      insert(rows: FakeRow | FakeRow[]) { pendingInsert = Array.isArray(rows) ? rows : [rows]; return builder; },
      update(vals: FakeRow) { pendingUpdate = vals; return builder; },
      delete() { pendingDelete = true; return builder; },
      upsert(rows: FakeRow | FakeRow[], opts: { onConflict?: string } = {}) {
        pendingUpsert = {
          rows: Array.isArray(rows) ? rows : [rows],
          onConflict: (opts.onConflict || '').split(',').map((s) => s.trim()).filter(Boolean),
        };
        return builder;
      },
      async maybeSingle() {
        const { data, error } = await resolve();
        return { data: Array.isArray(data) ? data[0] ?? null : data, error };
      },
      async single() {
        const { data } = await resolve();
        const row = Array.isArray(data) ? data[0] ?? null : data;
        // Real PostgREST errors when `.single()` matches nothing; several routes branch on that.
        if (row == null) {
          return { data: null, error: { message: 'JSON object requested, multiple (or no) rows returned' } };
        }
        return { data: row, error: null };
      },
      then(onResolve: any, onReject: any) { return resolve().then(onResolve, onReject); },
    };

    return builder;
  }

  const client = {
    auth: { getUser: (...args: any[]) => authGetUser(...args) },
    from: (name: string) => createQueryBuilder(name),
    async rpc(name: string, args?: any) {
      const handler = rpcHandlers.get(name);
      if (!handler) {
        throw new Error(
          `supabaseFake: no handler registered for rpc("${name}"). Call fake.setRpc("${name}", ...) ` +
            `before the route under test calls it.`
        );
      }
      return handler(args);
    },
  };

  return {
    db,
    client,
    authGetUser,
    seed(name: string, rows: FakeRow[]) {
      db[name] = rows.map((r) => ({ ...r }));
    },
    reset() {
      for (const key of Object.keys(db)) delete db[key];
      idCounter = 1;
      invoiceSeq = 1;
      authGetUser.mockReset();
      rpcHandlers.clear();
      rpcHandlers.set('next_invoice_no', () => ({ data: invoiceSeq++, error: null }));
    },
    rows(name: string) {
      return (db[name] || []).map((r) => ({ ...r }));
    },
    setRpc(name: string, handler: (args: any) => any) {
      rpcHandlers.set(name, handler);
    },
  };
}
