import "server-only";
import { getSignedInProfile } from "@/lib/supabase/server";

export { ROLES, type Role } from "@/lib/roles";

/** The signed-in person's profile if they are an active ADMIN, otherwise null. */
export async function requireAdmin() {
  const profile = await getSignedInProfile();
  return profile?.role === "ADMIN" ? { id: profile.id } : null;
}

export function siteOrigin(requestOrigin: string) {
  return (process.env.NEXT_PUBLIC_SITE_URL || requestOrigin).replace(/\/$/, "");
}
