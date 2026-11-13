import { NextResponse, type NextRequest } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ROLES, requireAdmin, siteOrigin, type Role } from "@/lib/team";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type InviteBody = { email?: string; name?: string; role?: string; department?: string; jobTitle?: string; resend?: boolean };

function fail(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

function clerkError(err: unknown): string {
  const e = err as { errors?: { longMessage?: string; message?: string }[]; message?: string };
  return e?.errors?.[0]?.longMessage ?? e?.errors?.[0]?.message ?? e?.message ?? "Clerk couldn't send the invitation.";
}

/**
 * Invites someone (or re-sends their invite). Clerk emails the invitation and handles sign-up; the
 * invitation row here decides their role when they first sign in.
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

  let createdInvitation = false;
  if (body.resend) {
    // Pending invitations, plus people who had accounts before Clerk and haven't signed in with it yet.
    const [{ data: inv }, { data: unlinked }] = await Promise.all([
      db.from("invitations").select("email").eq("email", email).maybeSingle(),
      db.from("profiles").select("id, name, role, department, job_title").eq("email", email).is("clerk_user_id", null).maybeSingle(),
    ]);
    if (!inv && !unlinked) return fail("There's no pending invitation for that email.", 404);
    // Employees added without a login: record the invitation so the team list shows them as invited.
    if (!inv && unlinked && unlinked.role !== "CLIENT") {
      await db.from("invitations").upsert({
        email,
        name: unlinked.name,
        role: unlinked.role,
        department: unlinked.department,
        job_title: unlinked.job_title,
        invited_by: admin.id,
        accepted_at: null,
        customer_id: null,
      });
    }
  } else {
    const name = body.name?.trim() ?? "";
    const role = body.role as Role;
    if (!name) return fail("Name is required.");
    if (!ROLES.includes(role)) return fail("Please choose a role.");

    const { data: existing } = await db.from("profiles").select("id, role").eq("email", email).maybeSingle();
    if (existing) {
      return fail(
        existing.role === "CLIENT"
          ? "That email belongs to a client portal user."
          : "Someone with that email is already on the team.",
        409
      );
    }

    const { error } = await db.from("invitations").upsert({
      email,
      name,
      role,
      department: body.department?.trim() || null,
      job_title: body.jobTitle?.trim() || null,
      invited_by: admin.id,
      accepted_at: null,
      customer_id: null,
    });
    if (error) return fail(`Could not save the invitation: ${error.message}`, 500);
    createdInvitation = true;
  }

  try {
    const clerk = await clerkClient();
    await clerk.invitations.createInvitation({
      emailAddress: email,
      redirectUrl: `${siteOrigin(request.nextUrl.origin)}/sign-up`,
      ignoreExisting: true,
    });
  } catch (err) {
    console.error("Clerk invitation failed", err);
    if (createdInvitation) await db.from("invitations").delete().eq("email", email);
    return fail(clerkError(err), 502);
  }

  return NextResponse.json({ ok: true, emailed: true });
}
