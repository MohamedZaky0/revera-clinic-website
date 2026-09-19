import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { requireStaffAccess, hasGranularPermission } from '@/lib/access';

export const dynamic = 'force-dynamic';

export interface UsageLog {
  id: string;
  quantity_used: number;
  used_at: string;
  used_by?: string;
  notes?: string;
  booking_id?: string;
  treatment_area?: string;
  remaining_after?: number;
}

export interface CustomerProductBalance {
  id: string;
  customer_id: string;
  customer_name?: string;
  customer_mobile?: string;
  product_id: string;
  product_name: string;
  product_sku?: string;
  purchased_quantity: number;
  used_quantity: number;
  remaining_quantity: number;
  unit_price?: number;
  total_amount?: number;
  status: 'Active' | 'Depleted';
  is_pulse_product?: boolean;
  created_at: string;
  updated_at: string;
  usage_history: UsageLog[];
}

export async function getStoredBalances(): Promise<{ balances: CustomerProductBalance[] }> {
  try {
    // 1. Try querying native Supabase customer_product_balances table first
    const { data: dbData, error: dbErr } = await supabaseServer
      .from('customer_product_balances')
      .select('*')
      .order('created_at', { ascending: false });

    if (!dbErr && dbData && dbData.length > 0) {
      return { balances: dbData as CustomerProductBalance[] };
    }

    // 2. Fallback to page_settings
    const { data, error } = await supabaseServer
      .from('page_settings')
      .select('value')
      .eq('key', 'customer_product_balances')
      .maybeSingle();

    let balancesList: CustomerProductBalance[] = [];
    if (!error && data && data.value && Array.isArray(data.value.balances)) {
      balancesList = data.value.balances;
    } else {
      await supabaseServer
        .from('page_settings')
        .upsert({ key: 'customer_product_balances', value: { balances: [] }, updated_at: new Date().toISOString() });
    }

    // Seed the native table from page_settings so it becomes the source of truth going forward
    if (balancesList.length > 0) {
      try {
        await supabaseServer.from('customer_product_balances').upsert(balancesList);
      } catch (e) {
        console.warn('Seeding customer_product_balances DB failed silently:', e);
      }
    }

    return { balances: balancesList };
  } catch (err) {
    console.error('Error fetching customer product balances:', err);
    return { balances: [] };
  }
}

export async function saveBalancesData(payload: { balances: CustomerProductBalance[] }) {
  // Always save to page_settings fallback (dual-storage pattern, matches inventory_products)
  await supabaseServer
    .from('page_settings')
    .upsert({
      key: 'customer_product_balances',
      value: payload,
      updated_at: new Date().toISOString()
    });

  // Sync to native Supabase customer_product_balances table
  try {
    if (payload.balances && payload.balances.length > 0) {
      await supabaseServer.from('customer_product_balances').upsert(payload.balances);
    }
  } catch (e) {
    console.warn('Syncing to customer_product_balances DB table failed:', e);
  }
}

// GET: Fetch product balances
export async function GET(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customer_id') || searchParams.get('customerId');

    const data = await getStoredBalances();
    let balances = data.balances || [];

    if (customerId) {
      balances = balances.filter(b => b.customer_id === customerId);
    }

    // Calculate general active pulse balance summary
    const activePulsePurchases = balances.filter(
      (b) => (b.is_pulse_product || b.product_name.toLowerCase().includes('pulse')) && (b.remaining_quantity > 0 || b.status === 'Active')
    );
    const totalActivePulses = activePulsePurchases.reduce((sum, b) => sum + (Number(b.remaining_quantity) || 0), 0);

    return NextResponse.json({
      success: true,
      balances,
      summary: {
        totalActivePulses,
        activePulsePurchasesCount: activePulsePurchases.length
      }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST: Add or purchase product balance for a customer
export async function POST(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  if (!hasGranularPermission(access.access, 'inventory.manage_products') && !hasGranularPermission(access.access, 'customers.edit')) {
    return NextResponse.json({ error: 'You do not have permission to record product sales for patients.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const {
      customer_id,
      customer_name,
      customer_mobile,
      product_id,
      product_name,
      product_sku,
      quantity,
      unit_price,
      total_amount,
      is_pulse_product,
      force_new_record
    } = body;

    if (!customer_id || !product_name || !quantity || quantity <= 0) {
      return NextResponse.json(
        { success: false, error: 'Customer ID, product name, and positive quantity are required.' },
        { status: 400 }
      );
    }

    await upsertCustomerProductBalance({
      customer_id, customer_name, customer_mobile,
      product_id, product_name, product_sku,
      quantity, unit_price, total_amount,
      is_pulse_product,
      force_new_record
    });
    const { balances } = await getStoredBalances();
    return NextResponse.json({ success: true, balances });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * Adds a patient's owned-quantity balance for a product.
 * Laser Pulse Purchases (Type 2) are kept as individual records (Scenario 8 & 9)
 * so FIFO consumption can accurately deplete the oldest purchases first.
 */
export async function upsertCustomerProductBalance(input: {
  customer_id: string;
  customer_name?: string;
  customer_mobile?: string;
  product_id?: string;
  product_name: string;
  product_sku?: string;
  quantity: number;
  unit_price?: number;
  total_amount?: number;
  is_pulse_product?: boolean;
  force_new_record?: boolean;
}): Promise<void> {
  const {
    customer_id, customer_name, customer_mobile,
    product_id, product_name, product_sku,
    quantity, unit_price, total_amount,
    is_pulse_product,
    force_new_record
  } = input;

  const currentData = await getStoredBalances();
  const balances = [...(currentData.balances || [])];

  const isPulse = is_pulse_product ?? product_name.toLowerCase().includes('pulse');
  const now = new Date().toISOString();
  const qtyNum = Number(quantity);

  // For regular retail products (non-pulse), merge if existing active balance exists unless force_new_record is requested.
  // For pulse products (Type 2), keep each purchase as a separate record for FIFO traceability (Scenario 8/9/10).
  const shouldCreateNewRecord = force_new_record || isPulse;

  if (!shouldCreateNewRecord) {
    const existingIndex = balances.findIndex(
      b => b.customer_id === customer_id && (b.product_id === product_id || b.product_name === product_name)
    );

    if (existingIndex >= 0) {
      const existing = balances[existingIndex];
      const newPurchased = Number(existing.purchased_quantity || 0) + qtyNum;
      const newUsed = Number(existing.used_quantity || 0);
      const newRemaining = Math.max(0, newPurchased - newUsed);

      balances[existingIndex] = {
        ...existing,
        purchased_quantity: newPurchased,
        remaining_quantity: newRemaining,
        status: newRemaining > 0 ? 'Active' : 'Depleted',
        updated_at: now,
        unit_price: unit_price !== undefined ? Number(unit_price) : existing.unit_price,
        total_amount: total_amount !== undefined ? Number(total_amount) : existing.total_amount
      };
      await saveBalancesData({ balances });
      return;
    }
  }

  // Create new balance record
  const newBalance: CustomerProductBalance = {
    id: `cpb-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    customer_id,
    customer_name: customer_name || 'Customer',
    customer_mobile: customer_mobile || '',
    product_id: product_id || `prod-${Date.now()}`,
    product_name,
    product_sku: product_sku || '',
    purchased_quantity: qtyNum,
    used_quantity: 0,
    remaining_quantity: qtyNum,
    unit_price: Number(unit_price || 0),
    total_amount: total_amount !== undefined ? Number(total_amount) : (qtyNum * Number(unit_price || 0)),
    status: 'Active',
    is_pulse_product: isPulse,
    created_at: now,
    updated_at: now,
    usage_history: []
  };
  balances.unshift(newBalance);

  await saveBalancesData({ balances });
}

/**
 * FIFO Consumption Engine for Type 2 (Sell by Pulse)
 * Scenarios 10, 11, 12:
 * - Consumes from the oldest active pulse purchase first (Purchase Date ASC).
 * - Spills over into subsequent purchases if usage > oldest purchase remaining.
 * - Rejects with explicit 400 error if requested usage > total active balance (Scenario 12).
 * - Updates remaining quantities and transitions depleted purchases to 'Depleted' (Fully Consumed).
 */
export async function consumePatientPulsesFIFO(input: {
  customer_id: string;
  quantity: number;
  used_by?: string;
  notes?: string;
  booking_id?: string;
  treatment_area?: string;
}): Promise<{
  success: boolean;
  consumed: number;
  remainingGeneralBalance: number;
  affectedPurchases: Array<{ purchase_id: string; deducted: number; remaining_after: number; purchase_name: string }>;
  error?: string;
}> {
  const { customer_id, quantity, used_by, notes, booking_id, treatment_area } = input;
  const qtyToConsume = Math.max(0, parseInt(String(quantity), 10) || 0);

  if (!customer_id) {
    return { success: false, consumed: 0, remainingGeneralBalance: 0, affectedPurchases: [], error: 'Customer ID is required.' };
  }
  if (qtyToConsume <= 0) {
    return { success: false, consumed: 0, remainingGeneralBalance: 0, affectedPurchases: [], error: 'Quantity to consume must be greater than 0.' };
  }

  const currentData = await getStoredBalances();
  const allBalances = [...(currentData.balances || [])];

  // Filter active pulse purchases for this customer
  const customerPulsePurchases = allBalances
    .map((b, originalIndex) => ({ ...b, originalIndex }))
    .filter(
      (b) =>
        b.customer_id === customer_id &&
        (b.is_pulse_product || b.product_name.toLowerCase().includes('pulse')) &&
        Number(b.remaining_quantity || 0) > 0
    );

  const totalAvailable = customerPulsePurchases.reduce((sum, b) => sum + Number(b.remaining_quantity || 0), 0);

  // Scenario 12: Insufficient pulse balance validation
  if (qtyToConsume > totalAvailable) {
    return {
      success: false,
      consumed: 0,
      remainingGeneralBalance: totalAvailable,
      affectedPurchases: [],
      error: `Insufficient pulse balance. Available: ${totalAvailable} pulses, Requested: ${qtyToConsume} pulses.`
    };
  }

  // Sort active purchases by created_at ASC (FIFO - oldest first, Scenario 10)
  customerPulsePurchases.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  let remainingNeeded = qtyToConsume;
  const affected: Array<{ purchase_id: string; deducted: number; remaining_after: number; purchase_name: string }> = [];
  const now = new Date().toISOString();

  for (const purchase of customerPulsePurchases) {
    if (remainingNeeded <= 0) break;

    const availableInThisPurchase = Number(purchase.remaining_quantity || 0);
    const toDeductFromThisPurchase = Math.min(remainingNeeded, availableInThisPurchase);

    const newUsed = Number(purchase.used_quantity || 0) + toDeductFromThisPurchase;
    const newRemaining = Math.max(0, Number(purchase.purchased_quantity || 0) - newUsed);
    const newStatus = newRemaining > 0 ? 'Active' : 'Depleted';

    const usageLog: UsageLog = {
      id: `use-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      quantity_used: toDeductFromThisPurchase,
      used_at: now,
      used_by: used_by || 'Staff',
      notes: notes || '',
      booking_id: booking_id || undefined,
      treatment_area: treatment_area || undefined,
      remaining_after: newRemaining
    };

    allBalances[purchase.originalIndex] = {
      ...allBalances[purchase.originalIndex],
      used_quantity: newUsed,
      remaining_quantity: newRemaining,
      status: newStatus,
      updated_at: now,
      usage_history: [usageLog, ...(allBalances[purchase.originalIndex].usage_history || [])]
    };

    affected.push({
      purchase_id: purchase.id,
      deducted: toDeductFromThisPurchase,
      remaining_after: newRemaining,
      purchase_name: purchase.product_name
    });

    remainingNeeded -= toDeductFromThisPurchase;
  }

  await saveBalancesData({ balances: allBalances });

  const remainingGeneral = totalAvailable - qtyToConsume;
  return {
    success: true,
    consumed: qtyToConsume,
    remainingGeneralBalance: remainingGeneral,
    affectedPurchases: affected
  };
}

// PATCH: Deduct / Consume quantity from patient product balance
export async function PATCH(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  if (!hasGranularPermission(access.access, 'inventory.manage_products') && !hasGranularPermission(access.access, 'customers.edit')) {
    return NextResponse.json({ error: 'You do not have permission to update patient product balances.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { action, customer_id, quantity, quantity_used, balance_id, used_by, notes, booking_id, treatment_area } = body;

    // FIFO Pulse Consumption action (Type 2 Engine)
    if (action === 'fifo_consume' || action === 'consume_pulses') {
      const fifoResult = await consumePatientPulsesFIFO({
        customer_id: customer_id || body.customerId,
        quantity: quantity || quantity_used,
        used_by: used_by || (access.access.user as any)?.name || access.access.user?.email || 'Staff',
        notes,
        booking_id,
        treatment_area
      });

      if (!fifoResult.success) {
        return NextResponse.json({ success: false, error: fifoResult.error }, { status: 400 });
      }

      const { balances } = await getStoredBalances();
      return NextResponse.json({ ...fifoResult, balances });
    }

    // Direct single balance deduction (legacy / manual)
    if (!balance_id || !quantity_used || quantity_used <= 0) {
      return NextResponse.json(
        { success: false, error: 'Balance ID and positive quantity_used are required.' },
        { status: 400 }
      );
    }

    const currentData = await getStoredBalances();
    const balances = [...(currentData.balances || [])];

    const targetIndex = balances.findIndex(b => b.id === balance_id);
    if (targetIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Product balance record not found.' },
        { status: 404 }
      );
    }

    const target = balances[targetIndex];
    const qtyToDeduct = Number(quantity_used);

    if (qtyToDeduct > Number(target.remaining_quantity || 0)) {
      return NextResponse.json(
        {
          success: false,
          error: `Insufficient balance. Available: ${target.remaining_quantity}, Requested: ${qtyToDeduct}.`
        },
        { status: 400 }
      );
    }

    const newUsed = Number(target.used_quantity || 0) + qtyToDeduct;
    const newRemaining = Math.max(0, Number(target.purchased_quantity || 0) - newUsed);

    const now = new Date().toISOString();
    const usageEntry: UsageLog = {
      id: `use-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      quantity_used: qtyToDeduct,
      used_at: now,
      used_by: used_by || 'Staff',
      notes: notes || '',
      booking_id: booking_id || undefined,
      treatment_area: treatment_area || undefined,
      remaining_after: newRemaining
    };

    const updatedHistory = [usageEntry, ...(target.usage_history || [])];

    balances[targetIndex] = {
      ...target,
      used_quantity: newUsed,
      remaining_quantity: newRemaining,
      status: newRemaining > 0 ? 'Active' : 'Depleted',
      updated_at: now,
      usage_history: updatedHistory
    };

    await saveBalancesData({ balances });

    return NextResponse.json({ success: true, updatedBalance: balances[targetIndex], balances });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
