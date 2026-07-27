import { NextResponse } from 'next/server';
import { requireAdministratorAccess } from '@/lib/access';
import { supabaseServer } from '@/lib/supabaseServer';
import { monthlyDepreciation, bookValueAfter } from '@/lib/depreciation';

export const dynamic = 'force-dynamic';

const PERIOD_RE = /^\d{4}-\d{2}$/;
const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

function currentPeriod(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

/**
 * Posts one month of straight-line depreciation (task 3.8) for every `active` fixed asset that
 * doesn't already have a `depreciation_entries` row for the target period. Checks for an existing
 * row before inserting — the `UNIQUE (asset_id, period)` constraint (task 3.5) is the backstop,
 * not the primary idempotency mechanism, per the task's own instruction. Safe to call twice for
 * the same period: the second call finds every asset already posted and skips all of them.
 */
export async function POST(req: Request) {
  const access = await requireAdministratorAccess(req);
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });

  try {
    const body = await req.json().catch(() => ({}));
    const period = typeof body?.period === 'string' && PERIOD_RE.test(body.period) ? body.period : currentPeriod();

    const { data: assets, error: assetsError } = await supabaseServer
      .from('fixed_assets')
      .select('*')
      .eq('status', 'active');
    if (assetsError) throw assetsError;

    const assetIds = (assets || []).map((asset: any) => asset.id);

    const [existingResult, latestResult] = await Promise.all([
      assetIds.length
        ? supabaseServer.from('depreciation_entries').select('asset_id').eq('period', period).in('asset_id', assetIds)
        : Promise.resolve({ data: [], error: null }),
      assetIds.length
        ? supabaseServer
            .from('depreciation_entries')
            .select('asset_id, period, book_value_after')
            .in('asset_id', assetIds)
            .order('period', { ascending: false })
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (existingResult.error) throw existingResult.error;
    if (latestResult.error) throw latestResult.error;

    const alreadyPosted = new Set((existingResult.data || []).map((row: any) => row.asset_id));
    const latestByAsset = new Map<string, any>();
    for (const row of latestResult.data || []) {
      if (!latestByAsset.has(row.asset_id)) latestByAsset.set(row.asset_id, row);
    }

    const posted: any[] = [];
    const skipped: any[] = [];

    for (const asset of assets || []) {
      if (alreadyPosted.has(asset.id)) {
        skipped.push({ assetId: asset.id, reason: 'already posted for this period' });
        continue;
      }

      const cost = Number(asset.cost);
      const salvage = Number(asset.salvage_value);
      const priorBookValue = latestByAsset.has(asset.id) ? Number(latestByAsset.get(asset.id).book_value_after) : cost;

      if (priorBookValue <= salvage) {
        if (asset.status !== 'fully_depreciated') {
          await supabaseServer.from('fixed_assets').update({ status: 'fully_depreciated' }).eq('id', asset.id);
        }
        skipped.push({ assetId: asset.id, reason: 'already at salvage value' });
        continue;
      }

      const fullAmount = monthlyDepreciation(cost, salvage, Number(asset.useful_life_months));
      const amount = Math.min(fullAmount, round2(priorBookValue - salvage));
      const accumulated = round2(cost - priorBookValue + amount);
      const newBookValue = bookValueAfter(cost, accumulated, salvage);

      const { data: entry, error: entryError } = await supabaseServer
        .from('depreciation_entries')
        .insert({ asset_id: asset.id, period, amount, book_value_after: newBookValue })
        .select()
        .single();
      if (entryError) throw entryError;

      if (newBookValue <= salvage) {
        await supabaseServer.from('fixed_assets').update({ status: 'fully_depreciated' }).eq('id', asset.id);
      }

      posted.push(entry);
    }

    return NextResponse.json({ period, posted, skipped });
  } catch (error: any) {
    console.error('POST /api/assets/post-depreciation error:', error);
    return NextResponse.json({ error: error.message || 'Unable to post depreciation.' }, { status: 500 });
  }
}
