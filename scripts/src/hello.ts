import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnv() {
  let dir = process.cwd();
  let envPath: string | null = null;
  while (dir !== path.dirname(dir)) {
    const candidate = path.join(dir, ".env");
    if (fs.existsSync(candidate)) {
      envPath = candidate;
      break;
    }
    dir = path.dirname(dir);
  }

  if (envPath) {
    const content = fs.readFileSync(envPath, "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
        const [key, ...rest] = trimmed.split("=");
        const val = rest.join("=").trim().replace(/^["'](.*)["']$/, "$1");
        if (!process.env[key.trim()]) {
          process.env[key.trim()] = val;
        }
      }
    }
  }
}

loadEnv();

const supabaseUrl = (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
const anonKey = process.env.SUPABASE_ANON_KEY || "";

async function testAdminResetPassword() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const targetEmail = "y.ouattara@hinovgroup.com";
  const newPassword = "Password2026!";

  // Find user by email
  const authUsersRes = await fetch(`${supabaseUrl}/auth/v1/admin/users?per_page=100`, {
    headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` }
  });
  const authData = await authUsersRes.json() as any;
  const user = (authData.users || []).find((u: any) => u.email === targetEmail);

  if (!user) {
    console.error("User not found:", targetEmail);
    return;
  }

  console.log("Found user id:", user.id);

  // Update password and confirm email via Auth Admin
  const updateRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${user.id}`, {
    method: "PUT",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      password: newPassword,
      email_confirm: true
    })
  });

  console.log("Update password status:", updateRes.status);
  const updateData = await updateRes.json() as any;
  console.log("Updated user confirmed_at:", updateData.email_confirmed_at);

  // Test login with new password
  const loginRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email: targetEmail,
      password: newPassword
    })
  });

  console.log("Login status:", loginRes.status);
  const loginData = await loginRes.json() as any;
  console.log("Token generated successfully:", !!loginData.access_token);
}

testAdminResetPassword().catch(console.error);



