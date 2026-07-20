import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export interface ProductItem {
  id: string;
  name: string;
  arabic_name?: string;
  category: string;
  branch_id?: string | null;
  sku?: string;
  unit: string;
  purchase_price: number;
  selling_price: number;
  stock_quantity: number;
  min_reorder_quantity: number;
  status: 'Active' | 'Inactive' | 'Out of Stock' | 'Discontinued';
  notes?: string;
  created_at: string;
  updated_at: string;
}

const DEFAULT_PRODUCTS: ProductItem[] = [
  {
    id: 'prod-botox-01',
    name: 'Botox Type A (100U)',
    arabic_name: 'بوتوكس 100 وحدة',
    category: 'Injectables',
    branch_id: null,
    sku: 'BOT-100',
    unit: 'Vial',
    purchase_price: 250.00,
    selling_price: 450.00,
    stock_quantity: 42,
    min_reorder_quantity: 10,
    status: 'Active',
    notes: 'Allergan Botox 100 Units vial for facial rejuvenation.',
    created_at: '2026-01-10T08:00:00.000Z',
    updated_at: '2026-07-20T12:00:00.000Z'
  },
  {
    id: 'prod-filler-02',
    name: 'Hyaluronic Acid Filler (1ml)',
    arabic_name: 'فيلر حمض الهيالورونيك 1 مل',
    category: 'Injectables',
    branch_id: null,
    sku: 'HA-FILL-01',
    unit: 'Syringe',
    purchase_price: 180.00,
    selling_price: 350.00,
    stock_quantity: 15,
    min_reorder_quantity: 5,
    status: 'Active',
    notes: 'Premium Juvederm Ultra 1ml syringe.',
    created_at: '2026-01-12T08:00:00.000Z',
    updated_at: '2026-07-20T12:00:00.000Z'
  },
  {
    id: 'prod-cream-03',
    name: 'Hydrating Facial Cream',
    arabic_name: 'كريم ترطيب الوجه العميق',
    category: 'Skincare',
    branch_id: null,
    sku: 'SKIN-CRM-01',
    unit: 'Bottle',
    purchase_price: 220.00,
    selling_price: 450.00,
    stock_quantity: 24,
    min_reorder_quantity: 8,
    status: 'Active',
    notes: 'Revera clinical hydrating moisturizer for post-treatment skin.',
    created_at: '2026-01-15T08:00:00.000Z',
    updated_at: '2026-07-20T12:00:00.000Z'
  },
  {
    id: 'prod-sunscreen-04',
    name: 'Sunscreen SPF 50+',
    arabic_name: 'واقي شمس 50+',
    category: 'Sun Protection',
    branch_id: null,
    sku: 'SUN-50',
    unit: 'Tube',
    purchase_price: 310.00,
    selling_price: 600.00,
    stock_quantity: 12,
    min_reorder_quantity: 5,
    status: 'Active',
    notes: 'Broad spectrum UVA/UVB protection.',
    created_at: '2026-02-01T08:00:00.000Z',
    updated_at: '2026-07-20T12:00:00.000Z'
  },
  {
    id: 'prod-serum-05',
    name: 'Retinol Anti-Aging Serum',
    arabic_name: 'سيروم ريتينول لمقاومة التجاعيد',
    category: 'Serums',
    branch_id: null,
    sku: 'SER-RET-01',
    unit: 'Bottle',
    purchase_price: 480.00,
    selling_price: 850.00,
    stock_quantity: 5,
    min_reorder_quantity: 5,
    status: 'Active',
    notes: 'Concentrated 1% Retinol night serum.',
    created_at: '2026-02-10T08:00:00.000Z',
    updated_at: '2026-07-20T12:00:00.000Z'
  },
  {
    id: 'prod-cleanser-06',
    name: 'Gentle Cleansing Gel',
    arabic_name: 'جل منظف لطيف للبشرة',
    category: 'Skincare',
    branch_id: null,
    sku: 'SKIN-GEL-01',
    unit: 'Bottle',
    purchase_price: 150.00,
    selling_price: 320.00,
    stock_quantity: 0,
    min_reorder_quantity: 10,
    status: 'Out of Stock',
    notes: 'Sulfate-free cleanser for sensitive skin.',
    created_at: '2026-02-15T08:00:00.000Z',
    updated_at: '2026-07-20T12:00:00.000Z'
  }
];

async function getStoredProductsData(): Promise<{ products: ProductItem[] }> {
  try {
    // 1. Check native Supabase inventory_products table if it has rows
    const { data: dbProducts, error: dbErr } = await supabaseServer
      .from('inventory_products')
      .select('*')
      .order('created_at', { ascending: false });

    if (!dbErr && dbProducts && dbProducts.length > 0) {
      return { products: dbProducts as ProductItem[] };
    }

    // 2. Fallback to page_settings
    const { data, error } = await supabaseServer
      .from('page_settings')
      .select('value')
      .eq('key', 'inventory_products')
      .maybeSingle();

    if (error || !data || !data.value || !Array.isArray(data.value.products)) {
      const payload = { products: DEFAULT_PRODUCTS };
      await supabaseServer
        .from('page_settings')
        .upsert({ key: 'inventory_products', value: payload, updated_at: new Date().toISOString() });
      return payload;
    }
    return data.value;
  } catch (err) {
    console.error('Error fetching inventory products settings:', err);
    return { products: DEFAULT_PRODUCTS };
  }
}

async function saveProductsData(payload: { products: ProductItem[] }) {
  const { data, error } = await supabaseServer
    .from('page_settings')
    .upsert({
      key: 'inventory_products',
      value: payload,
      updated_at: new Date().toISOString()
    })
    .select();

  if (error) throw error;

  try {
    if (payload.products && payload.products.length > 0) {
      await supabaseServer.from('inventory_products').upsert(payload.products);
    }
  } catch (e) {
    // Ignore direct table sync failure
  }

  return data;
}

export async function GET() {
  try {
    const data = await getStoredProductsData();
    return NextResponse.json({
      products: data.products || []
    });
  } catch (err: any) {
    console.error('GET /api/inventory/products error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      name,
      arabic_name,
      category,
      branch_id,
      sku,
      unit,
      purchase_price,
      selling_price,
      stock_quantity,
      min_reorder_quantity,
      status,
      notes
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Product name is required.' }, { status: 400 });
    }

    if (purchase_price === undefined || purchase_price === null || isNaN(Number(purchase_price))) {
      return NextResponse.json({ error: 'Valid purchase price is required.' }, { status: 400 });
    }

    if (selling_price === undefined || selling_price === null || isNaN(Number(selling_price))) {
      return NextResponse.json({ error: 'Valid selling price is required.' }, { status: 400 });
    }

    const data = await getStoredProductsData();
    const products = data.products || [];

    const newId = `prod-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const stockQty = Number(stock_quantity) || 0;
    const computedStatus = stockQty === 0 ? 'Out of Stock' : (status || 'Active');

    const newProduct: ProductItem = {
      id: newId,
      name: String(name).trim(),
      arabic_name: arabic_name ? String(arabic_name).trim() : '',
      category: category ? String(category).trim() : 'General',
      branch_id: branch_id || null,
      sku: sku ? String(sku).trim() : `SKU-${Date.now().toString().slice(-5)}`,
      unit: unit ? String(unit).trim() : 'Piece',
      purchase_price: Number(purchase_price),
      selling_price: Number(selling_price),
      stock_quantity: stockQty,
      min_reorder_quantity: Number(min_reorder_quantity) || 5,
      status: computedStatus,
      notes: notes ? String(notes).trim() : '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    products.unshift(newProduct);
    await saveProductsData({ products });

    return NextResponse.json(newProduct, { status: 201 });
  } catch (err: any) {
    console.error('POST /api/inventory/products error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const {
      id,
      name,
      arabic_name,
      category,
      branch_id,
      sku,
      unit,
      purchase_price,
      selling_price,
      stock_quantity,
      min_reorder_quantity,
      status,
      notes
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Product ID is required.' }, { status: 400 });
    }

    const data = await getStoredProductsData();
    let products = data.products || [];
    const index = products.findIndex((p) => p.id === id);

    if (index === -1) {
      return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
    }

    const existing = products[index];
    const newStock = stock_quantity !== undefined ? Number(stock_quantity) : existing.stock_quantity;
    
    let updatedStatus = status !== undefined ? status : existing.status;
    if (newStock === 0 && updatedStatus === 'Active') {
      updatedStatus = 'Out of Stock';
    }

    const updatedProduct: ProductItem = {
      ...existing,
      name: name !== undefined ? String(name).trim() : existing.name,
      arabic_name: arabic_name !== undefined ? String(arabic_name).trim() : existing.arabic_name,
      category: category !== undefined ? String(category).trim() : existing.category,
      branch_id: branch_id !== undefined ? branch_id : existing.branch_id,
      sku: sku !== undefined ? String(sku).trim() : existing.sku,
      unit: unit !== undefined ? String(unit).trim() : existing.unit,
      purchase_price: purchase_price !== undefined ? Number(purchase_price) : existing.purchase_price,
      selling_price: selling_price !== undefined ? Number(selling_price) : existing.selling_price,
      stock_quantity: newStock,
      min_reorder_quantity: min_reorder_quantity !== undefined ? Number(min_reorder_quantity) : existing.min_reorder_quantity,
      status: updatedStatus,
      notes: notes !== undefined ? String(notes).trim() : existing.notes,
      updated_at: new Date().toISOString()
    };

    products[index] = updatedProduct;
    await saveProductsData({ products });

    return NextResponse.json(updatedProduct);
  } catch (err: any) {
    console.error('PUT /api/inventory/products error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Product ID is required.' }, { status: 400 });
    }

    const data = await getStoredProductsData();
    let products = data.products || [];
    const filtered = products.filter((p) => p.id !== id);

    await saveProductsData({ products: filtered });
    return NextResponse.json({ success: true, id });
  } catch (err: any) {
    console.error('DELETE /api/inventory/products error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
