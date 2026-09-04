import { NextResponse } from 'next/server';
import { requireStaffAccess, requireAdministratorAccess } from '@/lib/access';
import { supabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

const CATEGORY_VALUES = ['furniture', 'medical_device', 'it', 'leasehold_improvement'];
const STATUS_VALUES = ['active', 'disposed', 'fully_depreciated'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * GET is staff-readable; every mutation (POST/PATCH/DELETE) requires an administrator. Assets are
 * infrequent, high-stakes capital records — a wrong entry silently skews every depreciation
 * posting and P&L figure downstream — so this route follows the administrator-only branch of the
 * latitude task 3.11 explicitly offers, unlike expenses (task 3.10), which is staff-triggerable.
 */
export async function GET(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });

  try {
    const url = new URL(req.url);
    const branchId = url.searchParams.get('branchId');
    const category = url.searchParams.get('category');
    const status = url.searchParams.get('status');

    let query = supabaseServer.from('fixed_assets').select('*').order('purchased_on', { ascending: false });
    if (branchId) query = query.eq('branch_id', branchId);
    if (category) query = query.eq('category', category);
    if (status) query = query.eq('status', status);

    const { data: assets, error } = await query;
    if (error) throw error;

    const assetIds = (assets || []).map((asset: any) => asset.id);
    const latestByAsset = new Map<string, any>();
    if (assetIds.length > 0) {
      const { data: entries, error: entriesError } = await supabaseServer
        .from('depreciation_entries')
        .select('asset_id, period, book_value_after')
        .in('asset_id', assetIds)
        .order('period', { ascending: false });
      if (entriesError) throw entriesError;
      for (const entry of entries || []) {
        if (!latestByAsset.has(entry.asset_id)) latestByAsset.set(entry.asset_id, entry);
      }
    }

    const mapped = (assets || []).map((asset: any) => ({
      ...asset,
      current_book_value: latestByAsset.has(asset.id)
        ? Number(latestByAsset.get(asset.id).book_value_after)
        : Number(asset.cost),
    }));

    return NextResponse.json(mapped);
  } catch (error: any) {
    console.error('GET /api/assets error:', error);
    return NextResponse.json({ error: error.message || 'Unable to load fixed assets.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const access = await requireAdministratorAccess(req);
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });

  try {
    const { branchId, category, name, purchasedOn, cost, usefulLifeMonths, salvageValue, deviceId, isOpening } = await req.json();

    if (!CATEGORY_VALUES.includes(category)) {
      return NextResponse.json({ error: `category must be one of: ${CATEGORY_VALUES.join(', ')}.` }, { status: 400 });
    }
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'name is required.' }, { status: 400 });
    }
    if (typeof purchasedOn !== 'string' || !DATE_RE.test(purchasedOn) || Number.isNaN(new Date(purchasedOn).getTime())) {
      return NextResponse.json({ error: "purchasedOn must be a valid 'YYYY-MM-DD' date." }, { status: 400 });
    }
    const costNum = Number(cost);
    if (!Number.isFinite(costNum) || costNum < 0) {
      return NextResponse.json({ error: 'cost must be a number >= 0.' }, { status: 400 });
    }
    const lifeNum = Number(usefulLifeMonths);
    if (!Number.isFinite(lifeNum) || lifeNum <= 0) {
      return NextResponse.json({ error: 'usefulLifeMonths must be a positive number.' }, { status: 400 });
    }
    const salvageNum = salvageValue !== undefined ? Number(salvageValue) : 0;
    if (!Number.isFinite(salvageNum) || salvageNum < 0) {
      return NextResponse.json({ error: 'salvageValue must be a number >= 0.' }, { status: 400 });
    }
    if (salvageNum > costNum) {
      return NextResponse.json({ error: 'salvageValue cannot exceed cost.' }, { status: 400 });
    }

    const [branchResult, deviceResult] = await Promise.all([
      branchId
        ? supabaseServer.from('branches').select('id').eq('id', branchId).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      deviceId
        ? supabaseServer.from('inventory_devices').select('id').eq('id', deviceId).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);
    if (branchResult.error) throw branchResult.error;
    if (branchId && !branchResult.data) return NextResponse.json({ error: 'Branch not found.' }, { status: 404 });
    if (deviceResult.error) throw deviceResult.error;
    if (deviceId && !deviceResult.data) return NextResponse.json({ error: 'Device not found.' }, { status: 404 });

    const { data, error } = await supabaseServer
      .from('fixed_assets')
      .insert({
        branch_id: branchId || null,
        category,
        name: name.trim(),
        purchased_on: purchasedOn,
        cost: costNum,
        useful_life_months: lifeNum,
        salvage_value: salvageNum,
        device_id: deviceId || null,
        is_opening: Boolean(isOpening),
      })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/assets error:', error);
    return NextResponse.json({ error: error.message || 'Unable to create fixed asset.' }, { status: 500 });
  }
}

/**
 * Deliberately does not allow editing `cost` / `usefulLifeMonths` / `salvageValue` after creation:
 * every already-posted `depreciation_entries` row for this asset was computed from those values,
 * and silently changing them would make historical postings inconsistent with the asset's current
 * definition. Only branch, name, status and the linked device are mutable; correct a cost-basis
 * mistake by deleting and recreating the asset instead.
 */
export async function PATCH(req: Request) {
  const access = await requireAdministratorAccess(req);
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id query param is required.' }, { status: 400 });

  try {
    const { branchId, name, status, deviceId } = await req.json();
    const updates: Record<string, any> = {};

    if (branchId !== undefined) {
      if (branchId) {
        const { data: branch, error: branchError } = await supabaseServer
          .from('branches')
          .select('id')
          .eq('id', branchId)
          .maybeSingle();
        if (branchError) throw branchError;
        if (!branch) return NextResponse.json({ error: 'Branch not found.' }, { status: 404 });
      }
      updates.branch_id = branchId || null;
    }
    if (name !== undefined) {
      if (!name || typeof name !== 'string') {
        return NextResponse.json({ error: 'name must be a non-empty string.' }, { status: 400 });
      }
      updates.name = name.trim();
    }
    if (status !== undefined) {
      if (!STATUS_VALUES.includes(status)) {
        return NextResponse.json({ error: `status must be one of: ${STATUS_VALUES.join(', ')}.` }, { status: 400 });
      }
      updates.status = status;
    }
    if (deviceId !== undefined) {
      if (deviceId) {
        const { data: device, error: deviceError } = await supabaseServer
          .from('inventory_devices')
          .select('id')
          .eq('id', deviceId)
          .maybeSingle();
        if (deviceError) throw deviceError;
        if (!device) return NextResponse.json({ error: 'Device not found.' }, { status: 404 });
      }
      updates.device_id = deviceId || null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update.' }, { status: 400 });
    }

    const { data, error } = await supabaseServer
      .from('fixed_assets')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Fixed asset not found.' }, { status: 404 });
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('PATCH /api/assets error:', error);
    return NextResponse.json({ error: error.message || 'Unable to update fixed asset.' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const access = await requireAdministratorAccess(req);
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id query param is required.' }, { status: 400 });

  try {
    const { data, error } = await supabaseServer.from('fixed_assets').delete().eq('id', id).select();
    if (error) throw error;
    if (!data || data.length === 0) return NextResponse.json({ error: 'Fixed asset not found.' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE /api/assets error:', error);
    return NextResponse.json({ error: error.message || 'Unable to delete fixed asset.' }, { status: 500 });
  }
}
