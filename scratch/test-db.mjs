import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

// Manually parse .env.local
const envFile = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
const envVars = Object.fromEntries(
  envFile
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const idx = line.indexOf("=");
      return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
    })
);

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local");
  process.exit(1);
}

console.log("Supabase URL:", supabaseUrl);
const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log("Testing connection...");
  
  // Try querying services
  console.log("\nQuerying 'services' table...");
  const { data: services, error: servicesError } = await supabase
    .from("services")
    .select("id, en, cat");
    
  if (servicesError) {
    console.error("Services query failed:", servicesError);
  } else {
    console.log(`Success! Found ${services?.length} services:`, services);
  }

  // Try querying reservations
  console.log("\nQuerying 'reservations' table...");
  const { data: reservations, error: resError } = await supabase
    .from("reservations")
    .select("*");
    
  if (resError) {
    console.error("Reservations query failed:", resError);
  } else {
    console.log(`Success! Found ${reservations?.length} reservations.`);
  }
}

testConnection();
