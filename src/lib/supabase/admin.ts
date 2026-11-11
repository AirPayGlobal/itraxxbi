import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./config";

// Service-role client: bypasses row-level security. Server-side only, and only after the caller's
// own permissions have been checked.
export function createAdminClient() {
  const key =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  if (!key) {
    throw new Error("Team management needs SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) on the server.");
  }
  return createSupabaseClient(SUPABASE_URL, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
