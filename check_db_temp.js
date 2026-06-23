const fs = require('fs');
const path = require('path');

// Load env variables
const envPath = path.join(__dirname, '.env.local');
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
      console.log("Supabase settings payload size (approx):", Math.round(JSON.stringify(data.value).length / 1024) + " KB");
      
      const slides = data.value.hero?.slides || [];
      console.log("English slides count:", slides.length);
      slides.forEach((slide, idx) => {
        console.log(`  Slide #${idx+1} title: "${slide.heading}"`);
        if (slide.image) {
          console.log(`  Slide #${idx+1} image path/type:`, slide.image.startsWith('data:') ? 'Base64 image' : slide.image);
          console.log(`  Slide #${idx+1} image length:`, slide.image.length);
        }
      });

      const slidesAr = data.value.hero?.slides_ar || [];
      console.log("Arabic slides count:", slidesAr.length);
      slidesAr.forEach((slide, idx) => {
        console.log(`  Arabic Slide #${idx+1} title: "${slide.heading}"`);
        if (slide.image) {
          console.log(`  Arabic Slide #${idx+1} image length:`, slide.image.length);
        }
      });
    } else {
      console.log("No settings in Supabase.");
    }
  } catch (err) {
    console.error("Error checking settings:", err);
  }
}

checkSettings();
