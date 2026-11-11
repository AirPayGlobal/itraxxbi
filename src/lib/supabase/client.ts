import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config";

type ClerkWindow = Window & { Clerk?: { session?: { getToken: () => Promise<string | null> } | null } };

let browserClient: SupabaseClient<Database> | null = null;

/**
 * Browser Supabase client that authenticates with the signed-in user's Clerk session token
 * (Supabase third-party auth). Supabase's own auth methods are disabled on this client.
 */
export function createClient(): SupabaseClient<Database> {
  if (!browserClient) {
    browserClient = createSupabaseClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      accessToken: async () => {
        if (typeof window === "undefined") return null;
        return (await (window as ClerkWindow).Clerk?.session?.getToken()) ?? null;
      },
    });
  }
  return browserClient;
}

/** The signed-in person's profile id, or null if they aren't linked to a profile. */
export async function getSignedInProfile(): Promise<{ id: string } | null> {
  const { data, error } = await createClient().rpc("current_profile_id");
  if (error || !data) return null;
  return { id: data as string };
}
