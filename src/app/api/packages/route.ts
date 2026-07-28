import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { requireStaffAccess } from '@/lib/access';

export const dynamic = 'force-dynamic';

type PackageApiItem = {
  id?: string;
  serviceId: number;
  qty: number;
};

type PackageApiPayload = {
  id?: string;
  name: string;
  branchId?: string | null;
  price: number;
  taxRate: number;
  validityDays: number;
  onExpiry: 'recognise_revenue' | 'extend';
  extensionDays: number;
  active: boolean;
  items: PackageApiItem[];
};

function mapDbPackage(row: any) {
  return {
    id: row.id,
    name: row.name,
    branchId: row.branch_id,
    price: row.price !== null ? Number(row.price) : 0,
    taxRate: row.tax_rate !== null ? Number(row.tax_rate) : 0,
    validityDays: row.validity_days !== null ? Number(row.validity_days) : 0,
    onExpiry: row.on_expiry || 'recognise_revenue',
    extensionDays: row.extension_days !== null ? Number(row.extension_days) : 0,
    active: row.active === true,
    items: [] as { id?: string; serviceId: number; serviceName?: string; qty: number }[],
  };
}

function validatePackagePayload(body: any): { error?: string; data?: PackageApiPayload } {
  if (!body || typeof body !== 'object') return { error: 'Invalid request body.' };

  const { name, branchId, price, taxRate, validityDays, onExpiry, extensionDays, active, items } = body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return { error: 'Package name is required.' };
  }

  const parsedPrice = Number(price);
  const parsedTaxRate = Number(taxRate ?? 0);
  const parsedValidityDays = Number(validityDays ?? 0);
  const parsedExtensionDays = Number(extensionDays ?? 0);

  if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
    return { error: 'Price must be a non-negative number.' };
  }
  if (!Number.isFinite(parsedTaxRate) || parsedTaxRate < 0) {
    return { error: 'Tax rate must be a non-negative number.' };
  }
  if (!Number.isInteger(parsedValidityDays) || parsedValidityDays < 0) {
    return { error: 'Validity days must be a non-negative integer.' };
  }
  if (!Number.isInteger(parsedExtensionDays) || parsedExtensionDays < 0) {
    return { error: 'Extension days must be a non-negative integer.' };
  }
  if (onExpiry !== 'recognise_revenue' && onExpiry !== 'extend') {
    return { error: 'onExpiry must be either "recognise_revenue" or "extend".' };
  }

  const itemList = Array.isArray(items) ? items : [];
  if (itemList.length === 0) {
    return { error: 'Package must include at least one service item.' };
  }

  const mappedItems: PackageApiItem[] = [];
  for (const item of itemList) {
    const serviceId = Number(item.serviceId ?? item.service_id);
    const qty = Number(item.qty ?? item.quantity);
    if (!Number.isFinite(serviceId) || serviceId <= 0) {
      return { error: 'Each item must reference a valid service.' };
    }
    if (!Number.isInteger(qty) || qty <= 0) {
      return { error: 'Each item quantity must be a positive integer.' };
    }
    mappedItems.push({ id: item.id, serviceId, qty });
  }

  return {
    data: {
      name: name.trim(),
      branchId: branchId || null,
      price: parsedPrice,
      taxRate: parsedTaxRate,
      validityDays: parsedValidityDays,
      onExpiry,
      extensionDays: parsedExtensionDays,
      active: active === true,
      items: mappedItems,
    },
  };
}

export async function GET(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const [{ data: packages, error: packagesError }, { data: packageItems, error: itemsError }, { data: services, error: servicesError }] = await Promise.all([
      supabaseServer.from('packages').select('*').order('name', { ascending: true }),
      supabaseServer.from('package_items').select('*'),
      supabaseServer.from('services').select('id, en'),
    ]);

    if (packagesError) throw packagesError;
    if (itemsError) throw itemsError;

    const serviceNameMap = new Map<number, string>();
    (services || []).forEach((s: any) => serviceNameMap.set(Number(s.id), s.en));

    const mappedPackages = (packages || []).map(mapDbPackage);
    const itemsByPackage = new Map<string, typeof mappedPackages[0]['items']>();

    for (const pkg of mappedPackages) {
      itemsByPackage.set(pkg.id, pkg.items);
    }

    for (const item of packageItems || []) {
      const pkgId = String(item.package_id);
      const list = itemsByPackage.get(pkgId);
      if (list) {
        list.push({
          id: item.id,
          serviceId: Number(item.service_id),
          serviceName: serviceNameMap.get(Number(item.service_id)) || undefined,
          qty: Number(item.qty),
        });
      }
    }

    return NextResponse.json(mappedPackages);
  } catch (err: any) {
    console.error('GET /api/packages error:', err);
    return NextResponse.json({ error: err.message || 'Database error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const body = await req.json();
    const validation = validatePackagePayload(body);
    if (validation.error) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const payload = validation.data!;

    const { data: pkg, error: pkgError } = await supabaseServer
      .from('packages')
      .insert({
        name: payload.name,
        branch_id: payload.branchId || null,
        price: payload.price,
        tax_rate: payload.taxRate,
        validity_days: payload.validityDays,
        on_expiry: payload.onExpiry,
        extension_days: payload.extensionDays,
        active: payload.active,
      })
      .select('*')
      .single();

    if (pkgError) throw pkgError;

    const packageId = pkg.id;
    const itemRows = payload.items.map((item) => ({
      package_id: packageId,
      service_id: item.serviceId,
      qty: item.qty,
    }));

    const { data: insertedItems, error: itemsError } = await supabaseServer
      .from('package_items')
      .insert(itemRows)
      .select('*');

    if (itemsError) throw itemsError;

    const result = mapDbPackage(pkg);
    result.items = (insertedItems || []).map((item: any) => ({
      id: item.id,
      serviceId: Number(item.service_id),
      qty: Number(item.qty),
    }));

    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    console.error('POST /api/packages error:', err);
    return NextResponse.json({ error: err.message || 'Database error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const body = await req.json();
    const { id } = body;
    if (!id) {
      return NextResponse.json({ error: 'Package ID is required.' }, { status: 400 });
    }

    const validation = validatePackagePayload(body);
    if (validation.error) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const payload = validation.data!;

    const { data: pkg, error: pkgError } = await supabaseServer
      .from('packages')
      .update({
        name: payload.name,
        branch_id: payload.branchId || null,
        price: payload.price,
        tax_rate: payload.taxRate,
        validity_days: payload.validityDays,
        on_expiry: payload.onExpiry,
        extension_days: payload.extensionDays,
        active: payload.active,
      })
      .eq('id', id)
      .select('*')
      .single();

    if (pkgError) throw pkgError;
    if (!pkg) {
      return NextResponse.json({ error: 'Package not found.' }, { status: 404 });
    }

    const packageId = pkg.id;

    if (Array.isArray(body.items)) {
      const { error: deleteItemsError } = await supabaseServer.from('package_items').delete().eq('package_id', packageId);
      if (deleteItemsError) throw deleteItemsError;

      const itemRows = payload.items.map((item) => ({
        package_id: packageId,
        service_id: item.serviceId,
        qty: item.qty,
      }));

      const { data: insertedItems, error: itemsError } = await supabaseServer
        .from('package_items')
        .insert(itemRows)
        .select('*');

      if (itemsError) throw itemsError;

      const result = mapDbPackage(pkg);
      result.items = (insertedItems || []).map((item: any) => ({
        id: item.id,
        serviceId: Number(item.service_id),
        qty: Number(item.qty),
      }));

      return NextResponse.json(result);
    }

    const { data: existingItems, error: existingItemsError } = await supabaseServer
      .from('package_items')
      .select('*')
      .eq('package_id', packageId);

    if (existingItemsError) throw existingItemsError;

    const result = mapDbPackage(pkg);
    result.items = (existingItems || []).map((item: any) => ({
      id: item.id,
      serviceId: Number(item.service_id),
      qty: Number(item.qty),
    }));

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('PATCH /api/packages error:', err);
    return NextResponse.json({ error: err.message || 'Database error' }, { status: 500 });
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
      return NextResponse.json({ error: 'Package ID is required.' }, { status: 400 });
    }

    const { data: referencing, error: refError } = await supabaseServer
      .from('customer_packages')
      .select('id')
      .eq('package_id', id)
      .limit(1);
    if (refError) throw refError;
    if (referencing && referencing.length > 0) {
      return NextResponse.json(
        { error: 'This package has already been sold to customers and cannot be deleted. Mark it inactive instead.' },
        { status: 409 }
      );
    }

    const { error: deleteItemsError } = await supabaseServer.from('package_items').delete().eq('package_id', id);
    if (deleteItemsError) throw deleteItemsError;

    const { error: deletePkgError } = await supabaseServer.from('packages').delete().eq('id', id);
    if (deletePkgError) throw deletePkgError;

    return NextResponse.json({ message: 'Package deleted successfully.' });
  } catch (err: any) {
    console.error('DELETE /api/packages error:', err);
    return NextResponse.json({ error: err.message || 'Database error' }, { status: 500 });
  }
}
