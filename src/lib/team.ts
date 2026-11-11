import "server-only";
import { createClient } from "@/lib/supabase/server";

export { ROLES, type Role } from "@/lib/roles";

/** The signed-in user if they are an active ADMIN, otherwise null. */
export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, is_active")
    .eq("id", user.id)
    .maybeSingle();
  return profile?.role === "ADMIN" && profile.is_active ? { id: user.id } : null;
}

export function siteOrigin(requestOrigin: string) {
  return (process.env.NEXT_PUBLIC_SITE_URL || requestOrigin).replace(/\/$/, "");
}

export function inviteEmailHtml(name: string, link: string) {
  const safeName = name.replace(/[<>&"]/g, "");
  return `
  <div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px;color:#23272e">
    <p style="font-size:11px;letter-spacing:.24em;text-transform:uppercase;color:#1676c4;font-weight:600;margin:0">Fleet Data Intelligence</p>
    <h1 style="font-size:22px;margin:12px 0 8px">You're invited to iTrackerX BI</h1>
    <p style="font-size:14px;line-height:1.6;color:#475569">Hi ${safeName}, an administrator has given you access. Click below to choose your password and sign in.</p>
    <p style="margin:28px 0"><a href="${link}" style="background:#1676c4;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;font-size:14px">Accept invitation</a></p>
    <p style="font-size:12px;color:#94a3b8">This link works once and expires after 24 hours. If you weren't expecting it, you can ignore this email.</p>
  </div>`;
}
