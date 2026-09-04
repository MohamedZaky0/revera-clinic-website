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

const supabase = createClient(url, serviceKey);
const email = "saifuldeennaser@gmail.com";
const newPassword = "12345678Sa#";

async function main() {
  // 1. Get or create auth user
  let userId;
  const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
  const existingUser = usersData?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());

  if (existingUser) {
    userId = existingUser.id;
    console.log(`Auth user exists (${userId}). Updating password to ${newPassword}...`);
    const { error: updateErr } = await supabase.auth.admin.updateUserById(userId, {
      password: newPassword,
      email_confirm: true
    });
    if (updateErr) console.error("Password update error:", updateErr);
    else console.log("Password updated successfully!");
  } else {
    console.log("Creating new Auth user...");
    const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password: newPassword,
      email_confirm: true
    });
    if (createErr) {
      console.error("Create user error:", createErr);
      return;
    }
    userId = newUser.user.id;
    console.log(`Created Auth user: ${userId}`);
  }

  // 2. Check employee_accounts table
  const { data: empByEmail } = await supabase
    .from("employee_accounts")
    .select("*")
    .ilike("email", email)
    .maybeSingle();

  if (empByEmail) {
    console.log("Found employee_accounts record by email:", empByEmail.id);
    const { error: patchErr } = await supabase
      .from("employee_accounts")
      .update({ auth_user_id: userId, role_name: empByEmail.role_name || "superadmin" })
      .eq("id", empByEmail.id);
    if (patchErr) console.error("Link error:", patchErr);
    else console.log("Linked employee_accounts record to auth_user_id:", userId);
  } else {
    console.log("No employee_accounts record found by email. Creating superadmin employee record...");
    const { data: newEmp, error: insErr } = await supabase
      .from("employee_accounts")
      .insert({
        auth_user_id: userId,
        email: email.toLowerCase(),
        name: "Saifuldeen Naser",
        employee_id: "EMP-001",
        role_name: "superadmin",
        department: "Management"
      })
      .select()
      .single();

    if (insErr) {
      console.error("Insert employee_accounts error:", insErr);
    } else {
      console.log("Created employee_accounts record:", newEmp.id);
    }
  }

  console.log("\nFINISHED! Account saifuldeennaser@gmail.com is ready with password 12345678Sa#");
}

main();
