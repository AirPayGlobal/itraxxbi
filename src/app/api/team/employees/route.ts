import { NextResponse, type NextRequest } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ROLES, requireAdmin, siteOrigin, type Role } from "@/lib/team";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CONTRACTS = ["PERMANENT", "FIXED_TERM", "PART_TIME", "CONTRACTOR"] as const;

export type AddEmployeeBody = {
  name?: string;
  email?: string;
  role?: string;
  department?: string;
  jobTitle?: string;
  phone?: string;
  sendInvite?: boolean;
  employment?: {
    employeeNumber?: string;
    startDate?: string;
    contractType?: string;
    salary?: number | string | null;
    bankName?: string;
    bankAccount?: string;
    taxNumber?: string;
    annualLeave?: number | string | null;
    sickLeave?: number | string | null;
  } | null;
};

function fail(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

const text = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v).replace(/[^0-9.-]/g, ""));
  return isFinite(n) ? n : NaN;
}

/** Next free EMP-### number. */
async function nextEmployeeNumber(db: ReturnType<typeof createAdminClient>): Promise<string> {
  const { data } = await db.from("employees").select("employee_number");
  const max = (data ?? []).reduce((m, r) => {
    const n = Number((r.employee_number.match(/(\d+)\s*$/) || [])[1]);
    return isFinite(n) && n > m ? n : m;
  }, 0);
  return `EMP-${String(max + 1).padStart(3, "0")}`;
}

/**
 * Adds an employee in one go: their profile with a role (so they show in HR and payroll right away),
 * optionally their employment record, and optionally a sign-in invitation. Admin only.
 * When they first sign in with this email, their Clerk account is linked to this profile.
 */
export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return fail("Only administrators can add employees.", 403);

  const body = (await request.json().catch(() => ({}))) as AddEmployeeBody;
  const name = text(body.name);
  const email = text(body.email)?.toLowerCase() ?? "";
  const role = body.role as Role;
  if (!name) return fail("Name is required.");
  if (!EMAIL.test(email)) return fail("Please enter a valid email address.");
  if (!ROLES.includes(role)) return fail("Please choose a role.");

  const emp = body.employment ?? null;
  let employment: Record<string, unknown> | null = null;
  if (emp) {
    const salary = num(emp.salary);
    const annual = num(emp.annualLeave);
    const sick = num(emp.sickLeave);
    if (Number.isNaN(salary) || (salary !== null && salary < 0)) return fail("Salary must be a positive number.");
    if (Number.isNaN(annual) || Number.isNaN(sick)) return fail("Leave balances must be numbers.");
    const contract = emp.contractType && CONTRACTS.includes(emp.contractType as (typeof CONTRACTS)[number]) ? emp.contractType : "PERMANENT";
    const start = text(emp.startDate);
    if (start && isNaN(Date.parse(start))) return fail("Start date isn't a valid date.");
    employment = {
      employee_number: text(emp.employeeNumber),
      start_date: start ? new Date(start).toISOString() : new Date().toISOString(),
      contract_type: contract,
      salary,
      bank_name: text(emp.bankName),
      bank_account: text(emp.bankAccount),
      tax_number: text(emp.taxNumber),
      annual_leave_balance: annual ?? 20,
      sick_leave_balance: sick ?? 12,
    };
  }

  let db;
  try {
    db = createAdminClient();
  } catch (err) {
    return fail((err as Error).message, 500);
  }

  const { data: existing } = await db.from("profiles").select("id, role").eq("email", email).maybeSingle();
  if (existing) {
    return fail(existing.role === "CLIENT" ? "That email belongs to a client portal user." : "Someone with that email is already on the team.", 409);
  }
  if (employment?.employee_number) {
    const { data: taken } = await db.from("employees").select("id").eq("employee_number", employment.employee_number as string).maybeSingle();
    if (taken) return fail(`Employee number ${employment.employee_number} is already used.`, 409);
  }

  const { data: profile, error: profileError } = await db
    .from("profiles")
    .insert({
      email,
      name,
      role,
      department: text(body.department),
      job_title: text(body.jobTitle),
      phone: text(body.phone),
      is_active: true,
    })
    .select("id")
    .single();
  if (profileError || !profile) return fail(`Could not add the employee: ${profileError?.message ?? "unknown error"}`, 500);

  const undo = async () => {
    await db.from("invitations").delete().eq("email", email);
    await db.from("profiles").delete().eq("id", profile.id);
  };

  let employeeNumber: string | null = null;
  if (employment) {
    employeeNumber = (employment.employee_number as string | null) ?? (await nextEmployeeNumber(db));
    const { error } = await db.from("employees").insert({ ...employment, employee_number: employeeNumber, user_id: profile.id } as never);
    if (error) {
      await undo();
      return fail(`Could not save the employment details: ${error.message}`, 500);
    }
  }

  let invited = false;
  if (body.sendInvite !== false) {
    // The invitation row keeps the role on record for "Resend invite"; the profile already exists.
    await db.from("invitations").upsert({
      email,
      name,
      role,
      department: text(body.department),
      job_title: text(body.jobTitle),
      invited_by: admin.id,
      accepted_at: null,
      customer_id: null,
    });
    try {
      const clerk = await clerkClient();
      await clerk.invitations.createInvitation({
        emailAddress: email,
        redirectUrl: `${siteOrigin(request.nextUrl.origin)}/sign-up`,
        ignoreExisting: true,
      });
      invited = true;
    } catch (err) {
      console.error("Clerk invitation failed", err);
      await undo();
      const e = err as { errors?: { longMessage?: string; message?: string }[]; message?: string };
      return fail(e?.errors?.[0]?.longMessage ?? e?.errors?.[0]?.message ?? e?.message ?? "Clerk couldn't send the invitation.", 502);
    }
  }

  return NextResponse.json({ ok: true, id: profile.id, employeeNumber, invited });
}
