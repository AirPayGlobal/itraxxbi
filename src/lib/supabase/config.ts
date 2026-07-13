// Resolves the Supabase URL + publishable/anon key from env, accepting several
// common names. IMPORTANT: only NEXT_PUBLIC_* variables are inlined into the
// browser bundle by Next.js — the non-prefixed fallbacks below only resolve in
// server-side code (route handlers, middleware, server components). For the
// browser you MUST set NEXT_PUBLIC_SUPABASE_URL and
// NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.

export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  process.env.SUPABASE_URL ??
  "";

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.SUPABASE_PUBLISHABLE_KEY ??
  process.env.SUPABASE_ANON_KEY ??
  "";
