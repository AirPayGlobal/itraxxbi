"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Download, Eye, Link2, Loader2, Search, Trash2, Upload, Wallet, X } from "lucide-react";
import { cn, formatCurrency, formatDateTime, getStatusColor } from "@/lib/utils";
import { ImportDialog, type ImportField, type MappedRow, type RowCheck } from "@/components/data-import/import-dialog";
import { RecordFiles } from "@/components/files/record-files";
import { downloadText, parseAmount, parseDate, toCsv } from "@/lib/import/parse";
import { useInvoices, type Invoice } from "@/lib/hooks/use-invoices";
import { useCustomers } from "@/lib/hooks/use-customers";
import {
  invoiceMatcher,
  loadExistingPaymentKeys,
  loadMatchableInvoices,
  methodLabel,
  parseMethod,
  paymentKey,
  useDeletePayment,
  useImportPayments,
  useMatchPayment,
  usePayments,
  type Payment,
  type PaymentDraft,
} from "@/lib/hooks/use-payments";

// ---------------------------------------------------------------------------
// Import definition
// ---------------------------------------------------------------------------

const FIELDS: ImportField[] = [
  {
    key: "date",
    label: "Date",
    required: true,
    aliases: ["date", "transaction date", "payment date", "value date", "posting date", "paid at", "trans date"],
    example: "05/10/2026",
  },
  {
    key: "amount",
    label: "Amount",
    required: true,
    aliases: ["credit", "credit amount", "amount", "deposit", "deposits", "money in", "received", "amount received", "paid in"],
    example: "4500.00",
  },
  {
    key: "reference",
    label: "Reference / description",
    aliases: ["reference", "description", "details", "narrative", "transaction description", "memo", "ref", "particulars"],
    example: "EFT INV-2026-1234 Example Logistics",
  },
  { key: "payer", label: "Payer", aliases: ["payer", "payer name", "remitter", "depositor", "from", "paid by", "customer", "name"], example: "Example Logistics" },
  { key: "method", label: "Method", aliases: ["method", "payment method", "type", "transaction type", "channel"], example: "EFT" },
  { key: "invoice_number", label: "Invoice number", aliases: ["invoice number", "invoice no", "inv no", "invoice", "inv"], example: "INV-2026-1234" },
];

async function checkRows(rows: MappedRow[]): Promise<RowCheck<PaymentDraft>[]> {
  const dates = rows.map((r) => parseDate(r.values.date)).filter((d): d is string => !!d).sort();
  const [invoices, existing] = await Promise.all([
    loadMatchableInvoices(),
    dates.length ? loadExistingPaymentKeys(dates[0], dates[dates.length - 1]) : Promise.resolve(new Set<string>()),
  ]);
  const match = invoiceMatcher(invoices);
  const seen = new Map<string, number>();

  return rows.map(({ line, values }): RowCheck<PaymentDraft> => {
    if (!FIELDS.some((f) => values[f.key]?.trim())) return { line, ok: false, error: "Blank row" };
    const date = parseDate(values.date);
    if (!date) return { line, ok: false, error: values.date ? `Couldn't read the date "${values.date}"` : "No date" };
    const amount = parseAmount(values.amount);
    if (amount === null) {
      return { line, ok: false, error: values.amount ? `Couldn't read the amount "${values.amount}"` : "No amount (not a credit)" };
    }
    if (amount === 0) return { line, ok: false, error: "Zero amount" };
    if (amount < 0) return { line, ok: false, error: `Not a credit (${formatCurrency(amount)} going out)` };

    const reference = values.reference.trim() || null;
    const key = paymentKey(date, amount, reference);
    if (existing.has(key)) return { line, ok: false, error: "Already recorded (same date, amount and reference)" };

    const notes: string[] = [];
    const earlier = seen.get(key);
    if (earlier) notes.push(`Same date, amount and reference as row ${earlier}`);
    else seen.set(key, line);

    const invoiceText = values.invoice_number.trim();
    const inv = match(invoiceText, reference ?? "");
    if (invoiceText && !inv) notes.push(`Invoice "${invoiceText}" not found; imported unmatched`);

    const record: PaymentDraft = {
      paid_at: date,
      amount: Math.round(amount * 100) / 100,
      reference,
      payer_name: values.payer.trim() || null,
      method: parseMethod(values.method),
      invoice_id: inv?.id ?? null,
      customer_id: inv?.customer_id ?? null,
      invoice_number: inv?.invoice_number ?? null,
    };
    return notes.length ? { line, ok: true, record, note: notes.join(". ") } : { line, ok: true, record };
  });
}

/** "2026-10-05T00:00:00+00:00" → "5 Oct 2026", without shifting the day across time zones. */
function day(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, d))
  );
}

const OPEN_STATUSES = ["SENT", "OVERDUE", "PARTIAL"];
const matchFilters = ["All", "Matched", "Unmatched"] as const;

// ---------------------------------------------------------------------------
// Tab
// ---------------------------------------------------------------------------

export function PaymentsTab({ canEdit }: { canEdit: boolean }) {
  const { data: payments = [], isLoading, isError, error } = usePayments();
  const { data: invoices = [] } = useInvoices();
  const { data: customers = [] } = useCustomers();
  const importPayments = useImportPayments();

  const [matchFilter, setMatchFilter] = useState<(typeof matchFilters)[number]>("All");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);

  const customerName = useMemo(() => new Map(customers.map((c) => [c.id, c.name])), [customers]);
  const invoiceById = useMemo(() => new Map(invoices.map((i) => [i.id, i])), [invoices]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return payments.filter((p) => {
      if (matchFilter === "Matched" && !p.invoice_id) return false;
      if (matchFilter === "Unmatched" && p.invoice_id) return false;
      const d = p.paid_at.slice(0, 10);
      if (from && d < from) return false;
      if (to && d > to) return false;
      if (!q) return true;
      const inv = p.invoice_id ? invoiceById.get(p.invoice_id) : undefined;
      return [p.payer_name, p.reference, p.customer_id ? customerName.get(p.customer_id) : null, inv?.invoice_number]
        .some((s) => (s ?? "").toLowerCase().includes(q));
    });
  }, [payments, matchFilter, from, to, search, invoiceById, customerName]);

  const totals = useMemo(() => {
    let total = 0;
    let matched = 0;
    let unmatched = 0;
    let unmatchedCount = 0;
    for (const p of filtered) {
      total += p.amount;
      if (p.invoice_id) matched += p.amount;
      else {
        unmatched += p.amount;
        unmatchedCount++;
      }
    }
    return { total, matched, unmatched, unmatchedCount };
  }, [filtered]);

  const viewing = viewId ? payments.find((p) => p.id === viewId) ?? null : null;
  const filtersActive = matchFilter !== "All" || !!from || !!to || !!search;

  function exportCsv() {
    const rows = filtered.map((p) => {
      const inv = p.invoice_id ? invoiceById.get(p.invoice_id) : undefined;
      return [
        p.paid_at.slice(0, 10),
        p.payer_name ?? "",
        p.customer_id ? customerName.get(p.customer_id) ?? "" : "",
        inv?.invoice_number ?? "",
        methodLabel(p.method),
        p.reference ?? "",
        p.amount.toFixed(2),
        p.notes ?? "",
      ];
    });
    const stamp = new Date().toISOString().slice(0, 10);
    downloadText(
      `payments-${stamp}.csv`,
      toCsv(["Date", "Payer", "Customer", "Invoice", "Method", "Reference", "Amount (N$)", "Notes"], rows)
    );
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {matchFilters.map((f) => (
              <button
                key={f}
                onClick={() => setMatchFilter(f)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  matchFilter === f ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={exportCsv}
              disabled={!filtered.length}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
            {canEdit && (
              <button
                onClick={() => setShowImport(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
              >
                <Upload className="h-4 w-4" />
                Import payments
              </button>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="text-xs font-medium text-slate-500">
            From
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </label>
          <label className="text-xs font-medium text-slate-500">
            To
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </label>
          <div className="relative w-full sm:ml-auto sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search payer, reference, invoice..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          {filtersActive && (
            <button
              onClick={() => {
                setMatchFilter("All");
                setFrom("");
                setTo("");
                setSearch("");
              }}
              className="rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-100"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Totals */}
      {!isLoading && !isError && payments.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Received{filtersActive ? " (filtered)" : ""}</p>
            <p className="mt-1 text-xl font-bold text-slate-900">{formatCurrency(totals.total)}</p>
            <p className="mt-1 text-xs text-slate-500">
              {filtered.length} {filtered.length === 1 ? "payment" : "payments"}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Matched to invoices</p>
            <p className="mt-1 text-xl font-bold text-green-700">{formatCurrency(totals.matched)}</p>
            <p className="mt-1 text-xs text-slate-500">{filtered.length - totals.unmatchedCount} payments</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Unmatched</p>
            <p className={cn("mt-1 text-xl font-bold", totals.unmatchedCount ? "text-amber-600" : "text-slate-900")}>
              {formatCurrency(totals.unmatched)}
            </p>
            <p className="mt-1 text-xs text-slate-500">{totals.unmatchedCount} payments to match</p>
          </div>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white py-16 shadow-sm">
          <Loader2 className="mb-3 h-8 w-8 animate-spin text-blue-500" />
          <p className="text-sm text-slate-500">Loading payments…</p>
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 py-16 shadow-sm">
          <p className="text-lg font-medium text-red-700">Failed to load payments</p>
          <p className="mt-1 text-sm text-red-500">{(error as Error)?.message ?? "Please try again."}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
          <Wallet className="mb-3 h-12 w-12 text-slate-300" />
          <p className="text-lg font-medium text-slate-500">{payments.length ? "No payments match your filters" : "No payments recorded"}</p>
          <p className="mt-1 max-w-md text-sm text-slate-400">
            {payments.length
              ? "Try adjusting the filters or date range."
              : canEdit
                ? "Import a bank statement export (CSV or Excel) with \"Import payments\". Payments are matched to invoices by the invoice number in the reference."
                : "Payments appear here once an admin or manager imports them."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Payer / customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Invoice</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Method</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Reference</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Amount</th>
                  <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((p) => {
                  const inv = p.invoice_id ? invoiceById.get(p.invoice_id) : undefined;
                  const cust = p.customer_id ? customerName.get(p.customer_id) : undefined;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">{day(p.paid_at)}</td>
                      <td className="px-6 py-4 text-sm">
                        <p className="font-medium text-slate-900">{cust ?? p.payer_name ?? "—"}</p>
                        {cust && p.payer_name && p.payer_name !== cust && <p className="text-xs text-slate-500">{p.payer_name}</p>}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        {p.invoice_id ? (
                          <span className="font-medium text-blue-600">{inv?.invoice_number ?? "Invoice"}</span>
                        ) : (
                          <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">Unmatched</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">{methodLabel(p.method)}</td>
                      <td className="max-w-xs truncate px-6 py-4 text-sm text-slate-500" title={p.reference ?? undefined}>
                        {p.reference ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-semibold tabular-nums text-slate-900">
                        {formatCurrency(p.amount)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setViewId(p.id)}
                            className="rounded p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-blue-600"
                            title={canEdit && !p.invoice_id ? "Match / view" : "View"}
                          >
                            {canEdit && !p.invoice_id ? <Link2 className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200 bg-slate-50 text-sm font-semibold text-slate-900">
                  <td className="px-6 py-3" colSpan={5}>
                    Total · {filtered.length} {filtered.length === 1 ? "payment" : "payments"}
                  </td>
                  <td className="whitespace-nowrap px-6 py-3 text-right tabular-nums">{formatCurrency(totals.total)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {viewing && (
        <PaymentDetail
          payment={viewing}
          canEdit={canEdit}
          invoices={invoices}
          payments={payments}
          customerName={customerName}
          onClose={() => setViewId(null)}
        />
      )}

      <ImportDialog<PaymentDraft>
        open={showImport}
        onClose={() => setShowImport(false)}
        title="Import payments"
        description="Upload a bank statement export or payments list (CSV or Excel). Only money received is imported; payments are matched to invoices by invoice number."
        fields={FIELDS}
        templateName="payments-import-template"
        validate={checkRows}
        importRows={(records, file) => importPayments.mutateAsync({ records, file })}
        preview={[
          { label: "Date", value: (r) => day(r.paid_at) },
          { label: "Payer", value: (r) => r.payer_name ?? "—" },
          { label: "Reference", value: (r) => r.reference ?? "—" },
          { label: "Method", value: (r) => methodLabel(r.method) },
          { label: "Invoice", value: (r) => r.invoice_number ?? "Unmatched" },
          { label: "Amount", value: (r) => formatCurrency(r.amount) },
        ]}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detail / match modal
// ---------------------------------------------------------------------------

function PaymentDetail({
  payment,
  canEdit,
  invoices,
  payments,
  customerName,
  onClose,
}: {
  payment: Payment;
  canEdit: boolean;
  invoices: Invoice[];
  payments: Payment[];
  customerName: Map<string, string>;
  onClose: () => void;
}) {
  const matchPayment = useMatchPayment();
  const deletePayment = useDeletePayment();
  const [invoiceQuery, setInvoiceQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [invoiceId, setInvoiceId] = useState("");

  const inv = payment.invoice_id ? invoices.find((i) => i.id === payment.invoice_id) : undefined;
  const cust = payment.customer_id ? customerName.get(payment.customer_id) : undefined;

  const paidByInvoice = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of payments) if (p.invoice_id) m.set(p.invoice_id, (m.get(p.invoice_id) ?? 0) + p.amount);
    return m;
  }, [payments]);

  const options = useMemo(() => {
    const q = invoiceQuery.trim().toLowerCase();
    return invoices
      .filter((i) => i.status !== "CANCELLED" && (showAll || OPEN_STATUSES.includes(i.status)))
      .map((i) => ({ inv: i, balance: Number(i.total) - (paidByInvoice.get(i.id) ?? 0) }))
      .filter(
        ({ inv: i }) =>
          !q || i.invoice_number.toLowerCase().includes(q) || (customerName.get(i.customer_id) ?? "").toLowerCase().includes(q)
      )
      .sort((a, b) => {
        // Invoices whose balance equals this payment first, then newest number first.
        const am = Math.abs(a.balance - payment.amount) < 0.005 ? 0 : 1;
        const bm = Math.abs(b.balance - payment.amount) < 0.005 ? 0 : 1;
        return am - bm || b.inv.invoice_number.localeCompare(a.inv.invoice_number, undefined, { numeric: true });
      });
  }, [invoices, showAll, invoiceQuery, paidByInvoice, customerName, payment.amount]);

  function handleMatch() {
    const target = invoices.find((i) => i.id === invoiceId);
    if (!target) return;
    matchPayment.mutate({ paymentId: payment.id, invoice: target }, { onSuccess: () => setInvoiceId("") });
  }

  function handleDelete() {
    if (!window.confirm(`Delete this payment of ${formatCurrency(payment.amount)} on ${day(payment.paid_at)}? This cannot be undone.`)) return;
    deletePayment.mutate(payment.id, { onSuccess: onClose });
  }

  const field = (label: string, value: React.ReactNode) => (
    <div>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <div className="text-sm text-slate-800">{value}</div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Payment · {formatCurrency(payment.amount)}</h2>
            <p className="text-sm text-slate-500">{day(payment.paid_at)}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-5 overflow-y-auto px-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            {field("Payer", payment.payer_name ?? "—")}
            {field("Customer", cust ?? "—")}
            {field("Method", methodLabel(payment.method))}
            {field(
              "Invoice",
              payment.invoice_id ? (
                <span className="inline-flex items-center gap-2">
                  <span className="font-medium text-blue-600">{inv?.invoice_number ?? "Invoice"}</span>
                  {inv && (
                    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", getStatusColor(inv.status))}>
                      {inv.status}
                    </span>
                  )}
                </span>
              ) : (
                <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">Unmatched</span>
              )
            )}
            <div className="col-span-2">{field("Reference", <span className="break-words">{payment.reference ?? "—"}</span>)}</div>
            {payment.notes && <div className="col-span-2">{field("Notes", <span className="whitespace-pre-wrap">{payment.notes}</span>)}</div>}
            {field("Recorded", formatDateTime(payment.created_at))}
          </div>

          {canEdit && !payment.invoice_id && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <h4 className="mb-2 text-sm font-semibold text-slate-800">Match to an invoice</h4>
              <div className="space-y-2">
                <input
                  type="text"
                  value={invoiceQuery}
                  onChange={(e) => setInvoiceQuery(e.target.value)}
                  placeholder="Search invoice number or customer..."
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <select
                  value={invoiceId}
                  onChange={(e) => setInvoiceId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">{options.length ? `Select an invoice (${options.length})…` : "No invoices found"}</option>
                  {options.map(({ inv: i, balance }) => (
                    <option key={i.id} value={i.id}>
                      {i.invoice_number} · {customerName.get(i.customer_id) ?? "—"} · balance {formatCurrency(balance)} · {i.status}
                      {Math.abs(balance - payment.amount) < 0.005 ? " · amount matches" : ""}
                    </option>
                  ))}
                </select>
                <div className="flex items-center justify-between gap-3">
                  <label className="flex items-center gap-2 text-xs text-slate-600">
                    <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
                    Include draft and paid invoices
                  </label>
                  <button
                    onClick={handleMatch}
                    disabled={!invoiceId || matchPayment.isPending}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {matchPayment.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Match
                  </button>
                </div>
                <p className="text-xs text-slate-500">
                  Sent, overdue and part-paid invoices become Paid when their payments cover the total, or Part-paid otherwise.
                </p>
              </div>
            </div>
          )}

          <RecordFiles area="payment" entityId={payment.id} canEdit={canEdit} title="Proof of payment" emptyText="No proof of payment attached." />
        </div>

        <div className="flex justify-between gap-3 border-t border-slate-200 px-6 py-4">
          {canEdit ? (
            <button
              onClick={handleDelete}
              disabled={deletePayment.isPending}
              className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              {deletePayment.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Delete
            </button>
          ) : (
            <span />
          )}
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
