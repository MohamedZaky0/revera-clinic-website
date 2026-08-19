/**
 * Tests for the test helper itself.
 *
 * Every route test built on `createSupabaseFake` inherits its correctness. A fake that silently
 * drops a filter returns too many rows, which makes route tests pass while the route is broken —
 * the exact failure this fake was built to prevent. So the fake gets tested like production code.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createSupabaseFake } from './supabaseFake';

const fake = createSupabaseFake();
const sb = fake.client;

beforeEach(() => {
  fake.reset();
});

describe('filters', () => {
  beforeEach(() => {
    fake.seed('t', [
      { id: '1', name: 'Ali', branch_id: 'b1', amount: 100, status: 'completed', provider_id: null },
      { id: '2', name: 'ALI Hassan', branch_id: 'b2', amount: 250, status: 'pending', provider_id: 'p1' },
      { id: '3', name: 'Mona', branch_id: null, amount: 50, status: 'completed', provider_id: 'p2' },
    ]);
  });

  it('eq matches, and compares numbers to their string form the way PostgREST does', async () => {
    const { data } = await sb.from('t').select('*').eq('status', 'completed');
    expect(data.map((r: any) => r.id)).toEqual(['1', '3']);

    fake.seed('nums', [{ id: 1 }, { id: 2 }]);
    const { data: byString } = await sb.from('nums').select('*').eq('id', '1');
    expect(byString).toHaveLength(1);
  });

  it('neq excludes matches', async () => {
    const { data } = await sb.from('t').select('*').neq('status', 'completed');
    expect(data.map((r: any) => r.id)).toEqual(['2']);
  });

  it('in matches any of the listed values', async () => {
    const { data } = await sb.from('t').select('*').in('id', ['1', '3']);
    expect(data).toHaveLength(2);
  });

  it('gt / gte / lt / lte compare numerically', async () => {
    expect((await sb.from('t').select('*').gt('amount', 100)).data).toHaveLength(1);
    expect((await sb.from('t').select('*').gte('amount', 100)).data).toHaveLength(2);
    expect((await sb.from('t').select('*').lt('amount', 100)).data).toHaveLength(1);
    expect((await sb.from('t').select('*').lte('amount', 100)).data).toHaveLength(2);
  });

  it('like is case-sensitive, ilike is not', async () => {
    expect((await sb.from('t').select('*').like('name', 'Ali%')).data).toHaveLength(1);
    expect((await sb.from('t').select('*').ilike('name', 'ali%')).data).toHaveLength(2);
  });

  it('is(col, null) matches only null/undefined', async () => {
    const { data } = await sb.from('t').select('*').is('branch_id', null);
    expect(data.map((r: any) => r.id)).toEqual(['3']);
  });

  it('not(col, "is", null) matches only non-null — the shape the routes use', async () => {
    const { data } = await sb.from('t').select('*').not('provider_id', 'is', null);
    expect(data.map((r: any) => r.id)).toEqual(['2', '3']);
  });

  it('or() parses PostgREST syntax and matches either leaf', async () => {
    const { data } = await sb.from('t').select('*').or('branch_id.eq.b1,branch_id.is.null');
    expect(data.map((r: any) => r.id)).toEqual(['1', '3']);
  });

  it('multiple filters combine with AND', async () => {
    const { data } = await sb.from('t').select('*').eq('status', 'completed').gte('amount', 100);
    expect(data.map((r: any) => r.id)).toEqual(['1']);
  });

  it('an operator the fake does not implement fails loudly rather than being ignored', () => {
    // The dangerous failure mode is a filter that silently does nothing: the route asks to narrow
    // the result set, the fake ignores it, too many rows come back, and the test still passes. The
    // builder therefore simply has no method for unimplemented operators, so the call throws.
    const builder: any = sb.from('t').select('*');
    expect(builder.contains).toBeUndefined();
    expect(builder.overlaps).toBeUndefined();
    expect(() => builder.contains('tags', ['x'])).toThrow(TypeError);
  });
});

describe('ordering and limit', () => {
  beforeEach(() => {
    fake.seed('t', [{ id: 'b', n: 2 }, { id: 'a', n: 3 }, { id: 'c', n: 1 }]);
  });

  it('orders ascending by default', async () => {
    const { data } = await sb.from('t').select('*').order('n');
    expect(data.map((r: any) => r.n)).toEqual([1, 2, 3]);
  });

  it('orders descending when ascending: false', async () => {
    const { data } = await sb.from('t').select('*').order('n', { ascending: false });
    expect(data.map((r: any) => r.n)).toEqual([3, 2, 1]);
  });

  it('limit truncates after ordering', async () => {
    const { data } = await sb.from('t').select('*').order('n').limit(2);
    expect(data.map((r: any) => r.n)).toEqual([1, 2]);
  });
});

describe('writes', () => {
  it('insert adds rows and generates an id when absent', async () => {
    const { data } = await sb.from('t').insert({ name: 'X' });
    expect(data[0].id).toBeTruthy();
    expect(fake.rows('t')).toHaveLength(1);
  });

  it('update applies only to filtered rows', async () => {
    fake.seed('t', [{ id: '1', status: 'a' }, { id: '2', status: 'a' }]);
    await sb.from('t').update({ status: 'b' }).eq('id', '1');
    expect(fake.rows('t').find((r) => r.id === '1')!.status).toBe('b');
    expect(fake.rows('t').find((r) => r.id === '2')!.status).toBe('a');
  });

  it('delete removes only filtered rows', async () => {
    fake.seed('t', [{ id: '1' }, { id: '2' }]);
    await sb.from('t').delete().eq('id', '1');
    expect(fake.rows('t').map((r) => r.id)).toEqual(['2']);
  });

  it('upsert updates on conflict instead of inserting a duplicate', async () => {
    fake.seed('t', [{ id: '1', provider_id: 'p1', month: '2026-01', total: 10 }]);
    await sb
      .from('t')
      .upsert({ provider_id: 'p1', month: '2026-01', total: 99 }, { onConflict: 'provider_id, month' });
    const rows = fake.rows('t');
    expect(rows).toHaveLength(1);
    expect(rows[0].total).toBe(99);
  });

  it('upsert inserts when there is no conflicting row', async () => {
    fake.seed('t', [{ id: '1', provider_id: 'p1', month: '2026-01' }]);
    await sb.from('t').upsert({ provider_id: 'p2', month: '2026-01' }, { onConflict: 'provider_id, month' });
    expect(fake.rows('t')).toHaveLength(2);
  });

  it('upsert with no onConflict option defaults to the primary key, matching PostgREST', async () => {
    // 28 of the 31 `.upsert()` call sites in src/app/api never pass onConflict — they rely on
    // this default. Without it, every one of those calls would insert a duplicate row here
    // instead of updating the existing one, which is the opposite of what upsert means.
    fake.seed('t', [{ id: 'p1', stock_quantity: 10 }]);
    await sb.from('t').upsert({ id: 'p1', stock_quantity: 7 });
    const rows = fake.rows('t');
    expect(rows).toHaveLength(1);
    expect(rows[0].stock_quantity).toBe(7);
  });

  it('upsert with no onConflict inserts a genuinely new row (no id collision)', async () => {
    fake.seed('t', [{ id: 'p1', stock_quantity: 10 }]);
    await sb.from('t').upsert({ id: 'p2', stock_quantity: 3 });
    expect(fake.rows('t')).toHaveLength(2);
  });

  it('rows returned from a read are copies — mutating them does not corrupt the store', async () => {
    fake.seed('t', [{ id: '1', n: 1 }]);
    const { data } = await sb.from('t').select('*');
    data[0].n = 999;
    expect(fake.rows('t')[0].n).toBe(1);
  });
});

describe('single / maybeSingle', () => {
  it('maybeSingle returns null with no error when nothing matches', async () => {
    fake.seed('t', []);
    const { data, error } = await sb.from('t').select('*').eq('id', 'nope').maybeSingle();
    expect(data).toBeNull();
    expect(error).toBeNull();
  });

  it('single returns an error when nothing matches, as real PostgREST does', async () => {
    fake.seed('t', []);
    const { data, error } = await sb.from('t').select('*').eq('id', 'nope').single();
    expect(data).toBeNull();
    expect(error).toBeTruthy();
  });

  it('single returns the row when exactly one matches', async () => {
    fake.seed('t', [{ id: '1', n: 5 }]);
    const { data, error } = await sb.from('t').select('*').eq('id', '1').single();
    expect(error).toBeNull();
    expect(data.n).toBe(5);
  });
});

describe('reset', () => {
  it('clears every table', async () => {
    fake.seed('t', [{ id: '1' }]);
    fake.reset();
    expect(fake.rows('t')).toHaveLength(0);
  });
});

describe('rpc', () => {
  it('next_invoice_no has a working default: an incrementing sequence', async () => {
    const a = await sb.rpc('next_invoice_no');
    const b = await sb.rpc('next_invoice_no');
    expect(a.error).toBeNull();
    expect(b.data).toBe(a.data + 1);
  });

  it('reset() restarts the next_invoice_no sequence', async () => {
    await sb.rpc('next_invoice_no');
    await sb.rpc('next_invoice_no');
    fake.reset();
    const { data } = await sb.rpc('next_invoice_no');
    expect(data).toBe(1);
  });

  it('an unregistered rpc name throws rather than resolving to undefined', async () => {
    await expect(sb.rpc('some_future_function')).rejects.toThrow(/no handler registered/);
  });

  it('setRpc overrides the default and reset() clears the override', async () => {
    fake.setRpc('next_invoice_no', () => ({ data: 9999, error: null }));
    expect((await sb.rpc('next_invoice_no')).data).toBe(9999);
    fake.reset();
    expect((await sb.rpc('next_invoice_no')).data).toBe(1);
  });
});
