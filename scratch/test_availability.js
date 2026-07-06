const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

console.log('supabaseUrl:', supabaseUrl);
console.log('serviceRoleKey:', serviceRoleKey ? 'PRESENT' : 'MISSING');

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing environment variables. Make sure to run with --env-file=.env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  try {
    // 1. Fetch branches
    const { data: branches, error: bErr } = await supabase.from('branches').select('*');
    console.log('\n--- BRANCHES ---');
    console.log(bErr ? 'Error: ' + bErr.message : branches);

    // 2. Fetch rooms
    const { data: rooms, error: rErr } = await supabase.from('rooms').select('*');
    console.log('\n--- ROOMS ---');
    console.log(rErr ? 'Error: ' + rErr.message : rooms);

    // 3. Fetch service_rooms mapping
    const { data: serviceRooms, error: srErr } = await supabase.from('service_rooms').select('*');
    console.log('\n--- SERVICE ROOMS COMPATIBILITY MAPPINGS ---');
    console.log(srErr ? 'Error: ' + srErr.message : serviceRooms);

    // 4. Fetch service hours from page_settings
    const { data: pageSettings, error: pErr } = await supabase
      .from('page_settings')
      .select('value')
      .eq('key', 'home')
      .maybeSingle();
    console.log('\n--- SERVICE HOURS ---');
    if (pErr) {
      console.log('Error: ' + pErr.message);
    } else {
      console.log(pageSettings?.value?.footer?.serviceHours);
    }

    // 5. Fetch all services
    const { data: services, error: sErr } = await supabase.from('services').select('id, name_en');
    console.log('\n--- SERVICES ---');
    console.log(sErr ? 'Error: ' + sErr.message : services);

  } catch (err) {
    console.error('Unhandled error:', err);
  }
}

run();
