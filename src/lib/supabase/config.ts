// Resolves the Supabase URL + publishable/anon key from env, accepting several
// common names.
//
// IMPORTANT: only NEXT_PUBLIC_* variables are inlined into the browser bundle by
// Next.js. The non-prefixed fallbacks below only resolve in server-side code
// (route handlers, middleware, server components). For the BROWSER you MUST set
// NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, or the app
// cannot reach Supabase at runtime.
//
// When nothing is configured we fall back to a syntactically-valid placeholder
// so the production BUILD never crashes at prerender (the failure is deferred to
// runtime, where it is logged loudly). This keeps deploys from breaking purely
// on a missing env var while still surfacing the misconfiguration.

const PLACEHOLDER_URL = "https://placeholder.supabase.co";
const PLACEHOLDER_KEY = "placeholder-anon-key";

const resolvedUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  process.env.SUPABASE_URL ??
  "";

const resolvedKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.SUPABASE_PUBLISHABLE_KEY ??
  process.env.SUPABASE_ANON_KEY ??
  "";

export const isSupabaseConfigured = Boolean(resolvedUrl && resolvedKey);

if (!isSupabaseConfigured && typeof window !== "undefined") {
  // Browser: real values are missing — the app cannot reach Supabase.
  console.error(
    "[Supabase] Missing config. Set NEXT_PUBLIC_SUPABASE_URL and " +
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in your environment."
  );
}

export const SUPABASE_URL = resolvedUrl || PLACEHOLDER_URL;
export const SUPABASE_ANON_KEY = resolvedKey || PLACEHOLDER_KEY;
