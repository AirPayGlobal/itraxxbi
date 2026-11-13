import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config";

type ClerkWindow = Window & {
  Clerk?: { loaded?: boolean; session?: { getToken: () => Promise<string | null> } | null };
};

/**
 * Clerk loads asynchronously. Queries that start on page load must wait for it; otherwise they go out
 * without a token, row-level security returns nothing, and the page caches an empty result.
 */
async function clerkReady(timeoutMs = 10_000): Promise<ClerkWindow["Clerk"] | null> {
  const w = window as ClerkWindow;
  const start = Date.now();
  while (!w.Clerk?.loaded) {
    if (Date.now() - start > timeoutMs) return w.Clerk ?? null;
    await new Promise((r) => setTimeout(r, 50));
  }
  return w.Clerk;
}

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
        const clerk = await clerkReady();
        return (await clerk?.session?.getToken()) ?? null;
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
