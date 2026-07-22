/**
 * Revera Clinics — Database Cloner
 * 
 * This script copies data from your source database (production)
 * to your new development database.
 */

const { createClient } = require('@supabase/supabase-js');

// === CONFIGURATION ===
const SOURCE_SUPABASE_URL = 'https://whmukkypceuizscpjcdo.supabase.co';
const SOURCE_SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndobXVra3lwY2V1aXpzY3BqY2RvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTgwMzkzMSwiZXhwIjoyMDk3Mzc5OTMxfQ.vdshWXW59mQ00NhY5pAgLOPC65PeCd1XUnuXXpgFMoI';

const TARGET_SUPABASE_URL = 'https://ikbmnkjikxduwsyjxsqn.supabase.co';
const TARGET_SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlrYm1ua2ppa3hkdXdzeWp4c3FuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzAwMzY3OCwiZXhwIjoyMDk4NTc5Njc4fQ.beDNU5FSx9pKpbaVtga4yoBoMNk0GQ8WKqtLvLurKEY';
// =====================

const sourceDb = createClient(SOURCE_SUPABASE_URL, SOURCE_SUPABASE_SERVICE_ROLE_KEY);
const targetDb = createClient(TARGET_SUPABASE_URL, TARGET_SUPABASE_SERVICE_ROLE_KEY);

// Dependency order: delete child tables first, insert parent tables first
const TABLES_TO_CLONE = [
  'branches',
  'services',
  'providers',
  'roles',
  'page_settings'
];

async function cloneData() {
  console.log(`Cloning from: ${SOURCE_SUPABASE_URL}`);
  console.log(`Cloning to:   ${TARGET_SUPABASE_URL}\n`);

  // Clear target tables first in reverse dependency order to prevent constraints errors
  console.log("=== CLEANSING TARGET DATABASE ===");
  const tablesToClear = ['provider_attendance', 'reservations', 'providers', 'services', 'branches', 'roles', 'page_settings'];
  for (const table of tablesToClear) {
    console.log(`Clearing table ${table}...`);
    // Delete all rows where id is not null (or key is not null for page_settings)
    const { error: delErr } = await targetDb
      .from(table)
      .delete()
      .neq(table === 'page_settings' ? 'key' : 'id', '00000000-0000-0000-0000-000000000000');
    
    if (delErr) {
      console.warn(`Warning clearing ${table}: ${delErr.message}`);
    }
  }

  console.log("\n=== CLONING DATA ===");
  for (const table of TABLES_TO_CLONE) {
    console.log(`----------------------------------------`);
    console.log(`Table: ${table}`);
    console.log(`----------------------------------------`);

    // 1. Fetch from source
    console.log(`Fetching from source database...`);
    const { data: sourceRows, error: fetchErr } = await sourceDb
      .from(table)
      .select('*');

    if (fetchErr) {
      console.error(`Failed to fetch from ${table}:`, fetchErr.message);
      continue;
    }

    console.log(`Fetched ${sourceRows.length} rows.`);

    if (sourceRows.length === 0) {
      console.log(`Skipping insert (no rows).`);
      continue;
    }

    console.log(`Inserting to target database...`);
    const chunkSize = 50;
    for (let i = 0; i < sourceRows.length; i += chunkSize) {
      const chunk = sourceRows.slice(i, i + chunkSize);
      const { error: insertErr } = await targetDb
        .from(table)
        .insert(chunk);

      if (insertErr) {
        console.error(`Failed to write chunk to ${table}:`, insertErr.message);
      }
    }
    
    console.log(`Successfully cloned ${table}!`);
  }

  console.log(`\n========================================`);
  console.log(`Database cloning completed!`);
  console.log(`========================================`);
}

cloneData();
