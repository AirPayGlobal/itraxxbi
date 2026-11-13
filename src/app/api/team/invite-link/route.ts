import { NextResponse, type NextRequest } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSignedInProfile } from "@/lib/supabase/server";
import { siteOrigin } from "@/lib/team";

function fail(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

/**
 * The sign-up link of someone's pending Clerk invitation, for sharing by hand (WhatsApp, own email)
 * when the invitation email doesn't arrive. Whoever holds the link can create the account for that
 * email, so staff links are admin-only and client portal links are for admins and managers.
 * If there's no pending invitation (e.g. it was revoked), a new one is created.
 */
export async function GET(request: NextRequest) {
  const me = await getSignedInProfile();
  if (!me || (me.role !== "ADMIN" && me.role !== "MANAGER")) return fail("Not allowed.", 403);

  const email = request.nextUrl.searchParams.get("email")?.trim().toLowerCase() ?? "";
  if (!email) return fail("Missing email.");

  let db;
  try {
    db = createAdminClient();
  } catch (err) {
    return fail((err as Error).message, 500);
  }
  const [{ data: invite }, { data: profile }] = await Promise.all([
    db.from("invitations").select("role").eq("email", email).maybeSingle(),
    db.from("profiles").select("role, clerk_user_id").eq("email", email).maybeSingle(),
  ]);
  if (profile?.clerk_user_id) return fail("This person has already signed up; they can sign in normally.", 409);
  const role = invite?.role ?? profile?.role;
  if (!role) return fail("There's no invitation for that email.", 404);
  if (role !== "CLIENT" && me.role !== "ADMIN") return fail("Only administrators can share staff invitation links.", 403);

  try {
    const clerk = await clerkClient();
    const { data: pending } = await clerk.invitations.getInvitationList({ status: "pending", query: email });
    let url = pending.find((i) => i.emailAddress.toLowerCase() === email && i.url)?.url ?? null;
    if (!url) {
      // No usable pending invitation (expired or revoked): create a fresh one without emailing again.
      const created = await clerk.invitations.createInvitation({
        emailAddress: email,
        redirectUrl: `${siteOrigin(request.nextUrl.origin)}/sign-up`,
        ignoreExisting: true,
        notify: false,
      });
      url = created.url ?? null;
    }
    if (!url) return fail("Clerk didn't return an invitation link.", 502);
    return NextResponse.json({ ok: true, url });
  } catch (err) {
    const e = err as { errors?: { longMessage?: string; message?: string }[]; message?: string };
    return fail(e?.errors?.[0]?.longMessage ?? e?.errors?.[0]?.message ?? e?.message ?? "Clerk error.", 502);
  }
}
