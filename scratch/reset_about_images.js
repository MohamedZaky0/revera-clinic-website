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

async function resetImages() {
  try {
    const { data, error } = await supabase
      .from('page_settings')
      .select('*')
      .eq('key', 'home')
      .maybeSingle();

    if (error) {
      console.error("Supabase load error:", error);
      return;
    }
    
    if (data) {
      const value = data.value;
      
      console.log("Current About Image 1 length:", value.about?.image1 ? value.about.image1.length : "empty");
      console.log("Current About Image 2 length:", value.about?.image2 ? value.about.image2.length : "empty");
      console.log("Current About Image 3 length:", value.about?.image3 ? value.about.image3.length : "empty");
      
      // Reset the three huge images to empty strings to trigger local asset fallback
      if (value.about) {
        value.about.image1 = "";
        value.about.image2 = "";
        value.about.image3 = "";
      }
      
      console.log("Saving slimmed payload to Supabase...");
      const start = Date.now();
      const { error: saveError } = await supabase
        .from('page_settings')
        .upsert({ key: 'home', value, updated_at: new Date().toISOString() });
        
      if (saveError) {
        console.error("Supabase reset save error:", saveError);
      } else {
        console.log(`Successfully reset images in Supabase in ${Date.now() - start}ms!`);
      }
    } else {
      console.log("No home settings row found.");
    }
  } catch (err) {
    console.error("Error:", err);
  }
}

resetImages();
