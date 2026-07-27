import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { requireStaffAccess } from '@/lib/access';

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

function mapDbRowToProduct(row: any): ProductItem {
  return {
    id: row.id,
    name: row.name || 'Unnamed Product',
    arabic_name: row.name || '',
    category: row.category || 'General',
    branch_id: null,
    sku: row.sku || '',
    unit: row.unit || 'Piece',
    purchase_price: Number(row.cost_price || 0),
    selling_price: Number(row.price || 0),
    stock_quantity: Number(row.stock_quantity || 0),
    min_reorder_quantity: Number(row.min_stock_alert || 5),
    status: row.status || (Number(row.stock_quantity || 0) <= 0 ? 'Out of Stock' : 'Active'),
    notes: '',
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || new Date().toISOString()
  };
}

function mapProductToDbRow(item: ProductItem) {
  const stockQty = Number(item.stock_quantity || 0);
  return {
    id: item.id,
    name: item.name,
    sku: item.sku || '',
    category: item.category || 'General',
    price: Number(item.selling_price || 0),
    cost_price: Number(item.purchase_price || 0),
    stock_quantity: stockQty,
    min_stock_alert: Number(item.min_reorder_quantity || 5),
    unit: item.unit || 'Piece',
    status: stockQty <= 0 ? 'Out of Stock' : (item.status || 'Active'),
    created_at: item.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

export async function getStoredProductsData(): Promise<{ products: ProductItem[] }> {
  try {
    // 1. Check native Supabase inventory_products table
    const { data: dbProducts, error: dbErr } = await supabaseServer
      .from('inventory_products')
      .select('*')
      .order('created_at', { ascending: false });

    if (!dbErr && dbProducts && dbProducts.length > 0) {
      return { products: dbProducts.map(mapDbRowToProduct) };
    }

    // 2. Fallback to page_settings
    const { data, error } = await supabaseServer
      .from('page_settings')
      .select('value')
      .eq('key', 'inventory_products')
      .maybeSingle();

    let productsList: ProductItem[] = DEFAULT_PRODUCTS;
    if (!error && data && data.value && Array.isArray(data.value.products)) {
      productsList = data.value.products;
    } else {
      await supabaseServer
        .from('page_settings')
        .upsert({ key: 'inventory_products', value: { products: DEFAULT_PRODUCTS }, updated_at: new Date().toISOString() });
    }

    // Attempt to seed native Supabase table with these products
    try {
      const dbRows = productsList.map(mapProductToDbRow);
      await supabaseServer.from('inventory_products').upsert(dbRows);
    } catch (e) {
      console.warn('Seeding inventory_products DB failed silently:', e);
    }

    return { products: productsList };
  } catch (err) {
    console.error('Error fetching inventory products:', err);
    return { products: DEFAULT_PRODUCTS };
  }
}

export async function saveProductsData(payload: { products: ProductItem[] }) {
  // Always save to page_settings fallback
  const { data, error } = await supabaseServer
    .from('page_settings')
    .upsert({
      key: 'inventory_products',
      value: payload,
      updated_at: new Date().toISOString()
    })
    .select();

  if (error) console.error('Error saving to page_settings:', error);

  // Sync to native Supabase inventory_products table
  try {
    if (payload.products && payload.products.length > 0) {
      const dbRows = payload.products.map(mapProductToDbRow);
      await supabaseServer.from('inventory_products').upsert(dbRows);
    }
  } catch (e) {
    console.warn('Syncing to inventory_products DB table failed:', e);
  }

  return data;
}

// Helper to deduct stock when a product is sold or assigned to a customer
export async function deductInventoryStock(productIdOrName: string, quantityToDeduct: number) {
  try {
    const { products } = await getStoredProductsData();
    if (!products || products.length === 0 || !quantityToDeduct || quantityToDeduct <= 0) return;

    const targetIndex = products.findIndex(
      (p) => p.id === productIdOrName || p.name.toLowerCase() === productIdOrName.toLowerCase()
    );

    if (targetIndex >= 0) {
      const target = products[targetIndex];
      const currentStock = Number(target.stock_quantity || 0);
      const newStock = Math.max(0, currentStock - Number(quantityToDeduct));
      const newStatus = newStock <= 0 ? 'Out of Stock' : target.status;

      products[targetIndex] = {
        ...target,
        stock_quantity: newStock,
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      await saveProductsData({ products });
    }
  } catch (err) {
    console.error('Error deducting inventory stock:', err);
  }
}

// Helper to increase stock and refresh cost when a purchase is recorded (task 3B.10).
// Last-cost basis: `purchase_price` is set to the most recently paid unit cost, not a weighted
// average — the simplest model that keeps Cost Price from going stale, appropriate at this scale.
export async function restockInventoryProduct(productId: string, quantityReceived: number, unitCost: number) {
  try {
    if (!quantityReceived || quantityReceived <= 0) return;

    const { products } = await getStoredProductsData();
    if (!products || products.length === 0) return;

    const targetIndex = products.findIndex((p) => p.id === productId);
    if (targetIndex === -1) return;

    const target = products[targetIndex];
    const newStock = Number(target.stock_quantity || 0) + Number(quantityReceived);
    const newStatus = target.status === 'Out of Stock' && newStock > 0 ? 'Active' : target.status;

    products[targetIndex] = {
      ...target,
      stock_quantity: newStock,
      purchase_price: Number.isFinite(unitCost) ? Number(unitCost) : target.purchase_price,
      status: newStatus,
      updated_at: new Date().toISOString()
    };

    await saveProductsData({ products });
  } catch (err) {
    console.error('Error restocking inventory product:', err);
  }
}

export async function GET(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

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
  const access = await requireStaffAccess(req);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

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
  const access = await requireStaffAccess(req);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

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
  const access = await requireStaffAccess(req);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

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

    // Also delete from Supabase table if present
    try {
      await supabaseServer.from('inventory_products').delete().eq('id', id);
    } catch (e) {}

    return NextResponse.json({ success: true, id });
  } catch (err: any) {
    console.error('DELETE /api/inventory/products error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
