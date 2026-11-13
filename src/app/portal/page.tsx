"use client";

import { useState } from "react";
import {
  Car,
  ChevronDown,
  ClipboardCheck,
  LifeBuoy,
  Loader2,
  Plus,
  Receipt,
  Send,
  Wrench,
  X,
} from "lucide-react";
import { cn, formatCurrency, formatDate, formatDateTime, getPriorityColor, getStatusColor } from "@/lib/utils";
import { useAuth } from "@/components/providers/session-provider";
import {
  usePortalCompany,
  usePortalInspections,
  usePortalInvoiceDetail,
  usePortalInvoices,
  usePortalJobCards,
  usePortalTicketComments,
  usePortalTickets,
  usePortalVehicles,
  useOpenPortalTicket,
  useReplyToPortalTicket,
  type PortalTicketInput,
} from "@/lib/hooks/use-portal";
import type { TicketCategory, TicketPriority, TicketRow } from "@/lib/supabase/database.types";

type Tab = "vehicles" | "jobs" | "invoices" | "support";

const label = (s: string) => s.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

const trackerStyle: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-800",
  INACTIVE: "bg-gray-100 text-gray-700",
  FAULTY: "bg-red-100 text-red-800",
  NOT_INSTALLED: "bg-amber-100 text-amber-800",
};

export default function PortalPage() {
  const { profile } = useAuth();
  const { data: company } = usePortalCompany();
  const vehicles = usePortalVehicles();
  const jobs = usePortalJobCards();
  const invoices = usePortalInvoices();
  const tickets = usePortalTickets();
  const [tab, setTab] = useState<Tab>("vehicles");

  const outstanding = (invoices.data ?? [])
    .filter((i) => i.status === "SENT" || i.status === "OVERDUE" || i.status === "PARTIAL")
    .reduce((sum, i) => sum + Number(i.total), 0);
  const openTickets = (tickets.data ?? []).filter((t) => t.status !== "RESOLVED" && t.status !== "CLOSED").length;

  const tabs: { id: Tab; label: string; icon: typeof Car; stat: string }[] = [
    { id: "vehicles", label: "Vehicles & trackers", icon: Car, stat: `${vehicles.data?.length ?? "–"} vehicles` },
    { id: "jobs", label: "Jobs & inspections", icon: Wrench, stat: `${jobs.data?.length ?? "–"} job cards` },
    { id: "invoices", label: "Invoices", icon: Receipt, stat: invoices.data ? `${formatCurrency(outstanding)} due` : "–" },
    { id: "support", label: "Support", icon: LifeBuoy, stat: tickets.data ? `${openTickets} open` : "–" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">
          Welcome{profile ? `, ${profile.name.split(" ")[0]}` : ""}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {company ? `Your ${company.company || company.name} account with ITRACKERX` : "Your account with ITRACKERX"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-3 rounded-xl border bg-white p-4 text-left transition-colors",
              tab === t.id ? "border-brand-500 ring-2 ring-brand-500/15" : "border-slate-200 hover:border-slate-300"
            )}
          >
            <div
              className={cn(
                "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg",
                tab === t.id ? "bg-brand-600 text-white" : "bg-brand-50 text-brand-600"
              )}
            >
              <t.icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{t.label}</p>
              <p className="truncate text-xs text-slate-500">{t.stat}</p>
            </div>
          </button>
        ))}
      </div>

      {tab === "vehicles" && <VehiclesTab />}
      {tab === "jobs" && <JobsTab />}
      {tab === "invoices" && <InvoicesTab />}
      {tab === "support" && <SupportTab />}
    </div>
  );
}

function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
        <h2 className="font-semibold text-slate-900">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function State({ query, empty }: { query: { isLoading: boolean; isError: boolean; error: Error | null }; empty: boolean }) {
  if (query.isLoading)
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  if (query.isError) return <p className="px-5 py-10 text-center text-sm text-red-600">{query.error?.message}</p>;
  if (empty) return <p className="px-5 py-10 text-center text-sm italic text-slate-400">Nothing here yet.</p>;
  return null;
}

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return <span className={cn("inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium", className)}>{children}</span>;
}

const th = "px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500";
const td = "px-5 py-3 text-sm text-slate-700";

function VehiclesTab() {
  const q = usePortalVehicles();
  const rows = q.data ?? [];
  return (
    <Panel title="Vehicles & trackers">
      <State query={q} empty={rows.length === 0} />
      {rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="bg-slate-50">
              <tr>
                <th className={th}>Registration</th>
                <th className={th}>Vehicle</th>
                <th className={th}>Tracker</th>
                <th className={th}>Status</th>
                <th className={th}>Next service</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((v) => (
                <tr key={v.id}>
                  <td className={cn(td, "font-medium text-slate-900")}>{v.registration_number}</td>
                  <td className={td}>
                    {[v.make, v.model].filter(Boolean).join(" ")}
                    {v.year ? <span className="text-slate-400"> · {v.year}</span> : null}
                  </td>
                  <td className={cn(td, "font-mono text-xs")}>{v.tracker_device_id ?? "—"}</td>
                  <td className={td}>
                    <Badge className={trackerStyle[v.tracker_status] ?? "bg-gray-100 text-gray-700"}>{label(v.tracker_status)}</Badge>
                  </td>
                  <td className={td}>{v.next_service_date ? formatDate(v.next_service_date) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

function JobsTab() {
  const jobs = usePortalJobCards();
  const inspections = usePortalInspections();
  const jobRows = jobs.data ?? [];
  const inspectionRows = inspections.data ?? [];
  return (
    <div className="space-y-6">
      <Panel title="Job cards">
        <State query={jobs} empty={jobRows.length === 0} />
        {jobRows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className={th}>Job</th>
                  <th className={th}>Type</th>
                  <th className={th}>Scheduled</th>
                  <th className={th}>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {jobRows.map((j) => (
                  <tr key={j.id}>
                    <td className={td}>
                      <p className="font-medium text-slate-900">{j.title}</p>
                      <p className="text-xs text-slate-400">{j.job_number}</p>
                    </td>
                    <td className={td}>{label(j.job_type)}</td>
                    <td className={td}>{j.scheduled_date ? formatDate(j.scheduled_date) : "—"}</td>
                    <td className={td}>
                      <Badge className={getStatusColor(j.status)}>{label(j.status)}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="Inspection reports">
        <State query={inspections} empty={inspectionRows.length === 0} />
        {inspectionRows.length > 0 && (
          <ul className="divide-y divide-slate-100">
            {inspectionRows.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center gap-x-6 gap-y-1 px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <ClipboardCheck className="h-5 w-5 text-emerald-600" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {i.reg_number || "Vehicle"} {i.inspection_type ? `· ${label(i.inspection_type)}` : ""}
                    </p>
                    <p className="text-xs text-slate-400">
                      {i.inspection_date ? formatDate(i.inspection_date) : formatDate(i.created_at)}
                    </p>
                  </div>
                </div>
                <dl className="ml-auto grid grid-cols-2 gap-x-6 gap-y-0.5 text-xs sm:grid-cols-4">
                  <Field k="Make" v={i.vehicle_make} />
                  <Field k="GPS IMEI" v={i.gps_imei} />
                  <Field k="SIM" v={i.sim_number} />
                  <Field k="Odometer" v={i.odo} />
                </dl>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function Field({ k, v }: { k: string; v: string | null }) {
  return (
    <div>
      <dt className="text-slate-400">{k}</dt>
      <dd className="font-medium text-slate-700">{v || "—"}</dd>
    </div>
  );
}

function InvoicesTab() {
  const q = usePortalInvoices();
  const rows = q.data ?? [];
  const [open, setOpen] = useState<string | null>(null);
  return (
    <Panel title="Invoices">
      <State query={q} empty={rows.length === 0} />
      {rows.length > 0 && (
        <ul className="divide-y divide-slate-100">
          {rows.map((inv) => (
            <li key={inv.id}>
              <button
                onClick={() => setOpen(open === inv.id ? null : inv.id)}
                className="flex w-full flex-wrap items-center gap-x-6 gap-y-1 px-5 py-3.5 text-left hover:bg-slate-50"
              >
                <div className="min-w-[8rem]">
                  <p className="text-sm font-medium text-slate-900">{inv.invoice_number}</p>
                  <p className="text-xs text-slate-400">{inv.issued_date ? formatDate(inv.issued_date) : formatDate(inv.created_at)}</p>
                </div>
                <p className="text-xs text-slate-500">{inv.due_date ? `Due ${formatDate(inv.due_date)}` : ""}</p>
                <div className="ml-auto flex items-center gap-4">
                  <Badge className={getStatusColor(inv.status)}>{label(inv.status)}</Badge>
                  <span className="w-28 text-right text-sm font-semibold text-slate-900">{formatCurrency(Number(inv.total))}</span>
                  <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform", open === inv.id && "rotate-180")} />
                </div>
              </button>
              {open === inv.id && <InvoiceDetail invoiceId={inv.id} subtotal={inv.subtotal} tax={inv.tax} total={inv.total} />}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function InvoiceDetail({ invoiceId, subtotal, tax, total }: { invoiceId: string; subtotal: number; tax: number; total: number }) {
  const q = usePortalInvoiceDetail(invoiceId);
  if (q.isLoading)
    return (
      <div className="flex items-center gap-2 bg-slate-50 px-5 py-4 text-sm text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  const items = q.data?.items ?? [];
  const payments = q.data?.payments ?? [];
  const paid = payments.reduce((s, p) => s + Number(p.amount), 0);
  return (
    <div className="space-y-4 bg-slate-50 px-5 py-4">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-slate-500">
            <th className="pb-1 text-left font-medium">Item</th>
            <th className="pb-1 text-right font-medium">Qty</th>
            <th className="pb-1 text-right font-medium">Price</th>
            <th className="pb-1 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.id} className="text-slate-700">
              <td className="py-1">{it.description}</td>
              <td className="py-1 text-right">{it.quantity}</td>
              <td className="py-1 text-right">{formatCurrency(Number(it.unit_price))}</td>
              <td className="py-1 text-right">{formatCurrency(Number(it.total))}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t border-slate-200 text-slate-700">
          <tr><td colSpan={3} className="pt-2 text-right">Subtotal</td><td className="pt-2 text-right">{formatCurrency(Number(subtotal))}</td></tr>
          <tr><td colSpan={3} className="text-right">Tax</td><td className="text-right">{formatCurrency(Number(tax))}</td></tr>
          <tr className="font-semibold text-slate-900"><td colSpan={3} className="text-right">Total</td><td className="text-right">{formatCurrency(Number(total))}</td></tr>
          {paid > 0 && (
            <>
              <tr><td colSpan={3} className="text-right">Paid</td><td className="text-right">−{formatCurrency(paid)}</td></tr>
              <tr className="font-semibold text-slate-900"><td colSpan={3} className="text-right">Balance</td><td className="text-right">{formatCurrency(Number(total) - paid)}</td></tr>
            </>
          )}
        </tfoot>
      </table>
      {payments.length > 0 && (
        <p className="text-xs text-slate-500">
          Payments: {payments.map((p) => `${formatCurrency(Number(p.amount))} on ${formatDate(p.paid_at)} (${label(p.method)})`).join("; ")}
        </p>
      )}
    </div>
  );
}

const categories: TicketCategory[] = ["TECHNICAL", "DEVICE", "GPS", "INSTALLATION", "BILLING", "ACCOUNT", "GENERAL", "OTHER"];
const priorities: TicketPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

function SupportTab() {
  const q = usePortalTickets();
  const rows = q.data ?? [];
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const selected = rows.find((t) => t.id === openId) ?? null;

  if (selected) return <TicketThread ticket={selected} onBack={() => setOpenId(null)} />;

  return (
    <Panel
      title="Support tickets"
      action={
        !creating && (
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" /> New ticket
          </button>
        )
      }
    >
      {creating && <NewTicketForm onDone={() => setCreating(false)} />}
      <State query={q} empty={rows.length === 0 && !creating} />
      {rows.length > 0 && (
        <ul className="divide-y divide-slate-100">
          {rows.map((t) => (
            <li key={t.id}>
              <button onClick={() => setOpenId(t.id)} className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3.5 text-left hover:bg-slate-50">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{t.subject}</p>
                  <p className="text-xs text-slate-400">
                    {t.ticket_number} · {label(t.category)} · {formatDate(t.created_at)}
                  </p>
                </div>
                <Badge className={getPriorityColor(t.priority)}>{label(t.priority)}</Badge>
                <Badge className={getStatusColor(t.status)}>{label(t.status)}</Badge>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

const field =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20";

function NewTicketForm({ onDone }: { onDone: () => void }) {
  const open = useOpenPortalTicket();
  const [form, setForm] = useState<PortalTicketInput>({ subject: "", description: "", category: "TECHNICAL", priority: "MEDIUM" });
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        open.mutate(form, { onSuccess: onDone });
      }}
      className="space-y-3 border-b border-slate-200 bg-brand-50/40 px-5 py-4"
    >
      <input required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Subject" className={field} />
      <textarea
        required
        rows={4}
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
        placeholder="Describe the problem: which vehicle, what you see, since when…"
        className={field}
      />
      <div className="flex flex-wrap items-center gap-3">
        <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as TicketCategory })} className={cn(field, "w-auto")}>
          {categories.map((c) => (
            <option key={c} value={c}>{label(c)}</option>
          ))}
        </select>
        <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as TicketPriority })} className={cn(field, "w-auto")}>
          {priorities.map((p) => (
            <option key={p} value={p}>{label(p)} priority</option>
          ))}
        </select>
        <div className="ml-auto flex gap-2">
          <button type="button" onClick={onDone} className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100">
            Cancel
          </button>
          <button
            type="submit"
            disabled={open.isPending}
            className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {open.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Submit ticket
          </button>
        </div>
      </div>
    </form>
  );
}

function TicketThread({ ticket, onBack }: { ticket: TicketRow; onBack: () => void }) {
  const { profile } = useAuth();
  const comments = usePortalTicketComments(ticket.id);
  const reply = useReplyToPortalTicket(ticket.id);
  const [text, setText] = useState("");
  const closed = ticket.status === "CLOSED";

  return (
    <Panel
      title={`${ticket.ticket_number} · ${ticket.subject}`}
      action={
        <button onClick={onBack} aria-label="Back to tickets" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
          <X className="h-4 w-4" />
        </button>
      }
    >
      <div className="space-y-4 px-5 py-4">
        <div className="flex flex-wrap gap-2">
          <Badge className={getStatusColor(ticket.status)}>{label(ticket.status)}</Badge>
          <Badge className={getPriorityColor(ticket.priority)}>{label(ticket.priority)}</Badge>
          <Badge className="bg-slate-100 text-slate-700">{label(ticket.category)}</Badge>
        </div>
        <Message author={ticket.customer_name} at={ticket.created_at} mine={ticket.created_by_id === profile?.id} text={ticket.description} />
        {comments.isLoading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
        {(comments.data ?? []).map((c) => (
          <Message key={c.id} author={c.author_name} at={c.created_at} mine={c.author_id === profile?.id} text={c.content} />
        ))}
      </div>
      {closed ? (
        <p className="border-t border-slate-200 px-5 py-3 text-sm text-slate-500">
          This ticket is closed. Open a new ticket if you need more help.
        </p>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim()) reply.mutate(text.trim(), { onSuccess: () => setText("") });
          }}
          className="flex gap-2 border-t border-slate-200 px-5 py-3"
        >
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a reply…" className={field} />
          <button
            type="submit"
            disabled={reply.isPending || !text.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {reply.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send
          </button>
        </form>
      )}
    </Panel>
  );
}

function Message({ author, at, mine, text }: { author: string; at: string; mine: boolean; text: string }) {
  return (
    <div className={cn("max-w-[85%] rounded-xl px-4 py-3", mine ? "ml-auto bg-brand-50" : "bg-slate-100")}>
      <p className="mb-1 text-xs text-slate-500">
        <span className="font-medium text-slate-700">{mine ? "You" : author}</span> · {formatDateTime(at)}
      </p>
      <p className="whitespace-pre-wrap text-sm text-slate-800">{text}</p>
    </div>
  );
}
