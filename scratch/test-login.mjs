import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const envFile = fs.readFileSync(".env.local", "utf8");
const envVars = {};
envFile.split("\n").forEach((line) => {
  const parts = line.split("=");
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const val = parts.slice(1).join("=").trim().replace(/^["']|["']$/g, '');
    envVars[key] = val;
  }
});

const url = envVars.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(url, anonKey);

async function testLogin() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: "saifuldeennaser@gmail.com",
    password: "12345678Sa#"
  });

  if (error) {
    console.error("Login failed:", error.message);
  } else {
    console.log("LOGIN SUCCESSFUL! User ID:", data.user.id);
    console.log("Access Token received successfully.");
  }
}

testLogin();
