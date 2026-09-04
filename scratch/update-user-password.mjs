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
const serviceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

const email = "saifuldeennaser@gmail.com";
const newPassword = "12345678Sa#";

async function main() {
  console.log(`Searching for user with email: ${email}`);
  const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error("Error listing users:", listError);
    process.exit(1);
  }

  const existingUser = usersData.users.find(u => u.email?.toLowerCase() === email.toLowerCase());

  if (existingUser) {
    console.log(`Found existing user ID: ${existingUser.id}. Updating password...`);
    const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
      existingUser.id,
      { password: newPassword, email_confirm: true }
    );
    if (updateError) {
      console.error("Error updating password:", updateError);
    } else {
      console.log(`SUCCESS! Password updated for ${email} (ID: ${existingUser.id})`);
    }
  } else {
    console.log(`User ${email} not found in Supabase Auth. Creating user...`);
    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
      email: email,
      password: newPassword,
      email_confirm: true
    });
    if (createError) {
      console.error("Error creating user:", createError);
    } else {
      console.log(`SUCCESS! User created for ${email} (ID: ${createData.user.id})`);
    }
  }

  const { data: emp, error: empErr } = await supabase
    .from("employee_accounts")
    .select("*")
    .eq("email", email.toLowerCase())
    .maybeSingle();

  console.log("Employee account record in DB:", emp || "Not found in employee_accounts table");
}

main();
