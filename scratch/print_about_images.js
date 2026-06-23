const fs = require('fs');
const path = require('path');

// Load env variables from .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const value = parts.slice(1).join('=').trim();
      process.env[key] = value;
    }
  });
}

const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkSettings() {
  try {
    const { data, error } = await supabase
      .from('page_settings')
      .select('*')
      .eq('key', 'home')
      .maybeSingle();

    if (error) {
      console.error("Supabase query error:", error);
    } else if (data) {
      const about = data.value.about || {};
      console.log("about.image1 length:", about.image1 ? about.image1.length : "empty");
      console.log("about.image1 starts with:", about.image1 ? about.image1.substring(0, 50) + "..." : "empty");
      console.log("about.image2 length:", about.image2 ? about.image2.length : "empty");
      console.log("about.image3 length:", about.image3 ? about.image3.length : "empty");
    }
  } catch (err) {
    console.error("Error checking settings:", err);
  }
}

checkSettings();
