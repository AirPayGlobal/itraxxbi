import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { auth } from "@clerk/nextjs/server";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config";

/** Server-side Supabase client acting as the signed-in Clerk user, so row-level security applies. */
export async function createClient() {
  const { getToken } = await auth();
  return createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    accessToken: async () => (await getToken()) ?? null,
  });
}

/** The signed-in person's active profile, or null if signed out, not linked, or deactivated. */
export async function getSignedInProfile() {
  const { userId } = await auth();
  if (!userId) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, role, job_title, is_active")
    .eq("clerk_user_id", userId)
    .maybeSingle();
  return data?.is_active ? data : null;
}
