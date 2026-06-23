const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Use the postgres/service role which can manage RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false },
    db: { schema: 'public' },
    global: {
      headers: {
        // Force bypass RLS with service role
        'X-Client-Info': 'supabase-js/2.0.0',
      }
    }
  }
);

async function run() {
  console.log('Attempting to bypass RLS using service role...');

  // The service role SHOULD bypass RLS - let's try with explicit schema
  const { data, error } = await supabase
    .from('branches')
    .insert([
      {
        name_en: 'New Cairo Branch',
        name_ar: '\u0641\u0631\u0639 \u0627\u0644\u0642\u0627\u0647\u0631\u0629 \u0627\u0644\u062c\u062f\u064a\u062f\u0629',
        address_en: 'Tagamoa, New Cairo, Cairo',
        address_ar: '\u0627\u0644\u062a\u062c\u0645\u0639 \u0627\u0644\u062e\u0627\u0645\u0633\u060c \u0627\u0644\u0642\u0627\u0647\u0631\u0629 \u0627\u0644\u062c\u062f\u064a\u062f\u0629\u060c \u0627\u0644\u0642\u0627\u0647\u0631\u0629',
        phone: '+201035595691',
        maps_embed: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3455.240762823598!2d31.451330111694702!3d30.001242420510955!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x145823da15b7dca9%3A0xb388d9b9c32ebce5!2sRevera%20Clinic%20-%20Tagamoa%20Branch!5e0!3m2!1sen!2sit!4v1781634264961!5m2!1sen!2sit',
        maps_link: 'https://maps.app.goo.gl/sXQXDW3A7DdZSRJZ9',
        status: 'active',
        sort_order: 0
      },
      {
        name_en: 'Sheikh Zayed Branch',
        name_ar: '\u0641\u0631\u0639 \u0627\u0644\u0634\u064a\u062e \u0632\u0627\u064a\u062f',
        address_en: 'El Nada Clinics Complex, Sheikh Zayed, Giza',
        address_ar: '\u0645\u062c\u0645\u0639 \u0639\u064a\u0627\u062f\u0627\u062a \u0627\u0644\u0646\u062f\u0649\u060c \u0627\u0644\u0634\u064a\u062e \u0632\u0627\u064a\u062f\u060c \u0627\u0644\u062c\u064a\u0632\u0629',
        phone: '+201023122323',
        maps_embed: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3452.9529642711104!2d30.9335256!3d30.066882699999997!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x145859626e72e263%3A0x148f1e87e5c115c0!2sEl%20nada%20CLINICS%20complex!5e0!3m2!1sen!2sit!4v1781634456678!5m2!1sen!2sit',
        maps_link: 'https://maps.app.goo.gl/7ig2Q9iCY9uszyHq9',
        status: 'active',
        sort_order: 1
      }
    ])
    .select();

  if (error) {
    console.log('Error code:', error.code, '| Message:', error.message);
    console.log('');
    console.log('The branches table has RLS enabled with no INSERT/SELECT policies.');
    console.log('Please run this SQL in your Supabase SQL Editor (whmukkypceuizscpjcdo):');
    console.log('');
    console.log('-- Disable RLS (branches are public data, no auth needed)');
    console.log('ALTER TABLE branches DISABLE ROW LEVEL SECURITY;');
    console.log('');
    console.log('Then re-run this script.');
  } else {
    console.log('SUCCESS! Inserted', data.length, 'branches.');
    data.forEach(b => console.log(' -', b.id, b.name_en));
  }
}

run().catch(console.error);
