-- Supabase SQL Schema for Inventory (Products, Sales, Devices, Maintenance)

-- 1. Inventory Products Table
CREATE TABLE IF NOT EXISTS public.inventory_products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    sku TEXT,
    category TEXT,
    price NUMERIC DEFAULT 0,
    cost_price NUMERIC DEFAULT 0,
    stock_quantity INTEGER DEFAULT 0,
    min_stock_alert INTEGER DEFAULT 5,
    unit TEXT DEFAULT 'pcs',
    status TEXT DEFAULT 'In Stock',
    branch_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Product Sales History Table
CREATE TABLE IF NOT EXISTS public.product_sales (
    id TEXT PRIMARY KEY,
    product_id TEXT REFERENCES public.inventory_products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    sku TEXT,
    quantity INTEGER DEFAULT 1,
    unit_price NUMERIC DEFAULT 0,
    total_price NUMERIC DEFAULT 0,
    customer_name TEXT,
    customer_phone TEXT,
    customer_email TEXT,
    cashier_name TEXT,
    branch_name TEXT,
    payment_method TEXT DEFAULT 'Cash',
    notes TEXT,
    sale_date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Inventory Devices Table (Laser & Medical Equipment)
CREATE TABLE IF NOT EXISTS public.inventory_devices (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    serial_number TEXT,
    model TEXT,
    branch_name TEXT,
    status TEXT DEFAULT 'Active',
    total_pulses INTEGER DEFAULT 0,
    remaining_pulses INTEGER DEFAULT 0,
    max_pulses_limit INTEGER DEFAULT 0,
    last_maintenance_date TIMESTAMPTZ,
    next_maintenance_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Device Maintenance & Pulse Reset History Table
CREATE TABLE IF NOT EXISTS public.device_maintenance_history (
    id TEXT PRIMARY KEY,
    device_id TEXT REFERENCES public.inventory_devices(id) ON DELETE CASCADE,
    device_name TEXT NOT NULL,
    type TEXT DEFAULT 'Pulse Reset',
    pulses_added INTEGER DEFAULT 0,
    notes TEXT,
    performed_by TEXT,
    date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS Policies (Allow all authenticated/anon for simplicity if using service role)
ALTER TABLE public.inventory_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_maintenance_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to inventory_products" ON public.inventory_products FOR ALL USING (true);
CREATE POLICY "Allow all access to product_sales" ON public.product_sales FOR ALL USING (true);
CREATE POLICY "Allow all access to inventory_devices" ON public.inventory_devices FOR ALL USING (true);
CREATE POLICY "Allow all access to device_maintenance_history" ON public.device_maintenance_history FOR ALL USING (true);
