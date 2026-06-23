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

async function testLargeSave() {
  try {
    // Load current values
    const { data: current, error: loadError } = await supabase
      .from('page_settings')
      .select('*')
      .eq('key', 'home')
      .maybeSingle();

    if (loadError) {
      console.error("Load error:", loadError);
      return;
    }

    const payload = current ? current.value : {};
    
    // Generate a 2.5MB string to simulate a larger compressed base64 image
    const largeStr = "data:image/jpeg;base64," + "A".repeat(2.5 * 1024 * 1024);
    
    if (!payload.aboutPage) payload.aboutPage = {};
    payload.aboutPage.whatWeDoImage1 = largeStr;

    console.log("Attempting to save 2.5MB payload to Supabase...");
    const start = Date.now();
    const { error: saveError } = await supabase
      .from('page_settings')
      .upsert({ key: 'home', value: payload, updated_at: new Date().toISOString() });

    const duration = Date.now() - start;
    if (saveError) {
      console.error(`Save failed after ${duration}ms:`, saveError);
    } else {
      console.log(`Save succeeded after ${duration}ms!`);
    }
  } catch (err) {
    console.error("Error:", err);
  }
}

testLargeSave();
