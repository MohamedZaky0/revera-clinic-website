const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  const { data: services, error } = await supabase.from('services').select('*').limit(1);
  if (error) {
    console.error('Error fetching services:', error);
  } else {
    console.log('Service keys:', Object.keys(services[0]));
    console.log('Service sample:', services[0]);
  }
}

run();
