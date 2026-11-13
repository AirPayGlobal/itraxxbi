import "server-only";
import { clerkClient } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SUPABASE_URL } from "@/lib/supabase/config";

type LinkedProfile = { id: string; role: string; is_active: boolean };

/**
 * The profile for a Clerk user, linking it on first sign-in. Matching is by Clerk-verified email:
 * first to an existing profile (people from before Clerk, or after moving Clerk instances), then to
 * an admin's invitation, which creates the profile with the invited role. Anyone else gets null.
 * Throws if an invitation matched but the profile couldn't be created.
 */
export async function resolveProfile(clerkUserId: string): Promise<LinkedProfile | null> {
  const db = createAdminClient();

  const { data: linked } = await db
    .from("profiles")
    .select("id, role, is_active")
    .eq("clerk_user_id", clerkUserId)
    .maybeSingle();
  if (linked) return linked;

  const user = await (await clerkClient()).users.getUser(clerkUserId);
  const emails = user.emailAddresses
    .filter((e) => e.verification?.status === "verified")
    .map((e) => e.emailAddress.toLowerCase());
  if (emails.length === 0) return null;

  const { data: existing } = await db.from("profiles").select("id").in("email", emails).limit(1).maybeSingle();
  if (existing) {
    const { data } = await db
      .from("profiles")
      .update({ clerk_user_id: clerkUserId })
      .eq("id", existing.id)
      .select("id, role, is_active")
      .single();
    return data;
  }

  const { data: invite } = await db.from("invitations").select("*").in("email", emails).limit(1).maybeSingle();
  if (!invite) return null;

  const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || invite.name;
  const { data: created, error } = await db
    .from("profiles")
    .insert({
      email: invite.email,
      name,
      role: invite.role,
      department: invite.department,
      job_title: invite.job_title,
      is_active: true,
      clerk_user_id: clerkUserId,
    })
    .select("id, role, is_active")
    .single();
  if (error) {
    throw new Error(
      `An invitation exists for ${invite.email} (${invite.role}), but the profile couldn't be created: ${error.message}`
    );
  }
  await db.from("invitations").update({ accepted_at: new Date().toISOString() }).eq("email", invite.email);
  return created;
}

export type AccessDiagnosis = {
  /** The signed-in Clerk account's email addresses, verified ones first. */
  emails: { address: string; verified: boolean }[];
  /** The Supabase project the server talks to (its subdomain only). */
  project: string;
  reason: "ok" | "not-configured" | "database-error" | "unverified-email" | "not-invited" | "deactivated";
  detail?: string;
};

/**
 * Why a signed-in Clerk user can't get in, for the "No access" page. Retries linking first, so a
 * fixed invitation or setting takes effect on reload. Reveals nothing the user doesn't already know
 * beyond the project id (public) and database error text.
 */
export async function diagnoseAccess(clerkUserId: string): Promise<AccessDiagnosis> {
  const user = await (await clerkClient()).users.getUser(clerkUserId);
  const emails = user.emailAddresses
    .map((e) => ({ address: e.emailAddress.toLowerCase(), verified: e.verification?.status === "verified" }))
    .sort((a, b) => Number(b.verified) - Number(a.verified));
  const project = new URL(SUPABASE_URL).hostname.split(".")[0];
  const base = { emails, project };

  let db;
  try {
    db = createAdminClient();
  } catch (err) {
    return { ...base, reason: "not-configured", detail: (err as Error).message };
  }

  // A cheap query that fails clearly on a wrong key, wrong project or missing schema.
  const probe = await db.from("profiles").select("id", { count: "exact", head: true });
  if (probe.error && probe.status === 0) {
    // supabase-js reports network failures as just "fetch failed"; find the underlying cause.
    return { ...base, reason: "database-error", detail: `Can't reach ${new URL(SUPABASE_URL).host}: ${await networkCause()}` };
  }
  if (probe.error) {
    return { ...base, reason: "database-error", detail: `${probe.error.message || probe.error.code || "Request failed"} (HTTP ${probe.status})` };
  }

  try {
    const profile = await resolveProfile(clerkUserId);
    if (profile?.is_active) return { ...base, reason: "ok" };
    if (profile) return { ...base, reason: "deactivated" };
  } catch (err) {
    return { ...base, reason: "database-error", detail: (err as Error).message };
  }

  if (!emails.some((e) => e.verified)) return { ...base, reason: "unverified-email" };

  return { ...base, reason: "not-invited" };
}

/** The low-level reason a request to the Supabase API fails (DNS, refused, TLS, timeout...). */
async function networkCause(): Promise<string> {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/health`, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    return `a direct request worked (HTTP ${res.status}), so the failure is intermittent; try again`;
  } catch (err) {
    const e = err as Error & { cause?: { code?: string; message?: string; hostname?: string } };
    const code = e.cause?.code;
    const hints: Record<string, string> = {
      ENOTFOUND: "the address doesn't exist (DNS). The Supabase project is probably paused or deleted",
      EAI_AGAIN: "DNS lookup failed temporarily",
      ECONNREFUSED: "the connection was refused",
      ECONNRESET: "the connection was reset",
      UND_ERR_CONNECT_TIMEOUT: "the connection timed out",
      TimeoutError: "the request timed out",
    };
    const name = code ?? e.name;
    return `${hints[name] ?? e.cause?.message ?? e.message} [${name}]`;
  }
}
