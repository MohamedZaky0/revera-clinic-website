import { config } from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
config({ path: path.resolve(__dirname, '..', '.env.local'), quiet: true });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '', process.env.SUPABASE_SERVICE_ROLE_KEY ?? '', { auth: { persistSession: false } });

async function main() {
  const { data: svc, error: fetchErr } = await supabase
    .from('services')
    .select('*')
    .eq('id', 1)
    .single();
  if (fetchErr) {
    console.error('Fetch error:', fetchErr);
    return;
  }
  console.log('Before:', JSON.stringify(svc.branch_pricing));

  const branchPricing = Array.isArray(svc.branch_pricing) && svc.branch_pricing.length > 0
    ? svc.branch_pricing
    : [{ name: 'Zayed', price: svc.price ?? 0, visible: true, status: true, isDefault: true }];

  const updatedBp = branchPricing.map((bp: any) => ({
    ...bp,
    promotion: { enabled: true, type: 'percentage', value: 20 },
  }));

  const row = {
    id: svc.id,
    en: svc.en,
    ar: svc.ar,
    img: svc.img,
    cat: svc.cat,
    unit: svc.unit,
    price: svc.price,
    sort_order: svc.sort_order,
    duration: svc.duration,
    duration_minutes: svc.duration_minutes ?? 30,
    description_en: svc.description_en,
    description_ar: svc.description_ar,
    is_shared: svc.is_shared,
    enable_reminder: svc.enable_reminder,
    branch_pricing: updatedBp,
    visible: svc.visible !== undefined ? svc.visible : true,
    active: svc.active !== undefined ? svc.active : true,
  };

  const { data: upserted, error: upsertErr } = await supabase
    .from('services')
    .upsert([row])
    .select();

  if (upsertErr) {
    console.error('Upsert error:', upsertErr);
    return;
  }
  console.log('Upsert result branch_pricing:', JSON.stringify(upserted?.[0]?.branch_pricing));

  const { data: refetched, error: refetchErr } = await supabase
    .from('services')
    .select('branch_pricing')
    .eq('id', 1)
    .single();
  if (refetchErr) {
    console.error('Refetch error:', refetchErr);
    return;
  }
  console.log('Refetched from DB:', JSON.stringify(refetched.branch_pricing));
}
main();
