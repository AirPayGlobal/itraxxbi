"use client";

import { useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  DollarSign,
  Wallet,
  Landmark,
  Users,
  FileText,
  Send,
  Eye,
  X,
  ChevronDown,
  AlertCircle,
  Calendar,
  Building2,
  User,
  Hash,
  Banknote,
  Pencil,
  Plus,
  Trash2,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Upload,
  FileUp,
  Paperclip,
  CheckCircle2,
} from "lucide-react";
import { ImportDialog } from "@/components/data-import/import-dialog";
import { RecordFiles } from "@/components/files/record-files";
import { uploadRecordFile } from "@/lib/hooks/use-record-files";
import { PAYSLIP_IMPORT_FIELDS, matchPdfToPayslip, type PayslipImportRecord } from "@/lib/import/payslip-import";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { useAuth } from "@/components/providers/session-provider";
import { useCompanySettings } from "@/lib/hooks/use-company-settings";
import {
  PAYSLIP_FILES_KEY,
  checkPayslipImport,
  importPayslips,
  useGeneratePayslips,
  useMarkPayslipsSent,
  usePayrollPeople,
  usePayslipFiles,
  usePayslipPeriods,
  usePayslipsForPeriod,
  useUpdatePayslip,
  type Payslip,
  type PayrollPerson,
} from "@/lib/hooks/use-payslips";
import {
  amountKey,
  amountLabel,
  calculateStatutoryDeductions,
  computePayslipTotals,
  formatPeriod,
  round2,
  toPeriod,
  type AmountMap,
} from "@/lib/payroll";
import type { PayslipStatus } from "@/lib/supabase/database.types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const statusConfig: Record<PayslipStatus, { bg: string; text: string; dot: string }> = {
  DRAFT: { bg: "bg-gray-100", text: "text-gray-700", dot: "bg-gray-400" },
  GENERATED: { bg: "bg-blue-100", text: "text-blue-700", dot: "bg-blue-400" },
  SENT: { bg: "bg-green-100", text: "text-green-700", dot: "bg-green-400" },
  VIEWED: { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-400" },
};

const isEditable = (ps: Payslip) => ps.status === "DRAFT" || ps.status === "GENERATED";

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function PayslipsPage() {
  const { profile, loading: authLoading } = useAuth();
  const canManage = profile?.role === "ADMIN" || profile?.role === "MANAGER";

  if (authLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
        <div className="mx-auto max-w-lg rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <ShieldAlert className="mx-auto mb-3 h-10 w-10 text-amber-500" />
          <h1 className="text-lg font-semibold text-slate-900">Payroll is managed by admins and managers</h1>
          <p className="mt-2 text-sm text-slate-500">
            You can see your own payslips in My Portal.
          </p>
          <Link
            href="/my-portal"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Go to My Portal
          </Link>
        </div>
      </div>
    );
  }

  return <PayrollAdmin />;
}

function PayrollAdmin() {
  const currentPeriod = toPeriod();
  const [chosenPeriod, setChosenPeriod] = useState<string | null>(null);
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generateMonth, setGenerateMonth] = useState(() => new Date().getMonth() + 1);
  const [generateYear, setGenerateYear] = useState(() => new Date().getFullYear());
  const [viewId, setViewId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [showPdfUpload, setShowPdfUpload] = useState(false);
  const qc = useQueryClient();

  const periodsQ = usePayslipPeriods();
  const peopleQ = usePayrollPeople();
  const generate = useGeneratePayslips();
  const markSent = useMarkPayslipsSent();

  const periods = useMemo(() => {
    const list = periodsQ.data ?? [];
    return list.includes(currentPeriod) ? list : [currentPeriod, ...list].sort().reverse();
  }, [periodsQ.data, currentPeriod]);

  const selectedPeriod = chosenPeriod ?? periodsQ.data?.[0] ?? currentPeriod;
  const payslipsQ = usePayslipsForPeriod(selectedPeriod);
  const periodPayslips = useMemo(() => payslipsQ.data ?? [], [payslipsQ.data]);

  const peopleById = useMemo(
    () => new Map((peopleQ.data ?? []).map((p) => [p.id, p] as const)),
    [peopleQ.data]
  );

  const filesQ = usePayslipFiles(periodPayslips.map((p) => p.id));
  const filesByPayslip = filesQ.data;

  async function runImport(records: PayslipImportRecord[]): Promise<string> {
    const { created, updated } = await importPayslips(records);
    qc.invalidateQueries({ queryKey: ["payslips"] });
    const periodsImported = [...new Set(records.map((r) => r.period))];
    if (periodsImported.length === 1) setChosenPeriod(periodsImported[0]);
    const parts = [];
    if (created) parts.push(`${created} payslip${created === 1 ? "" : "s"} imported`);
    if (updated) parts.push(`${updated} updated`);
    return parts.join(", ") || "Nothing to import";
  }

  const viewPayslip = periodPayslips.find((p) => p.id === viewId) ?? null;
  const editPayslip = periodPayslips.find((p) => p.id === editId) ?? null;

  const payroll = useMemo(() => {
    let totalGross = 0;
    let totalNet = 0;
    let totalTax = 0;
    let totalDeductions = 0;
    for (const ps of periodPayslips) {
      totalGross += ps.gross_pay;
      totalNet += ps.net_pay;
      totalDeductions += ps.total_deductions;
      totalTax += Number(ps.deductions.paye) || 0;
    }
    return {
      totalGross: round2(totalGross),
      totalNet: round2(totalNet),
      totalTax: round2(totalTax),
      totalDeductions: round2(totalDeductions),
      employeeCount: periodPayslips.length,
    };
  }, [periodPayslips]);

  const unsentIds = periodPayslips.filter(isEditable).map((p) => p.id);
  const generatePeriod = `${generateYear}-${String(generateMonth).padStart(2, "0")}`;
  const thisYear = Number(currentPeriod.slice(0, 4));
  const yearOptions = [thisYear - 1, thisYear, thisYear + 1];

  function handleGenerate() {
    generate.mutate(generatePeriod, {
      onSuccess: () => {
        setChosenPeriod(generatePeriod);
        setShowGenerateModal(false);
      },
    });
  }

  const kpis = [
    {
      label: "Total Payroll",
      value: formatCurrency(payroll.totalGross),
      icon: DollarSign,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
      sub: "Gross pay for the period",
    },
    {
      label: "Net Pay Total",
      value: formatCurrency(payroll.totalNet),
      icon: Wallet,
      iconBg: "bg-green-50",
      iconColor: "text-green-600",
      sub: `After ${formatCurrency(payroll.totalDeductions)} deductions`,
    },
    {
      label: "Total Tax (PAYE)",
      value: formatCurrency(payroll.totalTax),
      icon: Landmark,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
      sub: "Income tax withheld",
    },
    {
      label: "Employees Paid",
      value: String(payroll.employeeCount),
      icon: Users,
      iconBg: "bg-purple-50",
      iconColor: "text-purple-600",
      sub: formatPeriod(selectedPeriod),
    },
  ];

  const tableLoading = payslipsQ.isLoading || peopleQ.isLoading;
  const tableError = payslipsQ.error ?? peopleQ.error;

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      {/* Page Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payslips</h1>
          <p className="mt-1 text-sm text-slate-500">
            Generate, review and release employee payslips
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowImport(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            <Upload className="h-4 w-4" />
            Import Payslips
          </button>
          <button
            onClick={() => setShowPdfUpload(true)}
            disabled={tableLoading || periodPayslips.length === 0}
            title={periodPayslips.length === 0 ? "No payslips in this period to attach PDFs to" : undefined}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FileUp className="h-4 w-4" />
            Upload PDFs
          </button>
          <button
            onClick={() => setShowGenerateModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            <FileText className="h-4 w-4" />
            Generate Payslips
          </button>
          <button
            onClick={() => markSent.mutate(unsentIds)}
            disabled={unsentIds.length === 0 || markSent.isPending}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {markSent.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Mark All as Sent
          </button>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.07 }}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">{kpi.label}</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {tableLoading ? <span className="inline-block h-7 w-24 animate-pulse rounded bg-slate-100" /> : kpi.value}
                </p>
              </div>
              <div className={cn("rounded-lg p-3", kpi.iconBg, kpi.iconColor)}>
                <kpi.icon className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-500">{kpi.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Period Selector */}
      <div className="mb-6 flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="h-4 w-4 text-slate-400" />
          <span className="text-sm font-medium text-slate-700">Pay Period:</span>
          <div className="relative">
            <button
              onClick={() => setShowPeriodDropdown((v) => !v)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-50"
            >
              {formatPeriod(selectedPeriod)}
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </button>
            {showPeriodDropdown && (
              <div className="absolute left-0 top-full z-20 mt-1 max-h-72 w-56 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                {periodsQ.isLoading && (
                  <p className="px-4 py-2 text-sm text-slate-400">Loading periods…</p>
                )}
                {periods.map((period) => (
                  <button
                    key={period}
                    onClick={() => {
                      setChosenPeriod(period);
                      setShowPeriodDropdown(false);
                    }}
                    className={cn(
                      "block w-full px-4 py-2 text-left text-sm transition-colors hover:bg-slate-50",
                      period === selectedPeriod ? "bg-blue-50 font-medium text-blue-700" : "text-slate-700"
                    )}
                  >
                    {formatPeriod(period)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <p className="text-sm text-slate-500">
          {periodPayslips.length} payslip{periodPayslips.length !== 1 ? "s" : ""} for this period
          {unsentIds.length > 0 && ` · ${unsentIds.length} not yet sent`}
        </p>
      </div>

      {showPeriodDropdown && (
        <div className="fixed inset-0 z-10" onClick={() => setShowPeriodDropdown(false)} />
      )}

      {periodsQ.error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4" />
          Could not load pay periods: {periodsQ.error.message}
        </div>
      )}

      {/* Payslips Table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
        className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {["Employee", "Emp No", "Department"].map((h) => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">{h}</th>
                ))}
                {["Gross Pay", "Deductions", "Net Pay"].map((h) => (
                  <th key={h} className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">{h}</th>
                ))}
                {["Status", "Actions"].map((h) => (
                  <th key={h} className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tableLoading && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-sm text-slate-500">
                    <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-blue-500" />
                    Loading payslips…
                  </td>
                </tr>
              )}
              {!tableLoading && tableError && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-sm text-red-600">
                    <AlertCircle className="mx-auto mb-3 h-8 w-8" />
                    Could not load payslips: {tableError.message}
                  </td>
                </tr>
              )}
              {!tableLoading && !tableError && periodPayslips.map((ps) => {
                const sc = statusConfig[ps.status];
                const person = peopleById.get(ps.user_id);
                const name = person?.name ?? "Unknown employee";
                return (
                  <tr key={ps.id} className="transition-colors hover:bg-slate-50">
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                          {initials(name)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">{name}</p>
                          <p className="flex items-center gap-1 text-xs text-slate-400">
                            {ps.payslip_number}
                            {filesByPayslip?.get(ps.id)?.length ? (
                              <Paperclip className="h-3 w-3 text-blue-500" aria-label="PDF attached" />
                            ) : null}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                      {person?.employee?.employee_number ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                      {person?.department ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium text-slate-900">
                      {formatCurrency(ps.gross_pay)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-red-600">
                      -{formatCurrency(ps.total_deductions)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-semibold text-slate-900">
                      {formatCurrency(ps.net_pay)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-center">
                      <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium", sc.bg, sc.text)}>
                        <span className={cn("h-1.5 w-1.5 rounded-full", sc.dot)} />
                        {ps.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setViewId(ps.id)}
                          className="rounded p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-blue-600"
                          title="View payslip"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {isEditable(ps) && (
                          <>
                            <button
                              onClick={() => setEditId(ps.id)}
                              className="rounded p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-amber-600"
                              title="Edit allowances and deductions"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => markSent.mutate([ps.id])}
                              disabled={markSent.isPending}
                              className="rounded p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-green-600 disabled:opacity-50"
                              title="Mark as sent"
                            >
                              <Send className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!tableLoading && !tableError && periodPayslips.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-sm text-slate-500">
                    No payslips for {formatPeriod(selectedPeriod)} yet. Click &quot;Generate
                    Payslips&quot; to create them, or &quot;Import Payslips&quot; to load a payroll export.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Generate Payslips Modal */}
      <AnimatePresence>
        {showGenerateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md rounded-xl bg-white shadow-xl"
            >
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                <h2 className="text-lg font-semibold text-slate-900">Generate Payslips</h2>
                <button
                  onClick={() => setShowGenerateModal(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4 px-6 py-5">
                <p className="text-sm text-slate-500">
                  Creates one payslip for each active staff member with a salary on their
                  employee record. Anyone who already has a payslip for the month is skipped.
                  PAYE and Social Security are calculated automatically; allowances start empty
                  and can be edited before sending.
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Month</label>
                    <select
                      value={generateMonth}
                      onChange={(e) => setGenerateMonth(Number(e.target.value))}
                      className={inputCls}
                    >
                      {MONTHS.map((m, i) => (
                        <option key={m} value={i + 1}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Year</label>
                    <select
                      value={generateYear}
                      onChange={(e) => setGenerateYear(Number(e.target.value))}
                      className={inputCls}
                    >
                      {yearOptions.map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {peopleQ.data && (
                  <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                    {peopleQ.data.filter((p) => p.is_active && Number(p.employee?.salary) > 0).length} active
                    staff member(s) have a salary on file.
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
                <button
                  onClick={() => setShowGenerateModal(false)}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={generate.isPending}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {generate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                  Generate for {formatPeriod(generatePeriod)}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Payslip Detail Modal */}
      <AnimatePresence>
        {viewPayslip && (
          <PayslipDetailModal
            payslip={viewPayslip}
            person={peopleById.get(viewPayslip.user_id)}
            onClose={() => {
              setViewId(null);
              qc.invalidateQueries({ queryKey: PAYSLIP_FILES_KEY });
            }}
            onEdit={() => {
              setViewId(null);
              setEditId(viewPayslip.id);
            }}
            onMarkSent={() => markSent.mutate([viewPayslip.id])}
            sending={markSent.isPending}
          />
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {editPayslip && (
          <EditPayslipModal
            key={editPayslip.id}
            payslip={editPayslip}
            person={peopleById.get(editPayslip.user_id)}
            onClose={() => setEditId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detail modal
// ---------------------------------------------------------------------------

function AmountTable({
  title,
  rows,
  totalLabel,
  total,
  negative,
}: {
  title: string;
  rows: [string, number][];
  totalLabel: string;
  total: number;
  negative?: boolean;
}) {
  const cls = negative ? "text-red-600" : "text-slate-900";
  const sign = negative ? "-" : "";
  return (
    <div className="mb-4">
      <h4 className="mb-2 text-sm font-semibold text-slate-700">{title}</h4>
      <div className="overflow-hidden rounded-lg border border-slate-200">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50">
              <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Description</th>
              <th className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 && (
              <tr>
                <td colSpan={2} className="px-4 py-2.5 text-sm text-slate-400">None</td>
              </tr>
            )}
            {rows.map(([label, amount]) => (
              <tr key={label}>
                <td className="px-4 py-2.5 text-sm text-slate-700">{label}</td>
                <td className={cn("px-4 py-2.5 text-right text-sm font-medium", cls)}>
                  {sign}{formatCurrency(amount)}
                </td>
              </tr>
            ))}
            <tr className="bg-slate-50 font-semibold">
              <td className="px-4 py-2.5 text-sm text-slate-900">{totalLabel}</td>
              <td className={cn("px-4 py-2.5 text-right text-sm", cls)}>
                {sign}{formatCurrency(total)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Field({ icon: Icon, label, value }: { icon?: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      {Icon && <Icon className="h-3.5 w-3.5 text-slate-400" />}
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-sm font-medium text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function PayslipDetailModal({
  payslip,
  person,
  onClose,
  onEdit,
  onMarkSent,
  sending,
}: {
  payslip: Payslip;
  person: PayrollPerson | undefined;
  onClose: () => void;
  onEdit: () => void;
  onMarkSent: () => void;
  sending: boolean;
}) {
  const { data: company } = useCompanySettings();
  const emp = person?.employee;
  const earnings: [string, number][] = [
    ["Basic Salary", payslip.basic_salary],
    ...Object.entries(payslip.allowances).map(([k, v]) => [amountLabel(k), Number(v)] as [string, number]),
  ];
  const deductions = Object.entries(payslip.deductions).map(
    ([k, v]) => [amountLabel(k), Number(v)] as [string, number]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-2xl rounded-xl bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Payslip &mdash; {payslip.payslip_number}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto px-6 py-5">
          <div className="mb-6 text-center">
            {company?.company_name && (
              <h3 className="text-xl font-bold text-slate-900">{company.company_name}</h3>
            )}
            {company?.address && <p className="mt-1 text-sm text-slate-500">{company.address}</p>}
            <div className="mt-3 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              PAYSLIP
            </div>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-x-8 gap-y-3 rounded-lg bg-slate-50 p-4">
            <Field icon={User} label="Employee Name" value={person?.name ?? "Unknown employee"} />
            <Field icon={Hash} label="Employee No" value={emp?.employee_number ?? "—"} />
            <Field icon={Building2} label="Department" value={person?.department ?? "—"} />
            <Field icon={User} label="Job Title" value={person?.job_title ?? "—"} />
            <Field label="Tax Number" value={emp?.tax_number ?? "—"} />
            <Field label="Status" value={payslip.status} />
            <Field label="Pay Period" value={formatPeriod(payslip.period)} />
            <Field label="Pay Date" value={payslip.pay_date ? formatDate(payslip.pay_date) : "—"} />
          </div>

          <AmountTable title="Earnings" rows={earnings} totalLabel="Gross Pay" total={payslip.gross_pay} />
          <AmountTable
            title="Deductions"
            rows={deductions}
            totalLabel="Total Deductions"
            total={payslip.total_deductions}
            negative
          />

          <div className="mb-6 rounded-lg border-2 border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Gross Pay</span>
              <span className="font-medium text-slate-900">{formatCurrency(payslip.gross_pay)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-slate-600">Total Deductions</span>
              <span className="font-medium text-red-600">-{formatCurrency(payslip.total_deductions)}</span>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-slate-300 pt-3">
              <span className="text-base font-bold text-slate-900">Net Pay</span>
              <span className="text-xl font-bold text-green-700">{formatCurrency(payslip.net_pay)}</span>
            </div>
          </div>

          <div className="mb-6 rounded-lg bg-slate-50 p-4">
            <h4 className="mb-2 text-sm font-semibold text-slate-700">Bank Details</h4>
            <div className="grid grid-cols-2 gap-3">
              <Field icon={Banknote} label="Bank Name" value={emp?.bank_name ?? "Not on file"} />
              <Field label="Account Number" value={emp?.bank_account ?? "Not on file"} />
            </div>
          </div>

          {(payslip.sent_at || payslip.viewed_at) && (
            <p className="mb-2 text-center text-xs text-slate-500">
              {payslip.sent_at && `Sent ${formatDate(payslip.sent_at)}`}
              {payslip.sent_at && payslip.viewed_at && " · "}
              {payslip.viewed_at && `Viewed ${formatDate(payslip.viewed_at)}`}
            </p>
          )}
          <p className="text-center text-xs text-slate-400">
            This is a computer-generated payslip and does not require a signature.
          </p>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
          {isEditable(payslip) && (
            <>
              <button
                onClick={onEdit}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <Pencil className="h-4 w-4" />
                Edit
              </button>
              <button
                onClick={onMarkSent}
                disabled={sending}
                className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Mark as Sent
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Edit modal
// ---------------------------------------------------------------------------

type Line = { id: number; label: string; amount: string };

let lineSeq = 0;
function toLines(map: AmountMap): Line[] {
  return Object.entries(map).map(([k, v]) => ({ id: ++lineSeq, label: amountLabel(k), amount: String(v) }));
}

const CANONICAL_KEYS = ["paye", "social_security", "pension", "medical_aid", "housing", "transport", "overtime"];

/** Lines -> stored map. Labels of existing or well-known keys map back to those keys. */
function toMap(lines: Line[], original: AmountMap): AmountMap {
  const labelToKey = new Map(
    [...CANONICAL_KEYS, ...Object.keys(original)].map((k) => [amountLabel(k), k] as const)
  );
  const out: AmountMap = {};
  for (const l of lines) {
    const key = labelToKey.get(l.label.trim()) ?? amountKey(l.label);
    if (!key) continue;
    out[key] = round2((out[key] ?? 0) + (Number(l.amount) || 0));
  }
  return out;
}

function LinesEditor({
  title,
  lines,
  setLines,
  placeholder,
}: {
  title: string;
  lines: Line[];
  setLines: (fn: (prev: Line[]) => Line[]) => void;
  placeholder: string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-700">{title}</h4>
        <button
          type="button"
          onClick={() => setLines((prev) => [...prev, { id: ++lineSeq, label: "", amount: "" }])}
          className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800"
        >
          <Plus className="h-3.5 w-3.5" /> Add line
        </button>
      </div>
      {lines.length === 0 && <p className="text-xs text-slate-400">None</p>}
      <div className="space-y-2">
        {lines.map((l) => (
          <div key={l.id} className="flex items-center gap-2">
            <input
              value={l.label}
              placeholder={placeholder}
              onChange={(e) =>
                setLines((prev) => prev.map((x) => (x.id === l.id ? { ...x, label: e.target.value } : x)))
              }
              className={inputCls}
            />
            <input
              type="number"
              step="0.01"
              min="0"
              value={l.amount}
              placeholder="0.00"
              onChange={(e) =>
                setLines((prev) => prev.map((x) => (x.id === l.id ? { ...x, amount: e.target.value } : x)))
              }
              className={cn(inputCls, "w-36 text-right")}
            />
            <button
              type="button"
              onClick={() => setLines((prev) => prev.filter((x) => x.id !== l.id))}
              className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600"
              title="Remove line"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function EditPayslipModal({
  payslip,
  person,
  onClose,
}: {
  payslip: Payslip;
  person: PayrollPerson | undefined;
  onClose: () => void;
}) {
  const update = useUpdatePayslip();
  const [basic, setBasic] = useState(String(payslip.basic_salary));
  const [payDate, setPayDate] = useState(payslip.pay_date ?? "");
  const [allowanceLines, setAllowanceLines] = useState<Line[]>(() => toLines(payslip.allowances));
  const [deductionLines, setDeductionLines] = useState<Line[]>(() => toLines(payslip.deductions));

  const basicNum = Number(basic) || 0;
  const allowances = toMap(allowanceLines, payslip.allowances);
  const deductions = toMap(deductionLines, payslip.deductions);
  const totals = computePayslipTotals({ basic_salary: basicNum, allowances, deductions });

  function recalcStatutory() {
    const stat = calculateStatutoryDeductions(basicNum, allowances);
    setDeductionLines((prev) => {
      const next = prev.filter((l) => {
        const label = l.label.trim();
        return label !== amountLabel("paye") && label !== amountLabel("social_security");
      });
      return [
        { id: ++lineSeq, label: amountLabel("paye"), amount: String(stat.paye) },
        { id: ++lineSeq, label: amountLabel("social_security"), amount: String(stat.social_security) },
        ...next,
      ];
    });
  }

  function save() {
    update.mutate(
      {
        id: payslip.id,
        basic_salary: round2(basicNum),
        allowances,
        deductions,
        pay_date: payDate || null,
      },
      { onSuccess: onClose }
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-2xl rounded-xl bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Edit Payslip</h2>
            <p className="text-xs text-slate-500">
              {person?.name ?? "Unknown employee"} · {formatPeriod(payslip.period)} · {payslip.payslip_number}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-6 overflow-y-auto px-6 py-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Basic Salary (N$)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={basic}
                onChange={(e) => setBasic(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Pay Date</label>
              <input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} className={inputCls} />
            </div>
          </div>

          <LinesEditor
            title="Allowances"
            lines={allowanceLines}
            setLines={setAllowanceLines}
            placeholder="e.g. Housing Allowance"
          />

          <div>
            <LinesEditor
              title="Deductions"
              lines={deductionLines}
              setLines={setDeductionLines}
              placeholder="e.g. Pension Fund"
            />
            <button
              type="button"
              onClick={recalcStatutory}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Recalculate PAYE &amp; Social Security
            </button>
            <p className="mt-1 text-xs text-slate-400">
              PAYE uses the Namibian annual tax table on gross pay; Social Security is 0.9% of basic, capped at N$99.
            </p>
          </div>

          <div className="rounded-lg border-2 border-slate-200 bg-slate-50 p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Gross Pay</span>
              <span className="font-medium text-slate-900">{formatCurrency(totals.gross_pay)}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-slate-600">Total Deductions</span>
              <span className="font-medium text-red-600">-{formatCurrency(totals.total_deductions)}</span>
            </div>
            <div className="mt-2 flex justify-between border-t border-slate-300 pt-2">
              <span className="font-bold text-slate-900">Net Pay</span>
              <span className="font-bold text-green-700">{formatCurrency(totals.net_pay)}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={update.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {update.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Changes
          </button>
        </div>
      </motion.div>
    </div>
  );
}
