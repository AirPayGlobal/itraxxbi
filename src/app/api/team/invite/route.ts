import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { ROLES, inviteEmailHtml, requireAdmin, siteOrigin, type Role } from "@/lib/team";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type InviteBody = { email?: string; name?: string; role?: string; department?: string; jobTitle?: string; resend?: boolean };

function fail(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

/**
 * Invites someone (or re-sends their invite). The invitation row decides their role when the account
 * is created; the link is generated here and emailed through TransactMail, so no Supabase email
 * template changes are needed. If email isn't configured the link is returned for the admin to share.
 */
export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return fail("Only administrators can invite people.", 403);

  const body = (await request.json().catch(() => ({}))) as InviteBody;
  const email = body.email?.trim().toLowerCase() ?? "";
  if (!EMAIL.test(email)) return fail("Please enter a valid email address.");

  let db;
  try {
    db = createAdminClient();
  } catch (err) {
    return fail((err as Error).message, 500);
  }

  let name: string;
  let createdInvitation = false;
  if (body.resend) {
    const { data: inv } = await db.from("invitations").select("name").eq("email", email).maybeSingle();
    if (!inv) return fail("There's no invitation for that email.", 404);
    name = inv.name;
  } else {
    name = body.name?.trim() ?? "";
    const role = body.role as Role;
    if (!name) return fail("Name is required.");
    if (!ROLES.includes(role)) return fail("Please choose a role.");

    const { data: existing } = await db.from("profiles").select("id").eq("email", email).maybeSingle();
    if (existing) return fail("Someone with that email is already on the team.", 409);

    const { error } = await db.from("invitations").upsert({
      email,
      name,
      role,
      department: body.department?.trim() || null,
      job_title: body.jobTitle?.trim() || null,
      invited_by: admin.id,
      accepted_at: null,
    });
    if (error) return fail(`Could not save the invitation: ${error.message}`, 500);
    createdInvitation = true;
  }

  // Creates the auth user (unconfirmed) on first invite; their profile picks up the invitation's role.
  let link = await db.auth.admin.generateLink({ type: "invite", email, options: { data: { name } } });
  if (link.error && /already|registered|exists/i.test(link.error.message)) {
    link = await db.auth.admin.generateLink({ type: "magiclink", email });
  }
  if (link.error || !link.data.properties) {
    if (createdInvitation) await db.from("invitations").delete().eq("email", email);
    return fail(`Could not create the invite link: ${link.error?.message ?? "unknown error"}`, 502);
  }

  const { hashed_token, verification_type } = link.data.properties;
  const url = new URL("/auth/confirm", siteOrigin(request.nextUrl.origin));
  url.searchParams.set("token_hash", hashed_token);
  url.searchParams.set("type", verification_type);
  url.searchParams.set("next", "/reset-password?invite=1");

  try {
    await sendEmail({ to: email, subject: "You're invited to iTrackerX BI", htmlContent: inviteEmailHtml(name, url.toString()) });
    return NextResponse.json({ ok: true, emailed: true });
  } catch (err) {
    console.error("Invite email failed", err);
    return NextResponse.json({ ok: true, emailed: false, link: url.toString() });
  }
}
