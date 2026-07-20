import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export interface UsageLog {
  id: string;
  quantity_used: number;
  used_at: string;
  used_by?: string;
  notes?: string;
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
  created_at: string;
  updated_at: string;
  usage_history: UsageLog[];
}

async function getStoredBalances(): Promise<{ balances: CustomerProductBalance[] }> {
  try {
    // 1. Try querying native Supabase customer_product_balances table first
    const { data: dbData, error: dbErr } = await supabaseServer
      .from('customer_product_balances')
      .select('*')
      .order('created_at', { ascending: false });

    if (!dbErr && dbData) {
      return { balances: dbData as CustomerProductBalance[] };
    }

    // 2. Fallback to page_settings
    const { data, error } = await supabaseServer
      .from('page_settings')
      .select('value')
      .eq('key', 'customer_product_balances')
      .maybeSingle();

    if (error || !data || !data.value) {
      const payload = { balances: [] };
      await supabaseServer
        .from('page_settings')
        .upsert({ key: 'customer_product_balances', value: payload, updated_at: new Date().toISOString() });
      return payload;
    }
    return data.value;
  } catch (err) {
    console.error('Error fetching customer product balances:', err);
    return { balances: [] };
  }
}

async function saveBalancesData(payload: { balances: CustomerProductBalance[] }) {
  await supabaseServer
    .from('page_settings')
    .upsert({
      key: 'customer_product_balances',
      value: payload,
      updated_at: new Date().toISOString()
    });
}

// GET: Fetch product balances
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customer_id');

    const data = await getStoredBalances();
    let balances = data.balances || [];

    if (customerId) {
      balances = balances.filter(b => b.customer_id === customerId);
    }

    return NextResponse.json({ success: true, balances });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST: Add or purchase product balance for a customer
export async function POST(req: Request) {
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
      total_amount
    } = body;

    if (!customer_id || !product_name || !quantity || quantity <= 0) {
      return NextResponse.json(
        { success: false, error: 'Customer ID, product name, and positive quantity are required.' },
        { status: 400 }
      );
    }

    const currentData = await getStoredBalances();
    let balances = [...(currentData.balances || [])];

    // Check if an existing balance for customer + product_id/product_name exists
    const existingIndex = balances.findIndex(
      b => b.customer_id === customer_id && (b.product_id === product_id || b.product_name === product_name)
    );

    const now = new Date().toISOString();
    const qtyNum = Number(quantity);

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
    } else {
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
        total_amount: Number(total_amount || 0),
        status: 'Active',
        created_at: now,
        updated_at: now,
        usage_history: []
      };
      balances.unshift(newBalance);
    }

    await saveBalancesData({ balances });

    return NextResponse.json({ success: true, balances });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// PATCH: Deduct / Consume quantity from patient product balance
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { balance_id, quantity_used, used_by, notes } = body;

    if (!balance_id || !quantity_used || quantity_used <= 0) {
      return NextResponse.json(
        { success: false, error: 'Balance ID and positive quantity_used are required.' },
        { status: 400 }
      );
    }

    const currentData = await getStoredBalances();
    let balances = [...(currentData.balances || [])];

    const targetIndex = balances.findIndex(b => b.id === balance_id);
    if (targetIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Product balance record not found.' },
        { status: 404 }
      );
    }

    const target = balances[targetIndex];
    const qtyToDeduct = Number(quantity_used);
    const newUsed = Number(target.used_quantity || 0) + qtyToDeduct;
    const newRemaining = Math.max(0, Number(target.purchased_quantity || 0) - newUsed);

    const now = new Date().toISOString();
    const usageEntry: UsageLog = {
      id: `use-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      quantity_used: qtyToDeduct,
      used_at: now,
      used_by: used_by || 'Staff',
      notes: notes || ''
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
