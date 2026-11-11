import "server-only";
import { clerkClient } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase/admin";

type LinkedProfile = { id: string; role: string; is_active: boolean };

/**
 * The profile for a Clerk user, linking it on first sign-in. Matching is by Clerk-verified email:
 * first to an existing profile (people from before Clerk, or after moving Clerk instances), then to
 * an admin's invitation, which creates the profile with the invited role. Anyone else gets null.
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
    console.error("Could not create profile from invitation", error);
    return null;
  }
  await db.from("invitations").update({ accepted_at: new Date().toISOString() }).eq("email", invite.email);
  return created;
}
