/**
 * Fault and race injection on top of `supabaseFake`.
 *
 * `fakeWithHook(fake, hook)` returns a `from(table)` function that behaves exactly like
 * `fake.client.from(table)`, except that just before a query actually runs (at the point the route
 * awaits it) the hook is called with `{ table, op, payload }`. The hook may:
 *
 *   - return `{ error: { message } }`  -> that query fails with the error and writes nothing;
 *   - mutate `fake.db` itself          -> simulates another request changing the data between this
 *                                         request's earlier read and this write (a race);
 *   - return nothing                   -> the query runs normally.
 *
 * Use it from a `vi.mock('@/lib/supabaseServer', ...)` factory:
 *
 *   from: (t) => faultyFrom(t)
 *
 * where `faultyFrom = fakeWithHook(fake, (call) => currentHook?.(call))`.
 */
import type { SupabaseFake } from './supabaseFake';

export type FaultOp = 'select' | 'insert' | 'update' | 'delete' | 'upsert';

export interface FaultCall {
  table: string;
  op: FaultOp;
  payload: any;
}

export type FaultResult = { error: { message: string } } | void | undefined | Promise<{ error: { message: string } } | void | undefined>;

const CHAIN_METHODS = [
  'select', 'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'is', 'in', 'not', 'or', 'order', 'limit',
];

export function fakeWithHook(fake: SupabaseFake, hook: (call: FaultCall) => FaultResult) {
  return (table: string) => {
    const inner = fake.client.from(table);
    let op: FaultOp = 'select';
    let payload: any = null;
    const w: any = {};

    for (const m of CHAIN_METHODS) {
      w[m] = (...args: any[]) => {
        inner[m](...args);
        return w;
      };
    }
    for (const m of ['insert', 'update', 'delete', 'upsert'] as const) {
      w[m] = (...args: any[]) => {
        op = m;
        payload = args[0];
        inner[m](...args);
        return w;
      };
    }

    async function run(terminal: 'then' | 'maybeSingle' | 'single') {
      const fault = await hook({ table, op, payload });
      if (fault && 'error' in fault) return { data: null, error: fault.error };
      if (terminal === 'then') return inner.then((v: any) => v);
      return inner[terminal]();
    }

    w.maybeSingle = () => run('maybeSingle');
    w.single = () => run('single');
    w.then = (onResolve: any, onReject: any) => run('then').then(onResolve, onReject);
    return w;
  };
}
