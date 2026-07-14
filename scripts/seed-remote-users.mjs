// Create the demo users on a REMOTE Supabase project the correct way — via the
// Admin API (which populates every auth field GoTrue needs). Do NOT insert into
// auth.users with raw SQL on a hosted project: it leaves required columns unset
// and breaks login with "Database error querying schema".
//
// Usage (needs the SERVICE/SECRET key, never expose it to the browser):
//   SUPABASE_URL=https://<ref>.supabase.co \
//   SUPABASE_SECRET_KEY=sb_secret_xxx \
//   node scripts/seed-remote-users.mjs
//
// Re-runnable: existing users are updated (password + metadata), not duplicated.

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Missing config. Set SUPABASE_URL and SUPABASE_SECRET_KEY (service/secret key)."
  );
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const demoUsers = [
  { email: "admin@itrackerx.com", password: "admin123", name: "Admin User", role: "ADMIN", department: "Management", job_title: "System Administrator" },
  { email: "manager@itrackerx.com", password: "manager123", name: "Sarah Manager", role: "MANAGER", department: "Operations", job_title: "Operations Manager" },
  { email: "technician@itrackerx.com", password: "tech123", name: "John Technician", role: "TECHNICIAN", department: "Technical", job_title: "Senior Technician" },
  { email: "staff@itrackerx.com", password: "staff123", name: "Jane Staff", role: "STAFF", department: "Administration", job_title: "Office Administrator" },
  { email: "viewer@itrackerx.com", password: "viewer123", name: "Mike Viewer", role: "VIEWER", department: "External", job_title: "Auditor" },
];

async function findUserByEmail(email) {
  // Paginate through users to find an existing match.
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const match = data.users.find((u) => u.email === email);
    if (match) return match;
    if (data.users.length < 200) break;
  }
  return null;
}

let created = 0;
let updated = 0;

for (const u of demoUsers) {
  const meta = {
    name: u.name,
    role: u.role,
    department: u.department,
    job_title: u.job_title,
  };
  const existing = await findUserByEmail(u.email);
  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password: u.password,
      email_confirm: true,
      user_metadata: meta,
    });
    if (error) console.error(`! ${u.email}: ${error.message}`);
    else {
      updated++;
      console.log(`= updated ${u.email}`);
    }
  } else {
    const { error } = await admin.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: meta,
    });
    if (error) console.error(`! ${u.email}: ${error.message}`);
    else {
      created++;
      console.log(`+ created ${u.email}`);
    }
  }
}

console.log(`\nDone. ${created} created, ${updated} updated.`);
console.log(
  "Login with e.g. admin@itrackerx.com / admin123 (change these before real use)."
);
