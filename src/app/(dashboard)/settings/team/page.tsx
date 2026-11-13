"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Mail, Send, UserPlus, Users } from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { ROLES, type Role } from "@/lib/roles";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/providers/session-provider";
import type { TeamMember } from "@/app/api/team/route";

const roleLabels: Record<Role, string> = {
  ADMIN: "Admin",
  MANAGER: "Manager",
  TECHNICIAN: "Technician",
  STAFF: "Staff",
  VIEWER: "Viewer",
};

const statusStyles: Record<TeamMember["status"], string> = {
  active: "bg-emerald-50 text-emerald-700",
  invited: "bg-brand-50 text-brand-700",
  "no-login": "bg-amber-50 text-amber-700",
  deactivated: "bg-slate-100 text-slate-500",
};

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";


export default function TeamPage() {
  const { profile } = useAuth();
  const [members, setMembers] = useState<TeamMember[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/team");
    const json = await res.json().catch(() => ({ ok: false, error: "Could not load the team." }));
    if (json.ok) {
      setMembers(json.members);
      setLoadError("");
    } else {
      setLoadError(json.error);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch
    load();
  }, [load]);

  async function postInvite(body: Record<string, unknown>) {
    const res = await fetch("/api/team/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.json().catch(() => ({ ok: false, error: "The server didn't respond." }));
  }

  function reportInvite(email: string, json: { ok: boolean; error?: string }) {
    if (!json.ok) {
      toast.error(json.error ?? "Could not send the invitation.");
      return false;
    }
    toast.success(`Invitation sent to ${email}`);
    return true;
  }

  async function resend(m: TeamMember) {
    setBusyKey(m.email);
    reportInvite(m.email, await postInvite({ email: m.email, resend: true }));
    setBusyKey(null);
  }

  async function update(m: TeamMember, changes: { role?: Role; is_active?: boolean }, message: string) {
    if (!m.id) return;
    setBusyKey(m.email);
    const { error } = await createClient().from("profiles").update(changes).eq("id", m.id);
    setBusyKey(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(message);
    load();
  }

  const counts = {
    active: members?.filter((m) => m.status === "active").length ?? 0,
    invited: members?.filter((m) => m.status === "invited").length ?? 0,
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <p className="eyebrow text-brand-600">Settings</p>
        <h1 className="mt-1 text-2xl font-bold text-ink-800">Team &amp; access</h1>
        <p className="mt-1 text-sm text-slate-500">
          Add employees and choose their role. The role decides which pages and data they can see. Access is invite-only.
        </p>
      </div>

      <AddEmployeeForm onAdded={load} />

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="flex items-center gap-2 text-base font-semibold text-ink-800">
            <Users className="h-4 w-4 text-brand-600" />
            People
          </h2>
          {members && (
            <p className="text-xs text-slate-500">
              {counts.active} active · {counts.invited} invited
            </p>
          )}
        </div>

        {loadError && <p className="px-5 py-8 text-center text-sm text-red-600">{loadError}</p>}
        {!members && !loadError && (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-brand-600" />
          </div>
        )}

        <ul className="divide-y divide-slate-100">
          {members?.map((m) => {
            const isMe = m.id === profile?.id;
            const busy = busyKey === m.email;
            return (
              <li key={m.email} className={cn("flex flex-wrap items-center gap-4 px-5 py-3.5", m.status === "deactivated" && "opacity-60")}>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
                  {getInitials(m.name)}
                </div>
                <div className="min-w-[12rem] flex-1">
                  <p className="text-sm font-medium text-ink-800">
                    {m.name} {isMe && <span className="text-xs font-normal text-slate-400">(you)</span>}
                  </p>
                  <p className="flex items-center gap-1 text-xs text-slate-500">
                    <Mail className="h-3 w-3" />
                    {m.email}
                    {m.job_title && <span className="text-slate-400"> · {m.job_title}</span>}
                    {m.department && <span className="text-slate-400"> · {m.department}</span>}
                  </p>
                </div>
                <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium capitalize", statusStyles[m.status])}>
                  {m.status === "no-login" ? "No login" : m.status}
                </span>
                <select
                  aria-label={`Role for ${m.name}`}
                  value={m.role}
                  disabled={isMe || busy || !m.id}
                  onChange={(e) => update(m, { role: e.target.value as Role }, `${m.name} is now ${roleLabels[e.target.value as Role]}`)}
                  className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800 focus:border-brand-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{roleLabels[r]}</option>
                  ))}
                </select>
                <div className="flex w-full justify-end gap-2 sm:w-auto">
                  {(m.status === "invited" || m.status === "no-login") && (
                    <button onClick={() => resend(m)} disabled={busy} className="rounded-md px-2.5 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-50 disabled:opacity-60">
                      {m.status === "invited" ? "Resend invite" : "Send sign-in invite"}
                    </button>
                  )}
                  {!isMe && m.id && (
                    <button
                      onClick={() =>
                        update(
                          m,
                          { is_active: m.status === "deactivated" },
                          m.status === "deactivated" ? `${m.name} reactivated` : `${m.name} can no longer sign in`
                        )
                      }
                      disabled={busy}
                      className={cn(
                        "rounded-md px-2.5 py-1.5 text-xs font-medium disabled:opacity-60",
                        m.status === "deactivated" ? "text-emerald-700 hover:bg-emerald-50" : "text-red-600 hover:bg-red-50"
                      )}
                    >
                      {m.status === "deactivated" ? "Reactivate" : "Deactivate"}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

const CONTRACTS = [
  ["PERMANENT", "Permanent"],
  ["FIXED_TERM", "Fixed term"],
  ["PART_TIME", "Part time"],
  ["CONTRACTOR", "Contractor"],
] as const;

const ROLE_HELP: Record<Role, string> = {
  ADMIN: "Everything, including Team & access and settings",
  MANAGER: "All operations, finance, HR and payroll",
  TECHNICIAN: "Tasks, job cards, inspections, tickets, customers, inventory",
  STAFF: "Tasks, tickets, documents, HR (own leave)",
  VIEWER: "Read-only: projects, tasks, job cards, customers, finance",
};

const NEW_EMPLOYEE = {
  name: "",
  email: "",
  role: "STAFF" as Role,
  jobTitle: "",
  department: "",
  phone: "",
  sendInvite: true,
  withEmployment: true,
  employeeNumber: "",
  startDate: new Date().toISOString().slice(0, 10),
  contractType: "PERMANENT",
  salary: "",
  bankName: "",
  bankAccount: "",
  taxNumber: "",
  annualLeave: "20",
  sickLeave: "12",
};

function Field({ label, htmlFor, children, hint }: { label: string; htmlFor: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

/** Adds an employee: profile + role now, employment record for HR/payroll, and (optionally) a sign-in invitation. */
function AddEmployeeForm({ onAdded }: { onAdded: () => void }) {
  const [f, setF] = useState(NEW_EMPLOYEE);
  const [saving, setSaving] = useState(false);
  const set = (patch: Partial<typeof NEW_EMPLOYEE>) => setF((prev) => ({ ...prev, ...patch }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/team/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: f.name,
        email: f.email,
        role: f.role,
        jobTitle: f.jobTitle,
        department: f.department,
        phone: f.phone,
        sendInvite: f.sendInvite,
        employment: f.withEmployment
          ? {
              employeeNumber: f.employeeNumber,
              startDate: f.startDate,
              contractType: f.contractType,
              salary: f.salary,
              bankName: f.bankName,
              bankAccount: f.bankAccount,
              taxNumber: f.taxNumber,
              annualLeave: f.annualLeave,
              sickLeave: f.sickLeave,
            }
          : null,
      }),
    });
    const json = await res.json().catch(() => ({ ok: false, error: "The server didn't respond." }));
    setSaving(false);
    if (!json.ok) {
      toast.error(json.error ?? "Could not add the employee.");
      return;
    }
    toast.success(
      `${f.name.trim()} added as ${roleLabels[f.role]}` +
        (json.employeeNumber ? ` (${json.employeeNumber})` : "") +
        (json.invited ? `. Sign-in invitation sent to ${f.email.trim()}` : "")
    );
    setF({ ...NEW_EMPLOYEE, startDate: new Date().toISOString().slice(0, 10) });
    onAdded();
  }

  return (
    <form onSubmit={submit} className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-ink-800">
        <UserPlus className="h-4 w-4 text-brand-600" />
        Add employee
      </h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Full name *" htmlFor="emp-name">
          <input id="emp-name" required value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder="Jane Doe" className={inputCls} />
        </Field>
        <Field label="Email *" htmlFor="emp-email" hint="They sign in with this address.">
          <input id="emp-email" type="email" required value={f.email} onChange={(e) => set({ email: e.target.value })} placeholder="jane@itrackerx.co" className={inputCls} />
        </Field>
        <Field label="Role *" htmlFor="emp-role" hint={ROLE_HELP[f.role]}>
          <select id="emp-role" value={f.role} onChange={(e) => set({ role: e.target.value as Role })} className={inputCls}>
            {ROLES.map((r) => (
              <option key={r} value={r}>{roleLabels[r]}</option>
            ))}
          </select>
        </Field>
        <Field label="Job title" htmlFor="emp-title">
          <input id="emp-title" value={f.jobTitle} onChange={(e) => set({ jobTitle: e.target.value })} placeholder="e.g. Installation Technician" className={inputCls} />
        </Field>
        <Field label="Department" htmlFor="emp-dept">
          <input id="emp-dept" value={f.department} onChange={(e) => set({ department: e.target.value })} placeholder="e.g. Operations" className={inputCls} />
        </Field>
        <Field label="Phone" htmlFor="emp-phone">
          <input id="emp-phone" value={f.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="+264 81 …" className={inputCls} />
        </Field>
      </div>

      <label className="mt-5 flex items-center gap-2 text-sm font-medium text-slate-700">
        <input type="checkbox" checked={f.withEmployment} onChange={(e) => set({ withEmployment: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-brand-600" />
        Add employment details for HR &amp; payroll
      </label>
      {f.withEmployment && (
        <div className="mt-3 grid grid-cols-1 gap-4 rounded-lg border border-slate-100 bg-slate-50/60 p-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Employee number" htmlFor="emp-no" hint="Leave blank to assign the next number automatically.">
            <input id="emp-no" value={f.employeeNumber} onChange={(e) => set({ employeeNumber: e.target.value })} placeholder="EMP-012" className={inputCls} />
          </Field>
          <Field label="Start date" htmlFor="emp-start">
            <input id="emp-start" type="date" value={f.startDate} onChange={(e) => set({ startDate: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Contract" htmlFor="emp-contract">
            <select id="emp-contract" value={f.contractType} onChange={(e) => set({ contractType: e.target.value })} className={inputCls}>
              {CONTRACTS.map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </Field>
          <Field label="Monthly basic salary (N$)" htmlFor="emp-salary" hint="Used when generating payslips.">
            <input id="emp-salary" inputMode="decimal" value={f.salary} onChange={(e) => set({ salary: e.target.value })} placeholder="e.g. 18500" className={inputCls} />
          </Field>
          <Field label="Bank" htmlFor="emp-bank">
            <input id="emp-bank" value={f.bankName} onChange={(e) => set({ bankName: e.target.value })} placeholder="e.g. Bank Windhoek" className={inputCls} />
          </Field>
          <Field label="Account number" htmlFor="emp-acc">
            <input id="emp-acc" value={f.bankAccount} onChange={(e) => set({ bankAccount: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Tax number" htmlFor="emp-tax">
            <input id="emp-tax" value={f.taxNumber} onChange={(e) => set({ taxNumber: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Annual leave (days)" htmlFor="emp-annual">
            <input id="emp-annual" inputMode="decimal" value={f.annualLeave} onChange={(e) => set({ annualLeave: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Sick leave (days)" htmlFor="emp-sick">
            <input id="emp-sick" inputMode="decimal" value={f.sickLeave} onChange={(e) => set({ sickLeave: e.target.value })} className={inputCls} />
          </Field>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={f.sendInvite} onChange={(e) => set({ sendInvite: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-brand-600" />
          Email them an invitation to sign in now
        </label>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : f.sendInvite ? <Send className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
          {saving ? "Adding..." : f.sendInvite ? "Add & invite" : "Add employee"}
        </button>
      </div>
    </form>
  );
}
