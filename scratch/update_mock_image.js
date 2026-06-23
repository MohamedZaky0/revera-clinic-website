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

async function checkAndUpdate() {
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
      if (!value.aboutPage) {
        value.aboutPage = {};
      }
      value.aboutPage.whatWeDoImage1 = "https://images.unsplash.com/photo-1576091160550-2173dba999ef?q=80&w=600&auto=format&fit=crop";
      value.aboutPage.whatWeDoImage2 = "https://images.unsplash.com/photo-1629909613654-28e377c37b09?q=80&w=600&auto=format&fit=crop";
      
      const { error: saveError } = await supabase
        .from('page_settings')
        .upsert({ key: 'home', value, updated_at: new Date().toISOString() });
        
      if (saveError) {
        console.error("Supabase save error:", saveError);
      } else {
        console.log("Successfully updated whatWeDoImage1 and whatWeDoImage2 in Supabase!");
      }
    } else {
      console.log("No home key row in Supabase.");
    }
  } catch (err) {
    console.error("Error:", err);
  }
}

checkAndUpdate();
