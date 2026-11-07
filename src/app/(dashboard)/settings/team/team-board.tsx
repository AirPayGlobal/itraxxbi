"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Mail, Send, UserPlus, Users } from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { ROLES, type TeamMember } from "@/lib/roles";
import { inviteMember, resendInvite, updateMember } from "./actions";

const roleLabels: Record<string, string> = {
  ADMIN: "Admin",
  MANAGER: "Manager",
  TECHNICIAN: "Technician",
  STAFF: "Staff",
  VIEWER: "Viewer",
};

const statusStyles: Record<TeamMember["status"], string> = {
  active: "bg-emerald-50 text-emerald-700",
  invited: "bg-brand-50 text-brand-700",
  deactivated: "bg-slate-100 text-slate-500",
};

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";

const EMPTY = { name: "", email: "", role: "STAFF", department: "" };

export function TeamBoard({ initialMembers, currentUserId }: { initialMembers: TeamMember[]; currentUserId: string }) {
  const [members, setMembers] = useState(initialMembers);
  const [form, setForm] = useState(EMPTY);
  const [inviting, setInviting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const replace = (m: TeamMember) => setMembers((prev) => prev.map((x) => (x.id === m.id ? m : x)));

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    const result = await inviteMember(form);
    setInviting(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setMembers((prev) => [result.data, ...prev]);
    setForm(EMPTY);
    toast.success(`Invitation sent to ${result.data.email}`);
  }

  async function change(id: string, changes: { role?: string; isActive?: boolean }, message: (m: TeamMember) => string) {
    setBusyId(id);
    const result = await updateMember(id, changes);
    setBusyId(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    replace(result.data);
    toast.success(message(result.data));
  }

  async function resend(id: string) {
    setBusyId(id);
    const result = await resendInvite(id);
    setBusyId(null);
    if (result.ok) toast.success(`Invitation re-sent to ${result.data.email}`);
    else toast.error(result.error);
  }

  const counts = {
    active: members.filter((m) => m.status === "active").length,
    invited: members.filter((m) => m.status === "invited").length,
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <p className="eyebrow text-brand-600">Settings</p>
        <h1 className="mt-1 text-2xl font-bold text-ink-800">Team &amp; access</h1>
        <p className="mt-1 text-sm text-slate-500">
          Access is invite-only. Invited people sign in with Clerk using the email you enter here; their role controls
          which pages they see.
        </p>
      </div>

      {/* Invite */}
      <form onSubmit={invite} className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-ink-800">
          <UserPlus className="h-4 w-4 text-brand-600" />
          Invite someone
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1.3fr_0.8fr_1fr_auto] lg:items-end">
          <div>
            <label htmlFor="invite-name" className="mb-1 block text-sm font-medium text-slate-700">Full name</label>
            <input id="invite-name" name="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jane Doe" className={inputCls} />
          </div>
          <div>
            <label htmlFor="invite-email" className="mb-1 block text-sm font-medium text-slate-700">Email</label>
            <input id="invite-email" name="email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="jane@company.com" className={inputCls} />
          </div>
          <div>
            <label htmlFor="invite-role" className="mb-1 block text-sm font-medium text-slate-700">Role</label>
            <select id="invite-role" name="role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className={inputCls}>
              {ROLES.map((r) => (
                <option key={r} value={r}>{roleLabels[r]}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="invite-dept" className="mb-1 block text-sm font-medium text-slate-700">Department</label>
            <input id="invite-dept" name="department" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="Optional" className={inputCls} />
          </div>
          <button
            type="submit"
            disabled={inviting}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-60"
          >
            {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {inviting ? "Sending..." : "Send invite"}
          </button>
        </div>
      </form>

      {/* Members */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="flex items-center gap-2 text-base font-semibold text-ink-800">
            <Users className="h-4 w-4 text-brand-600" />
            People
          </h2>
          <p className="text-xs text-slate-500">
            {counts.active} active · {counts.invited} invited
          </p>
        </div>
        <ul className="divide-y divide-slate-100">
          {members.map((m) => {
            const isMe = m.id === currentUserId;
            const busy = busyId === m.id;
            return (
              <li key={m.id} className={cn("flex flex-wrap items-center gap-4 px-5 py-3.5", m.status === "deactivated" && "opacity-60")}>
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
                    {m.department && <span className="text-slate-400"> · {m.department}</span>}
                  </p>
                </div>
                <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium capitalize", statusStyles[m.status])}>
                  {m.status}
                </span>
                <select
                  aria-label={`Role for ${m.name}`}
                  value={m.role}
                  disabled={isMe || busy}
                  onChange={(e) => change(m.id, { role: e.target.value }, (u) => `${u.name} is now ${roleLabels[u.role]}`)}
                  className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800 focus:border-brand-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{roleLabels[r]}</option>
                  ))}
                </select>
                <div className="flex w-full justify-end gap-2 sm:w-auto">
                  {m.status === "invited" && (
                    <button onClick={() => resend(m.id)} disabled={busy} className="rounded-md px-2.5 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-50 disabled:opacity-60">
                      Resend invite
                    </button>
                  )}
                  {!isMe && (
                    <button
                      onClick={() =>
                        change(m.id, { isActive: m.status === "deactivated" }, (u) =>
                          u.status === "deactivated" ? `${u.name} can no longer sign in` : `${u.name} reactivated`
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
