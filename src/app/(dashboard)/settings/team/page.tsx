"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, Loader2, Mail, Send, UserPlus, Users } from "lucide-react";
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
  deactivated: "bg-slate-100 text-slate-500",
};

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";

const EMPTY = { name: "", email: "", role: "STAFF" as Role, department: "" };

export default function TeamPage() {
  const { profile } = useAuth();
  const [members, setMembers] = useState<TeamMember[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [form, setForm] = useState(EMPTY);
  const [inviting, setInviting] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [manualLink, setManualLink] = useState<{ email: string; link: string } | null>(null);

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

  function reportInvite(email: string, json: { ok: boolean; error?: string; emailed?: boolean; link?: string }) {
    if (!json.ok) {
      toast.error(json.error ?? "Could not send the invitation.");
      return false;
    }
    if (json.emailed) {
      toast.success(`Invitation sent to ${email}`);
      setManualLink(null);
    } else {
      toast.warning("Email isn't set up, so copy the invite link below and send it yourself.");
      setManualLink({ email, link: json.link! });
    }
    return true;
  }

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    const json = await postInvite(form);
    setInviting(false);
    if (reportInvite(form.email.trim().toLowerCase(), json)) {
      setForm(EMPTY);
      load();
    }
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
          Access is invite-only. Each person&apos;s role decides which pages and data they can see.
        </p>
      </div>

      <form onSubmit={invite} className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-ink-800">
          <UserPlus className="h-4 w-4 text-brand-600" />
          Invite someone
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1.3fr_0.8fr_1fr_auto] lg:items-end">
          <div>
            <label htmlFor="invite-name" className="mb-1 block text-sm font-medium text-slate-700">Full name</label>
            <input id="invite-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jane Doe" className={inputCls} />
          </div>
          <div>
            <label htmlFor="invite-email" className="mb-1 block text-sm font-medium text-slate-700">Email</label>
            <input id="invite-email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="jane@company.com" className={inputCls} />
          </div>
          <div>
            <label htmlFor="invite-role" className="mb-1 block text-sm font-medium text-slate-700">Role</label>
            <select id="invite-role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })} className={inputCls}>
              {ROLES.map((r) => (
                <option key={r} value={r}>{roleLabels[r]}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="invite-dept" className="mb-1 block text-sm font-medium text-slate-700">Department</label>
            <input id="invite-dept" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="Optional" className={inputCls} />
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

        {manualLink && (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <span className="flex-1">
              Send this one-time link to <strong>{manualLink.email}</strong>. It expires in 24 hours.
            </span>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(manualLink.link).then(() => toast.success("Link copied"))}
              className="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-amber-900 shadow-sm hover:bg-amber-100"
            >
              <Copy className="h-3.5 w-3.5" />
              Copy link
            </button>
          </div>
        )}
      </form>

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
                    {m.department && <span className="text-slate-400"> · {m.department}</span>}
                  </p>
                </div>
                <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium capitalize", statusStyles[m.status])}>
                  {m.status}
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
                  {m.status === "invited" && (
                    <button onClick={() => resend(m)} disabled={busy} className="rounded-md px-2.5 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-50 disabled:opacity-60">
                      Resend invite
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
