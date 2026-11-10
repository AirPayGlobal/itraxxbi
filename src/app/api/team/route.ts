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

  const [profiles, invitations, users] = await Promise.all([
    db.from("profiles").select("id, email, name, role, department, is_active").order("name"),
    db.from("invitations").select("email, name, role, department"),
    db.auth.admin.listUsers({ perPage: 1000 }),
  ]);
  if (profiles.error) return NextResponse.json({ ok: false, error: profiles.error.message }, { status: 500 });

  // Someone counts as active once they've signed in at least once.
  const signedIn = new Set((users.data?.users ?? []).filter((u) => u.last_sign_in_at).map((u) => u.id));
  const members: TeamMember[] = (profiles.data ?? []).map((p) => ({
    id: p.id,
    email: p.email,
    name: p.name,
    role: p.role,
    department: p.department,
    status: !p.is_active ? "deactivated" : signedIn.has(p.id) ? "active" : "invited",
  }));

  const known = new Set(members.map((m) => m.email));
  for (const inv of invitations.data ?? []) {
    if (!known.has(inv.email)) {
      members.push({ id: null, email: inv.email, name: inv.name, role: inv.role, department: inv.department, status: "invited" });
    }
  }

  return NextResponse.json({ ok: true, members });
}
