"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Mail, Send, UserCheck, UserX, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/session-provider";
import type { PortalUser } from "@/app/api/customers/[id]/portal-users/route";

const statusStyle: Record<PortalUser["status"], string> = {
  active: "bg-emerald-50 text-emerald-700",
  invited: "bg-amber-50 text-amber-700",
  deactivated: "bg-gray-100 text-gray-500",
};

/** Customer drawer section: who from this customer can sign in to the client portal. Admins and managers only. */
export function PortalAccess({ customerId, defaultEmail }: { customerId: string; defaultEmail?: string | null }) {
  const { profile } = useAuth();
  const canManage = profile?.role === "ADMIN" || profile?.role === "MANAGER";
  const url = `/api/customers/${customerId}/portal-users`;

  const [users, setUsers] = useState<PortalUser[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(url);
    const json = await res.json().catch(() => ({}));
    if (json.ok) {
      setUsers(json.users);
      setLoadError(null);
    } else {
      setLoadError(json.error ?? "Couldn't load portal users.");
    }
  }, [url]);

  useEffect(() => {
    if (canManage) load();
  }, [canManage, load]);

  if (!canManage) return null;

  async function call(key: string, init: RequestInit, success: string) {
    setBusy(key);
    try {
      const res = await fetch(init.method === "DELETE" ? key : url, {
        ...init,
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json().catch(() => ({}));
      if (!json.ok) throw new Error(json.error ?? "Something went wrong.");
      toast.success(success);
      await load();
      return true;
    } catch (err) {
      toast.error((err as Error).message);
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    const ok = await call(
      "invite",
      { method: "POST", body: JSON.stringify({ name, email }) },
      `Invitation sent to ${email.trim()}`
    );
    if (ok) {
      setShowForm(false);
      setName("");
      setEmail("");
    }
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Client portal</h4>
        {!showForm && (
          <button
            onClick={() => {
              setEmail(defaultEmail ?? "");
              setShowForm(true);
            }}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
          >
            <Send className="h-3.5 w-3.5" />
            Invite to portal
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={invite} className="mb-3 space-y-2 rounded-lg border border-blue-100 bg-blue-50/40 p-3">
          <p className="text-xs text-gray-500">
            They&apos;ll get an email to create a password, then see this customer&apos;s vehicles, job cards,
            approved inspections, invoices and support tickets.
          </p>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy === "invite"}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {busy === "invite" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send invite
            </button>
          </div>
        </form>
      )}

      {loadError ? (
        <p className="text-sm text-red-600">{loadError}</p>
      ) : users === null ? (
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : users.length === 0 ? (
        !showForm && <p className="text-sm italic text-gray-400">No one from this customer has portal access yet.</p>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
          {users.map((u) => (
            <li key={u.email} className="flex items-center gap-3 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">{u.name}</p>
                <p className="truncate text-xs text-gray-500">{u.email}</p>
              </div>
              <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium capitalize", statusStyle[u.status])}>
                {u.status}
              </span>
              <div className="flex items-center gap-1">
                {u.status === "invited" && (
                  <>
                    <IconButton
                      title="Re-send invitation"
                      busy={busy === `resend:${u.email}`}
                      onClick={() =>
                        call(`resend:${u.email}`, { method: "POST", body: JSON.stringify({ email: u.email, resend: true }) }, `Invitation re-sent to ${u.email}`)
                      }
                    >
                      <Mail className="h-4 w-4" />
                    </IconButton>
                    {u.id === null && (
                      <IconButton
                        title="Cancel invitation"
                        busy={busy === `${url}?email=${encodeURIComponent(u.email)}`}
                        onClick={() => call(`${url}?email=${encodeURIComponent(u.email)}`, { method: "DELETE" }, "Invitation cancelled")}
                      >
                        <X className="h-4 w-4" />
                      </IconButton>
                    )}
                  </>
                )}
                {u.id && u.status !== "invited" && (
                  <IconButton
                    title={u.status === "active" ? "Turn off portal access" : "Turn portal access back on"}
                    busy={busy === `toggle:${u.id}`}
                    onClick={() =>
                      call(
                        `toggle:${u.id}`,
                        { method: "PATCH", body: JSON.stringify({ id: u.id, active: u.status !== "active" }) },
                        u.status === "active" ? `${u.name} can no longer sign in to the portal` : `${u.name}'s portal access is back on`
                      )
                    }
                  >
                    {u.status === "active" ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                  </IconButton>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function IconButton({
  title,
  busy,
  onClick,
  children,
}: {
  title: string;
  busy: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      title={title}
      aria-label={title}
      disabled={busy}
      onClick={onClick}
      className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : children}
    </button>
  );
}
