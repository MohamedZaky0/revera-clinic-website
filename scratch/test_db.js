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
      console.log("Supabase settings key:", data.key);
      console.log("Keys in data.value:", Object.keys(data.value));
      if (data.value.hero) console.log("Hero keys:", Object.keys(data.value.hero));
      if (data.value.about) console.log("About keys:", Object.keys(data.value.about));
      if (data.value.results) console.log("Results keys:", Object.keys(data.value.results));
      if (data.value.aboutPage) {
        console.log("aboutPage keys:", Object.keys(data.value.aboutPage));
      } else {
        console.log("aboutPage key is NOT present in Supabase.");
      }
    } else {
      console.log("No settings in Supabase.");
    }
  } catch (err) {
    console.error("Error checking settings:", err);
  }
}

checkSettings();
