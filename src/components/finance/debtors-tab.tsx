"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Download,
  Link2,
  Loader2,
  Search,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { ImportDialog, type ImportField, type MappedRow, type RowCheck } from "@/components/data-import/import-dialog";
import { RecordFiles } from "@/components/files/record-files";
import { downloadText, parseAmount, toCsv } from "@/lib/import/parse";
import {
  AGE_BUCKETS,
  formatAsOf,
  lastDayOfPreviousMonth,
  loadCustomerMatcher,
  useDebtorLines,
  useDebtorReports,
  useDeleteDebtorReport,
  useImportDebtorReport,
  type AgeBucketKey,
  type DebtorLine,
  type DebtorLineDraft,
} from "@/lib/hooks/use-debtors";

// ---------------------------------------------------------------------------
// Import definition
// ---------------------------------------------------------------------------

const FIELDS: ImportField[] = [
  {
    key: "account_number",
    label: "Account number",
    // No bare "account"/"code": partial matching would grab "Account Name".
    aliases: ["account number", "account no", "acc no", "acc number", "account code", "customer code", "debtor code", "customer account"],
    example: "C0001",
  },
  {
    key: "customer_name",
    label: "Customer name",
    required: true,
    aliases: ["customer name", "debtor name", "account name", "name", "customer", "debtor", "client", "client name"],
    example: "Example Logistics (Pty) Ltd",
  },
  { key: "current_amount", label: "Current", aliases: ["current", "current amount", "not due", "0-30"], example: "12500.00" },
  { key: "days_30", label: "30 days", aliases: ["30 days", "30", "31-60", "30 day", "1 month"], example: "4200.00" },
  { key: "days_60", label: "60 days", aliases: ["60 days", "60", "61-90", "60 day", "2 months"], example: "0.00" },
  { key: "days_90", label: "90 days", aliases: ["90 days", "90", "91-120", "90 day", "3 months"], example: "1500.00" },
  {
    key: "days_120_plus",
    label: "120+ days",
    aliases: ["120+ days", "120 days", "120+", "over 120", "120 plus", "121+", "150 days", "150+", "4 months", "older"],
    example: "800.00",
  },
  { key: "total", label: "Total", aliases: ["total", "total due", "total outstanding", "balance", "outstanding", "amount due"], example: "19000.00" },
];

type Draft = DebtorLineDraft;

const BUCKET_COLORS: Record<AgeBucketKey, string> = {
  current_amount: "#22c55e",
  days_30: "#1e8fe0",
  days_60: "#f59e0b",
  days_90: "#f97316",
  days_120_plus: "#ef4444",
};

/** "Total", "Totals:", "Grand total", "Sub-total", "Report total" — not a customer called "Total Logistics". */
const TOTAL_ROW = /^(grand|sub|report)?[\s-]*totals?[\s:]*$/i;

async function checkRows(rows: MappedRow[]): Promise<RowCheck<Draft>[]> {
  const match = await loadCustomerMatcher();
  return rows.map(({ line, values }): RowCheck<Draft> => {
    const name = values.customer_name.trim();
    const account = values.account_number.trim();
    const filled = FIELDS.some((f) => values[f.key]?.trim());
    if (!filled) return { line, ok: false, error: "Blank row" };
    if (TOTAL_ROW.test(name) || (!name && TOTAL_ROW.test(account))) return { line, ok: false, error: "Total row" };
    if (!name) return { line, ok: false, error: "No customer name" };

    const amounts: Partial<Record<AgeBucketKey | "total", number | null>> = {};
    for (const key of [...AGE_BUCKETS.map((b) => b.key), "total"] as const) {
      const raw = values[key];
      const n = parseAmount(raw);
      if (raw && n === null) {
        const label = FIELDS.find((f) => f.key === key)?.label ?? key;
        return { line, ok: false, error: `Couldn't read ${label} amount "${raw}"` };
      }
      amounts[key] = n;
    }
    const buckets = AGE_BUCKETS.map((b) => amounts[b.key] ?? 0);
    const anyBucket = AGE_BUCKETS.some((b) => amounts[b.key] != null);
    if (!anyBucket && amounts.total == null) return { line, ok: false, error: "No amounts" };
    const sum = Math.round(buckets.reduce((s, n) => s + n, 0) * 100) / 100;
    const total = amounts.total ?? sum;
    let note: string | undefined;
    if (amounts.total != null && anyBucket && Math.abs(amounts.total - sum) > 1) {
      note = `Total ${formatCurrency(amounts.total)} doesn't match the buckets (${formatCurrency(sum)}); kept the file's total`;
    }
    const record: Draft = {
      customer_id: match(account, name),
      account_number: account || null,
      customer_name: name,
      current_amount: amounts.current_amount ?? 0,
      days_30: amounts.days_30 ?? 0,
      days_60: amounts.days_60 ?? 0,
      days_90: amounts.days_90 ?? 0,
      days_120_plus: amounts.days_120_plus ?? 0,
      total,
    };
    return note ? { line, ok: true, record, note } : { line, ok: true, record };
  });
}

function bucketsDisagree(l: Draft) {
  const sum = AGE_BUCKETS.reduce((s, b) => s + l[b.key], 0);
  return Math.abs(l.total - sum) > 1;
}

function downloadTemplate() {
  downloadText("debtors-age-analysis-template.csv", toCsv(FIELDS.map((f) => f.label), [FIELDS.map((f) => f.example ?? "")]));
}

function SortIcon({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  if (!active) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
  return dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
}

// ---------------------------------------------------------------------------
// Tab
// ---------------------------------------------------------------------------

type SortKey = "customer_name" | "account_number" | AgeBucketKey | "total";

export function DebtorsTab({ canEdit }: { canEdit: boolean }) {
  const { data: reports = [], isLoading, isError, error } = useDebtorReports();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const report = reports.find((r) => r.id === selectedId) ?? reports[0] ?? null;
  const { data: lines = [], isLoading: linesLoading, isError: linesError, error: linesErr } = useDebtorLines(report?.id ?? null);
  const deleteReport = useDeleteDebtorReport();

  const [showImport, setShowImport] = useState(false);
  const [asOf, setAsOf] = useState(lastDayOfPreviousMonth);
  const [importNotes, setImportNotes] = useState("");
  const importReport = useImportDebtorReport((id) => setSelectedId(id));

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "total", dir: "desc" });

  const totals = useMemo(() => {
    const t = { current_amount: 0, days_30: 0, days_60: 0, days_90: 0, days_120_plus: 0, total: 0 };
    for (const l of lines) {
      for (const b of AGE_BUCKETS) t[b.key] += l[b.key];
      t.total += l.total;
    }
    return t;
  }, [lines]);

  const chartData = AGE_BUCKETS.map((b) => ({ key: b.key, bucket: b.label, amount: totals[b.key] }));

  const topDebtors = useMemo(
    () =>
      [...lines]
        .sort((a, b) => b.total - a.total)
        .slice(0, 10)
        .map((l) => ({
          name: l.customer_name.length > 22 ? `${l.customer_name.slice(0, 21)}…` : l.customer_name,
          ...Object.fromEntries(AGE_BUCKETS.map((b) => [b.key, l[b.key]])),
        })),
    [lines]
  );

  const visibleLines = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? lines.filter((l) => l.customer_name.toLowerCase().includes(q) || (l.account_number ?? "").toLowerCase().includes(q))
      : lines;
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av ?? "").localeCompare(String(bv ?? ""), undefined, { numeric: true }) * dir;
    });
  }, [lines, search, sort]);

  const visibleTotals = useMemo(() => {
    const t: Record<AgeBucketKey | "total", number> = { current_amount: 0, days_30: 0, days_60: 0, days_90: 0, days_120_plus: 0, total: 0 };
    for (const l of visibleLines) {
      for (const b of AGE_BUCKETS) t[b.key] += l[b.key];
      t.total += l.total;
    }
    return t;
  }, [visibleLines]);

  const sameDateExists = reports.some((r) => r.as_of.slice(0, 10) === asOf);
  const unlinked = lines.filter((l) => !l.customer_id).length;

  function openImport() {
    setAsOf(lastDayOfPreviousMonth());
    setImportNotes("");
    setShowImport(true);
  }

  function toggleSort(key: SortKey) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "customer_name" || key === "account_number" ? "asc" : "desc" }));
  }

  function handleDelete() {
    if (!report) return;
    if (!window.confirm(`Delete the age analysis as of ${formatAsOf(report.as_of)} and its attached file? This cannot be undone.`)) return;
    deleteReport.mutate(report.id, { onSuccess: () => setSelectedId(null) });
  }

  const importDialog = (
    <ImportDialog<Draft>
      open={showImport}
      onClose={() => setShowImport(false)}
      title="Upload debtors age analysis"
      description="Upload the age analysis exported from your accounting system (CSV or Excel). Each row is one customer account."
      fields={FIELDS}
      templateName="debtors-age-analysis-template"
      validate={checkRows}
      importRows={async (records, file) => {
        if (!asOf) throw new Error("Choose the \"As of\" date.");
        const mismatched = records.filter(bucketsDisagree).length;
        const unmatched = records.filter((r) => !r.customer_id).length;
        const auto = [
          mismatched ? `${mismatched} ${mismatched === 1 ? "line has" : "lines have"} a total that differs from the buckets (file total kept).` : "",
          unmatched ? `${unmatched} ${unmatched === 1 ? "line isn't" : "lines aren't"} linked to a customer.` : "",
        ].filter(Boolean);
        const notes = [importNotes.trim(), ...auto].filter(Boolean).join("\n") || null;
        const res = await importReport.mutateAsync({ asOf, notes, lines: records, file });
        return res.summary;
      }}
      extra={
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">
            As of <span className="text-red-500">*</span>
            <input
              type="date"
              required
              value={asOf}
              onChange={(e) => setAsOf(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {sameDateExists && (
              <span className="mt-1 block text-xs font-normal text-amber-700">
                An age analysis as of {formatAsOf(asOf)} already exists. This upload will be added alongside it.
              </span>
            )}
          </label>
          <label className="text-sm font-medium text-slate-700">
            Notes
            <input
              type="text"
              value={importNotes}
              onChange={(e) => setImportNotes(e.target.value)}
              placeholder="Optional, e.g. exported from Pastel"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </label>
        </div>
      }
      preview={[
        { label: "Account", value: (r) => r.account_number ?? "—" },
        { label: "Customer", value: (r) => `${r.customer_name}${r.customer_id ? "" : " (not linked)"}` },
        { label: "Current", value: (r) => formatCurrency(r.current_amount) },
        { label: "30", value: (r) => formatCurrency(r.days_30) },
        { label: "60", value: (r) => formatCurrency(r.days_60) },
        { label: "90", value: (r) => formatCurrency(r.days_90) },
        { label: "120+", value: (r) => formatCurrency(r.days_120_plus) },
        { label: "Total", value: (r) => formatCurrency(r.total) },
      ]}
    />
  );

  // --- States -------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white py-16 shadow-sm">
        <Loader2 className="mb-3 h-8 w-8 animate-spin text-blue-500" />
        <p className="text-sm text-slate-500">Loading age analyses…</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 py-16 shadow-sm">
        <p className="text-lg font-medium text-red-700">Failed to load debtors age analyses</p>
        <p className="mt-1 text-sm text-red-500">{(error as Error)?.message ?? "Please try again."}</p>
      </div>
    );
  }

  if (!report) {
    return (
      <>
        <div className="flex flex-col items-center rounded-xl border border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
          <Users className="mb-3 h-12 w-12 text-slate-300" />
          <p className="text-lg font-medium text-slate-700">No debtors age analysis yet</p>
          <p className="mt-2 max-w-xl text-sm text-slate-500">
            A debtors age analysis shows how much each customer owes and how long it has been outstanding: current,
            30, 60, 90 and 120+ days. Export it from your accounting system at month end (CSV or Excel) and upload it
            here to track overdue balances over time. The original file is kept with each upload.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            {canEdit && (
              <button
                onClick={openImport}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
              >
                <Upload className="h-4 w-4" />
                Upload age analysis
              </button>
            )}
            <button
              onClick={downloadTemplate}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Download className="h-4 w-4" />
              Download template
            </button>
          </div>
          {!canEdit && <p className="mt-4 text-xs text-slate-400">Only admins and managers can upload an age analysis.</p>}
        </div>
        {importDialog}
      </>
    );
  }

  const pct = (n: number) => (totals.total ? `${((n / totals.total) * 100).toFixed(1)}% of total` : "—");
  const th = (k: SortKey, label: string, right = true) => (
    <th className={cn("px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-500", right ? "text-right" : "text-left")}>
      <button onClick={() => toggleSort(k)} className={cn("inline-flex items-center gap-1 hover:text-slate-800", right && "flex-row-reverse")}>
        {label}
        <SortIcon active={sort.key === k} dir={sort.dir} />
      </button>
    </th>
  );

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
          <label htmlFor="debtor-report" className="text-sm font-medium text-slate-700">
            Age analysis
          </label>
          <select
            id="debtor-report"
            value={report.id}
            onChange={(e) => setSelectedId(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {reports.map((r, i) => (
              <option key={r.id} value={r.id}>
                As of {formatAsOf(r.as_of)}
                {i === 0 ? " (latest)" : ""} · uploaded {formatDate(r.created_at)}
                {r.file_name ? ` · ${r.file_name}` : ""}
              </option>
            ))}
          </select>
          <span className="text-xs text-slate-400">
            {reports.length} {reports.length === 1 ? "upload" : "uploads"}
          </span>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              disabled={deleteReport.isPending}
              className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              {deleteReport.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Delete
            </button>
            <button
              onClick={openImport}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
            >
              <Upload className="h-4 w-4" />
              Upload age analysis
            </button>
          </div>
        )}
      </div>

      {linesLoading ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white py-16 shadow-sm">
          <Loader2 className="mb-3 h-8 w-8 animate-spin text-blue-500" />
          <p className="text-sm text-slate-500">Loading lines…</p>
        </div>
      ) : linesError ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 py-16 shadow-sm">
          <p className="text-lg font-medium text-red-700">Failed to load this age analysis</p>
          <p className="mt-1 text-sm text-red-500">{(linesErr as Error)?.message ?? "Please try again."}</p>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Total outstanding</p>
              <p className="mt-1 text-xl font-bold text-slate-900">{formatCurrency(totals.total)}</p>
              <p className="mt-1 text-xs text-slate-500">
                {lines.length} {lines.length === 1 ? "customer" : "customers"} · as of {formatAsOf(report.as_of)}
              </p>
            </div>
            {AGE_BUCKETS.map((b) => {
              const overdue = b.key === "days_90" || b.key === "days_120_plus";
              return (
                <div key={b.key} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="flex items-center gap-1.5 text-sm font-medium text-slate-500">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: BUCKET_COLORS[b.key] }} />
                    {b.label}
                  </p>
                  <p className={cn("mt-1 text-xl font-bold", overdue && totals[b.key] > 0 ? "text-red-600" : "text-slate-900")}>
                    {formatCurrency(totals[b.key])}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{pct(totals[b.key])}</p>
                </div>
              );
            })}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-4">
                <h3 className="text-lg font-semibold text-slate-900">Outstanding by age</h3>
              </div>
              <div className="p-6">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="bucket" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={{ stroke: "#e2e8f0" }} tickLine={false} />
                    <YAxis
                      tickFormatter={(v: number) => `N$${(v / 1000).toFixed(0)}k`}
                      tick={{ fontSize: 12, fill: "#64748b" }}
                      axisLine={{ stroke: "#e2e8f0" }}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(value) => [formatCurrency(Number(value ?? 0)), "Outstanding"] as [string, string]}
                      contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}
                    />
                    <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                      {chartData.map((d) => (
                        <Cell key={d.key} fill={BUCKET_COLORS[d.key]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-4">
                <h3 className="text-lg font-semibold text-slate-900">Top 10 debtors</h3>
              </div>
              <div className="p-6">
                {topDebtors.length === 0 ? (
                  <p className="py-16 text-center text-sm text-slate-400">No lines in this age analysis.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={topDebtors} layout="vertical" margin={{ left: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                      <XAxis
                        type="number"
                        tickFormatter={(v: number) => `N$${(v / 1000).toFixed(0)}k`}
                        tick={{ fontSize: 11, fill: "#64748b" }}
                        axisLine={{ stroke: "#e2e8f0" }}
                        tickLine={false}
                      />
                      <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={{ stroke: "#e2e8f0" }} tickLine={false} />
                      <Tooltip
                        formatter={(value) => formatCurrency(Number(value ?? 0))}
                        contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      {AGE_BUCKETS.map((b, i) => (
                        <Bar
                          key={b.key}
                          dataKey={b.key}
                          name={b.label}
                          stackId="age"
                          fill={BUCKET_COLORS[b.key]}
                          radius={i === AGE_BUCKETS.length - 1 ? [0, 4, 4, 0] : undefined}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* Lines */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Customers</h3>
                {unlinked > 0 && (
                  <p className="mt-0.5 text-xs text-slate-500">
                    {unlinked} of {lines.length} lines aren&apos;t linked to a customer record (no matching account number or name).
                  </p>
                )}
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search customer or account..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
            {visibleLines.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-400">
                {lines.length === 0 ? "This age analysis has no lines." : "No customers match your search."}
              </div>
            ) : (
              <div className="max-h-[600px] overflow-auto">
                <table className="w-full">
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b border-slate-100 bg-slate-50">
                      {th("account_number", "Account", false)}
                      {th("customer_name", "Customer", false)}
                      {AGE_BUCKETS.map((b) => (
                        <th key={b.key} className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                          <button onClick={() => toggleSort(b.key)} className="inline-flex flex-row-reverse items-center gap-1 hover:text-slate-800">
                            {b.label}
                            <SortIcon active={sort.key === b.key} dir={sort.dir} />
                          </button>
                        </th>
                      ))}
                      {th("total", "Total")}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visibleLines.map((l: DebtorLine) => (
                      <tr key={l.id} className="hover:bg-slate-50">
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-500">{l.account_number ?? "—"}</td>
                        <td className="px-4 py-3 text-sm font-medium text-slate-900">
                          <span className="inline-flex items-center gap-1.5">
                            {l.customer_name}
                            {l.customer_id && <Link2 className="h-3.5 w-3.5 text-blue-500" aria-label="Linked to a customer record" />}
                          </span>
                        </td>
                        {AGE_BUCKETS.map((b) => {
                          const overdue = (b.key === "days_90" || b.key === "days_120_plus") && l[b.key] > 0;
                          return (
                            <td
                              key={b.key}
                              className={cn(
                                "whitespace-nowrap px-4 py-3 text-right text-sm tabular-nums",
                                overdue ? "bg-red-50 font-semibold text-red-700" : l[b.key] ? "text-slate-700" : "text-slate-300"
                              )}
                            >
                              {formatCurrency(l[b.key])}
                            </td>
                          );
                        })}
                        <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-semibold tabular-nums text-slate-900">
                          {formatCurrency(l.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="sticky bottom-0">
                    <tr className="border-t border-slate-200 bg-slate-50 text-sm font-semibold text-slate-900">
                      <td className="px-4 py-3" colSpan={2}>
                        {search ? `Total (${visibleLines.length} shown)` : "Total"}
                      </td>
                      {AGE_BUCKETS.map((b) => (
                        <td key={b.key} className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                          {formatCurrency(visibleTotals[b.key])}
                        </td>
                      ))}
                      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">{formatCurrency(visibleTotals.total)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Notes + original file */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h4 className="mb-2 text-sm font-semibold uppercase tracking-wider text-gray-400">Notes</h4>
              {report.notes ? (
                <p className="flex gap-2 whitespace-pre-wrap text-sm text-slate-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
                  {report.notes}
                </p>
              ) : (
                <p className="text-sm italic text-gray-400">No notes.</p>
              )}
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <RecordFiles
                area="debtors"
                entityId={report.id}
                canEdit={canEdit}
                title="Original file"
                emptyText="The original file wasn't attached to this upload."
              />
            </div>
          </div>
        </>
      )}

      {importDialog}
    </div>
  );
}
