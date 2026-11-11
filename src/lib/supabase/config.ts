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

// Public project defaults. Both values are PUBLIC — the project URL is not a
// secret and the "publishable" key is designed to be exposed in the browser
// (RLS enforces access). Used as a final fallback so the client always
// constructs with real, working values even if env vars are unset/misnamed on
// the host — which also means the build can never fail on a missing var.
// Override anytime via NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.
const DEFAULT_URL = "https://xhmkchduceqpubqplzcg.supabase.co";
const DEFAULT_KEY = "sb_publishable_PXepzY5a9a8FtB_c8uNl1A_AHpdwELh";

// Strip whitespace and accidental wrapping quotes that hosts sometimes keep in
// an env value (a common cause of "Invalid URL" build crashes).
function clean(v: string | undefined): string {
  return (v ?? "").trim().replace(/^['"]|['"]$/g, "").trim();
}

// A URL env value is only used if it actually parses as a URL; otherwise we
// fall back to the working default so a malformed value can't break the build.
function validUrl(v: string): string {
  if (!v) return "";
  try {
    return new URL(v).toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}

const resolvedUrl = validUrl(
  clean(process.env.NEXT_PUBLIC_SUPABASE_URL) ||
    clean(process.env.SUPABASE_URL)
);

const resolvedKey =
  clean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ||
  clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
  clean(process.env.SUPABASE_PUBLISHABLE_KEY) ||
  clean(process.env.SUPABASE_ANON_KEY);

export const isSupabaseConfigured = Boolean(resolvedUrl && resolvedKey);

export const SUPABASE_URL = resolvedUrl || DEFAULT_URL;
export const SUPABASE_ANON_KEY = resolvedKey || DEFAULT_KEY;
