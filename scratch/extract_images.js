const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const jsonPath = path.join(__dirname, '../data/page_settings.json');
const uploadsDir = path.join(__dirname, '../public/uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

let data;
try {
  data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
} catch (err) {
  console.error("Error reading JSON:", err);
  process.exit(1);
}

let imagesExtracted = 0;

function walkAndExtract(obj) {
  for (let key in obj) {
    if (typeof obj[key] === 'string' && obj[key].startsWith('data:image/')) {
      const match = obj[key].match(/^data:image\/(png|jpeg|jpg|gif|webp);base64,(.+)$/);
      if (match) {
        const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
        const base64Data = match[2];
        const filename = `img_${Date.now()}_${Math.floor(Math.random()*1000)}.${ext}`;
        const filePath = path.join(uploadsDir, filename);
        
        fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
        console.log(`Extracted ${key} to /uploads/${filename}`);
        
        obj[key] = `/uploads/${filename}`;
        imagesExtracted++;
      }
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      walkAndExtract(obj[key]);
    }
  }
}

walkAndExtract(data);

console.log(`Total images extracted: ${imagesExtracted}`);

async function saveToDB() {
  console.log("Saving back to Supabase...");
  const { error } = await supabase
    .from('page_settings')
    .upsert({ key: 'home', value: data, updated_at: new Date().toISOString() });
    
  if (error) {
    console.error("Failed to save to Supabase:", error);
  } else {
    console.log("Successfully saved to Supabase!");
    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
    console.log("Updated local page_settings.json");
  }
}

saveToDB();
