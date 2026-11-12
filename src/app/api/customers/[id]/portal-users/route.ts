import { NextResponse, type NextRequest } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireManager, siteOrigin } from "@/lib/team";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type PortalUser = {
  id: string | null;
  email: string;
  name: string;
  status: "active" | "invited" | "deactivated";
};

type Params = { params: Promise<{ id: string }> };

function fail(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

function clerkError(err: unknown): string {
  const e = err as { errors?: { longMessage?: string; message?: string }[]; message?: string };
  return e?.errors?.[0]?.longMessage ?? e?.errors?.[0]?.message ?? e?.message ?? "Clerk couldn't send the invitation.";
}

/** Loads the service-role client and confirms the customer exists. Admins and managers only. */
async function setup(params: Params["params"]) {
  if (!(await requireManager())) return { error: fail("Only administrators and managers can manage portal access.", 403) };
  const { id } = await params;
  let db;
  try {
    db = createAdminClient();
  } catch (err) {
    return { error: fail((err as Error).message, 500) };
  }
  const { data: customer } = await db.from("customers").select("id, name").eq("id", id).maybeSingle();
  if (!customer) return { error: fail("Customer not found.", 404) };
  return { db, customer };
}

/** The customer's portal users plus invitations nobody has accepted yet. */
export async function GET(_request: NextRequest, { params }: Params) {
  const ctx = await setup(params);
  if ("error" in ctx) return ctx.error;
  const { db, customer } = ctx;

  const [profiles, invitations] = await Promise.all([
    db.from("profiles").select("id, email, name, is_active, clerk_user_id").eq("customer_id", customer.id).eq("role", "CLIENT").order("name"),
    db.from("invitations").select("email, name").eq("customer_id", customer.id).eq("role", "CLIENT"),
  ]);
  if (profiles.error) return fail(profiles.error.message, 500);

  const users: PortalUser[] = (profiles.data ?? []).map((p) => ({
    id: p.id,
    email: p.email,
    name: p.name,
    status: !p.is_active ? "deactivated" : p.clerk_user_id ? "active" : "invited",
  }));
  const known = new Set(users.map((u) => u.email));
  for (const inv of invitations.data ?? []) {
    if (!known.has(inv.email)) users.push({ id: null, email: inv.email, name: inv.name, status: "invited" });
  }
  return NextResponse.json({ ok: true, users });
}

/** Invites someone from this customer to the client portal (or re-sends their invite). */
export async function POST(request: NextRequest, { params }: Params) {
  const ctx = await setup(params);
  if ("error" in ctx) return ctx.error;
  const { db, customer } = ctx;
  const inviter = await requireManager();

  const body = (await request.json().catch(() => ({}))) as { email?: string; name?: string; resend?: boolean };
  const email = body.email?.trim().toLowerCase() ?? "";
  if (!EMAIL.test(email)) return fail("Please enter a valid email address.");

  const [{ data: profile }, { data: invite }] = await Promise.all([
    db.from("profiles").select("id, role, customer_id, clerk_user_id").eq("email", email).maybeSingle(),
    db.from("invitations").select("role, customer_id").eq("email", email).maybeSingle(),
  ]);

  let createdInvitation = false;
  if (body.resend) {
    const pending =
      (invite?.role === "CLIENT" && invite.customer_id === customer.id) ||
      (profile?.role === "CLIENT" && profile.customer_id === customer.id && !profile.clerk_user_id);
    if (!pending) return fail("There's no pending invitation for that email.", 404);
  } else {
    const name = body.name?.trim() ?? "";
    if (!name) return fail("Name is required.");
    if (profile) {
      return fail(
        profile.role !== "CLIENT"
          ? "That email belongs to an ITRACKERX staff member."
          : profile.customer_id === customer.id
            ? "That person already has portal access for this customer."
            : "That email already has portal access for another customer.",
        409
      );
    }
    if (invite && (invite.role !== "CLIENT" || invite.customer_id !== customer.id)) {
      return fail(
        invite.role !== "CLIENT"
          ? "That email has a pending staff invitation."
          : "That email has a pending invitation for another customer.",
        409
      );
    }

    const { error } = await db.from("invitations").upsert({
      email,
      name,
      role: "CLIENT",
      customer_id: customer.id,
      department: null,
      job_title: null,
      invited_by: inviter?.id ?? null,
      accepted_at: null,
    });
    if (error) return fail(`Could not save the invitation: ${error.message}`, 500);
    createdInvitation = !invite;
  }

  try {
    const clerk = await clerkClient();
    await clerk.invitations.createInvitation({
      emailAddress: email,
      redirectUrl: `${siteOrigin(request.nextUrl.origin)}/sign-up`,
      publicMetadata: { portal: true },
      ignoreExisting: true,
    });
  } catch (err) {
    console.error("Clerk invitation failed", err);
    if (createdInvitation) await db.from("invitations").delete().eq("email", email);
    return fail(clerkError(err), 502);
  }

  return NextResponse.json({ ok: true, emailed: true });
}

/** Turns a portal user's access off or back on: `{ id, active }`. */
export async function PATCH(request: NextRequest, { params }: Params) {
  const ctx = await setup(params);
  if ("error" in ctx) return ctx.error;
  const { db, customer } = ctx;

  const body = (await request.json().catch(() => ({}))) as { id?: string; active?: boolean };
  if (!body.id || typeof body.active !== "boolean") return fail("Missing user or status.");

  const { data, error } = await db
    .from("profiles")
    .update({ is_active: body.active })
    .eq("id", body.id)
    .eq("customer_id", customer.id)
    .eq("role", "CLIENT")
    .select("id")
    .maybeSingle();
  if (error) return fail(error.message, 500);
  if (!data) return fail("Portal user not found.", 404);
  return NextResponse.json({ ok: true });
}

/** Cancels a pending invitation: `?email=`. */
export async function DELETE(request: NextRequest, { params }: Params) {
  const ctx = await setup(params);
  if ("error" in ctx) return ctx.error;
  const { db, customer } = ctx;

  const email = request.nextUrl.searchParams.get("email")?.trim().toLowerCase() ?? "";
  const { data, error } = await db
    .from("invitations")
    .delete()
    .eq("email", email)
    .eq("customer_id", customer.id)
    .eq("role", "CLIENT")
    .select("email");
  if (error) return fail(error.message, 500);
  if (!data?.length) return fail("Invitation not found.", 404);

  // Also revoke Clerk's pending invitation so the emailed link stops working.
  try {
    const clerk = await clerkClient();
    const { data: pending } = await clerk.invitations.getInvitationList({ status: "pending", query: email });
    await Promise.all(
      pending.filter((i) => i.emailAddress.toLowerCase() === email).map((i) => clerk.invitations.revokeInvitation(i.id))
    );
  } catch (err) {
    console.error("Could not revoke Clerk invitation", err);
  }
  return NextResponse.json({ ok: true });
}
