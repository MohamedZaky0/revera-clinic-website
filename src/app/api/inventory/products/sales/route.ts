import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export interface ProductSaleRecord {
  id: string;
  product_id: string;
  product_name: string;
  product_sku?: string;
  customer_id: string;
  customer_name: string;
  customer_mobile: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  created_at: string;
  sold_by?: string;
  payment_method?: string;
  notes?: string;
}

async function getStoredSalesData(): Promise<{ sales: ProductSaleRecord[] }> {
  try {
    // 1. Try querying native Supabase product_sales table first
    const { data: dbSales, error: dbErr } = await supabaseServer
      .from('product_sales')
      .select('*')
      .order('created_at', { ascending: false });

    if (!dbErr && dbSales) {
      return { sales: dbSales as ProductSaleRecord[] };
    }

    // 2. Fallback to page_settings
    const { data, error } = await supabaseServer
      .from('page_settings')
      .select('value')
      .eq('key', 'product_sales_history')
      .maybeSingle();

    if (error || !data || !data.value) {
      const payload = { sales: [] };
      await supabaseServer
        .from('page_settings')
        .upsert({ key: 'product_sales_history', value: payload, updated_at: new Date().toISOString() });
      return payload;
    }
    return data.value;
  } catch (err) {
    console.error('Error fetching product sales history:', err);
    return { sales: [] };
  }
}

async function saveSalesData(payload: { sales: ProductSaleRecord[] }) {
  await supabaseServer
    .from('page_settings')
    .upsert({
      key: 'product_sales_history',
      value: payload,
      updated_at: new Date().toISOString()
    });
}

export async function GET() {
  try {
    const data = await getStoredSalesData();
    return NextResponse.json({ success: true, sales: data.sales || [] });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      product_id,
      product_name,
      product_sku,
      customer_id,
      customer_name,
      customer_mobile,
      quantity,
      unit_price,
      total_amount,
      sold_by,
      payment_method,
      notes
    } = body;

    if (!product_id || !customer_id || !quantity || quantity <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid sale parameters: product_id, customer_id, and positive quantity are required.' },
        { status: 400 }
      );
    }

    const newSalePayload = {
      product_id,
      product_name: product_name || 'Product',
      product_sku: product_sku || '',
      customer_id,
      customer_name: customer_name || 'Customer',
      customer_mobile: customer_mobile || '',
      quantity: Number(quantity),
      unit_price: Number(unit_price || 0),
      total_amount: Number(total_amount || 0),
      sold_by: sold_by || 'Admin/Receptionist',
      payment_method: payment_method || 'Cash',
      notes: notes || '',
      created_at: new Date().toISOString()
    };

    // Try inserting into native Supabase product_sales table first
    const { data: insertedDb, error: dbInsertErr } = await supabaseServer
      .from('product_sales')
      .insert(newSalePayload)
      .select()
      .single();

    if (!dbInsertErr && insertedDb) {
      const allSales = await getStoredSalesData();
      return NextResponse.json({ success: true, sale: insertedDb, sales: allSales.sales });
    }

    // Fallback to page_settings JSON
    const currentData = await getStoredSalesData();
    const newSale: ProductSaleRecord = {
      id: `sale-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      ...newSalePayload
    };

    const updatedSales = [newSale, ...(currentData.sales || [])];
    await saveSalesData({ sales: updatedSales });

    return NextResponse.json({ success: true, sale: newSale, sales: updatedSales });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
