import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/team";

export type TeamMember = {
  id: string | null;
  email: string;
  name: string;
  role: string;
  department: string | null;
  status: "active" | "invited" | "deactivated";
};

/** Everyone with a profile plus invitations nobody has accepted yet. Admin only. */
export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ ok: false, error: "Only administrators can view the team." }, { status: 403 });
  }

  let db;
  try {
    db = createAdminClient();
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }

  const [profiles, invitations] = await Promise.all([
    // Client users are managed per customer on the Customers page.
    db.from("profiles").select("id, email, name, role, department, is_active, clerk_user_id").neq("role", "CLIENT").order("name"),
    db.from("invitations").select("email, name, role, department").neq("role", "CLIENT"),
  ]);
  if (profiles.error) return NextResponse.json({ ok: false, error: profiles.error.message }, { status: 500 });

  // Someone is active once their profile is linked to a Clerk account (their first sign-in).
  const members: TeamMember[] = (profiles.data ?? []).map((p) => ({
    id: p.id,
    email: p.email,
    name: p.name,
    role: p.role,
    department: p.department,
    status: !p.is_active ? "deactivated" : p.clerk_user_id ? "active" : "invited",
  }));

  const known = new Set(members.map((m) => m.email));
  // Hide invitations for emails that already belong to a client user.
  const { data: clients } = await db.from("profiles").select("email").eq("role", "CLIENT");
  for (const c of clients ?? []) known.add(c.email);
  for (const inv of invitations.data ?? []) {
    if (!known.has(inv.email)) {
      members.push({ id: null, email: inv.email, name: inv.name, role: inv.role, department: inv.department, status: "invited" });
    }
  }

  return NextResponse.json({ ok: true, members });
}
