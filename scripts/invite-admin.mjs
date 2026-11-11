// Invite the first administrator. Access is invite-only, so someone has to be invited outside the app.
//
// Usage:
//   ADMIN_EMAIL=you@company.com ADMIN_NAME="Your Name" SITE_URL=https://itraxxbi.sinapsedi.com \
//   SUPABASE_URL=... SUPABASE_SECRET_KEY=... CLERK_SECRET_KEY=... npm run invite:admin
//
// Records an ADMIN invitation (which decides the role on first sign-in) and asks Clerk to email the invite.
import { createClient } from "@supabase/supabase-js";

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const name = process.env.ADMIN_NAME?.trim() || "Administrator";
const site = (process.env.SITE_URL || "http://localhost:3000").replace(/\/$/, "");
const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const clerkKey = process.env.CLERK_SECRET_KEY;

const missing = Object.entries({ ADMIN_EMAIL: email, SUPABASE_URL: url, SUPABASE_SECRET_KEY: supabaseKey, CLERK_SECRET_KEY: clerkKey })
  .filter(([, v]) => !v)
  .map(([k]) => k);
if (missing.length) {
  console.error(`Missing: ${missing.join(", ")}`);
  process.exit(1);
}

const db = createClient(url, supabaseKey, { auth: { persistSession: false } });

const { data: existing } = await db.from("profiles").select("id, role").eq("email", email).maybeSingle();
if (existing) {
  // Already on the team (e.g. from before Clerk): make sure they're an active admin.
  const { error } = await db.from("profiles").update({ role: "ADMIN", is_active: true }).eq("id", existing.id);
  if (error) throw error;
  console.log(`${email} already has a profile; set to active ADMIN.`);
} else {
  const { error } = await db.from("invitations").upsert({ email, name, role: "ADMIN", accepted_at: null });
  if (error) throw error;
  console.log(`Recorded ADMIN invitation for ${email}.`);
}

const res = await fetch("https://api.clerk.com/v1/invitations", {
  method: "POST",
  headers: { Authorization: `Bearer ${clerkKey}`, "Content-Type": "application/json" },
  body: JSON.stringify({ email_address: email, redirect_url: `${site}/sign-up`, ignore_existing: true }),
});
if (!res.ok) {
  console.error(`Clerk invitation failed (${res.status}): ${await res.text()}`);
  process.exit(1);
}
console.log(`Clerk invitation emailed to ${email}. Accept it, then sign in at ${site}/sign-in.`);
