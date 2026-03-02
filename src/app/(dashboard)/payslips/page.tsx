"use client";

import { useState, useEffect, useMemo } from "react";
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
  CheckCircle2,
  AlertCircle,
  Calendar,
  Building2,
  User,
  Hash,
  Banknote,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getAllPayslips,
  getPayslipsForPeriod,
  getAvailablePeriods,
  generateMonthlyPayslips,
  sendPayslip,
  sendAllPayslipsForPeriod,
  getTotalPayroll,
  subscribeToPayslips,
  type Payslip,
} from "@/lib/payslip-engine";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatNAD(amount: number): string {
  return `N$ ${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const statusConfig: Record<
  Payslip["status"],
  { bg: string; text: string; dot: string }
> = {
  DRAFT: {
    bg: "bg-gray-100",
    text: "text-gray-700",
    dot: "bg-gray-400",
  },
  GENERATED: {
    bg: "bg-blue-100",
    text: "text-blue-700",
    dot: "bg-blue-400",
  },
  SENT: {
    bg: "bg-green-100",
    text: "text-green-700",
    dot: "bg-green-400",
  },
  VIEWED: {
    bg: "bg-emerald-100",
    text: "text-emerald-700",
    dot: "bg-emerald-400",
  },
};

// ---------------------------------------------------------------------------
// Toast Notification
// ---------------------------------------------------------------------------

function Toast({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, x: "-50%" }}
      animate={{ opacity: 1, y: 0, x: "-50%" }}
      exit={{ opacity: 0, y: -20, x: "-50%" }}
      className="fixed left-1/2 top-6 z-[100] flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-3 text-sm font-medium text-white shadow-lg"
    >
      <CheckCircle2 className="h-4 w-4 text-green-400" />
      {message}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function PayslipsPage() {
  // --- State ---------------------------------------------------------------
  const [, setTick] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [viewPayslip, setViewPayslip] = useState<Payslip | null>(null);
  const [generateMonth, setGenerateMonth] = useState(3);
  const [generateYear, setGenerateYear] = useState(2026);
  const [generateResult, setGenerateResult] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);

  // --- Subscribe to reactive store ----------------------------------------
  useEffect(() => {
    const unsub = subscribeToPayslips(() => setTick((t) => t + 1));
    return unsub;
  }, []);

  // --- Derived data --------------------------------------------------------
  const periods = useMemo(() => getAvailablePeriods(), [/* re-eval on tick */]);

  // Default to latest period
  useEffect(() => {
    if (!selectedPeriod && periods.length > 0) {
      setSelectedPeriod(periods[0]);
    }
  }, [periods, selectedPeriod]);

  const periodPayslips = useMemo(
    () => (selectedPeriod ? getPayslipsForPeriod(selectedPeriod) : []),
    [selectedPeriod]
  );

  const payroll = useMemo(
    () =>
      selectedPeriod
        ? getTotalPayroll(selectedPeriod)
        : { totalGross: 0, totalNet: 0, totalDeductions: 0, totalTax: 0, employeeCount: 0 },
    [selectedPeriod]
  );

  // --- Handlers ------------------------------------------------------------
  function handleGenerate() {
    const result = generateMonthlyPayslips(generateMonth, generateYear);
    const monthNames = [
      "January","February","March","April","May","June",
      "July","August","September","October","November","December",
    ];
    const label = `${monthNames[generateMonth - 1]} ${generateYear}`;

    if (result.length > 0 && result[0].status === "GENERATED") {
      setGenerateResult(`Successfully generated ${result.length} payslips for ${label}.`);
    } else {
      setGenerateResult(`Payslips for ${label} already exist (${result.length} found).`);
    }

    // Switch to the newly generated period
    setSelectedPeriod(label);
  }

  function handleSendPayslip(id: string) {
    sendPayslip(id);
    setToast("Payslip sent to employee successfully.");
  }

  function handleSendAll() {
    if (!selectedPeriod) return;
    const count = sendAllPayslipsForPeriod(selectedPeriod);
    if (count > 0) {
      setToast(`${count} payslip${count !== 1 ? "s" : ""} sent for ${selectedPeriod}.`);
    } else {
      setToast("No unsent payslips found for this period.");
    }
  }

  function handleSendFromDetail(id: string) {
    sendPayslip(id);
    // Refresh the viewed payslip
    const updated = getPayslipsForPeriod(selectedPeriod).find((p) => p.id === id);
    if (updated) setViewPayslip(updated);
    setToast("Payslip sent to employee successfully.");
  }

  // --- KPI cards config ----------------------------------------------------
  const kpis = [
    {
      label: "Total Payroll",
      value: formatNAD(payroll.totalGross),
      icon: DollarSign,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
      sub: `${payroll.employeeCount} employees`,
    },
    {
      label: "Net Pay Total",
      value: formatNAD(payroll.totalNet),
      icon: Wallet,
      iconBg: "bg-green-50",
      iconColor: "text-green-600",
      sub: "After deductions",
    },
    {
      label: "Total Tax (PAYE)",
      value: formatNAD(payroll.totalTax),
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
      sub: selectedPeriod || "No period selected",
    },
  ];

  // --- Render --------------------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      {/* Toast */}
      <AnimatePresence>
        {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      </AnimatePresence>

      {/* ----------------------------------------------------------------- */}
      {/* Page Header                                                       */}
      {/* ----------------------------------------------------------------- */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payslips</h1>
          <p className="mt-1 text-sm text-slate-500">
            Generate, manage, and distribute employee payslips
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setGenerateResult(null);
              setShowGenerateModal(true);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            <FileText className="h-4 w-4" />
            Generate Payslips
          </button>
          <button
            onClick={handleSendAll}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            <Send className="h-4 w-4" />
            Send All
          </button>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* KPI Stats Row                                                     */}
      {/* ----------------------------------------------------------------- */}
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
                <p className="mt-1 text-2xl font-bold text-slate-900">{kpi.value}</p>
              </div>
              <div className={cn("rounded-lg p-3", kpi.iconBg, kpi.iconColor)}>
                <kpi.icon className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-500">{kpi.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Period Selector                                                   */}
      {/* ----------------------------------------------------------------- */}
      <div className="mb-6 flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="h-4 w-4 text-slate-400" />
          <span className="text-sm font-medium text-slate-700">Pay Period:</span>
          <div className="relative">
            <button
              onClick={() => setShowPeriodDropdown((v) => !v)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-50"
            >
              {selectedPeriod || "Select period"}
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </button>
            {showPeriodDropdown && (
              <div className="absolute left-0 top-full z-20 mt-1 w-56 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                {periods.map((period) => (
                  <button
                    key={period}
                    onClick={() => {
                      setSelectedPeriod(period);
                      setShowPeriodDropdown(false);
                    }}
                    className={cn(
                      "block w-full px-4 py-2 text-left text-sm transition-colors hover:bg-slate-50",
                      period === selectedPeriod
                        ? "bg-blue-50 font-medium text-blue-700"
                        : "text-slate-700"
                    )}
                  >
                    {period}
                  </button>
                ))}
                {periods.length === 0 && (
                  <p className="px-4 py-2 text-sm text-slate-400">
                    No periods available
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
        <p className="text-sm text-slate-500">
          {periodPayslips.length} payslip{periodPayslips.length !== 1 ? "s" : ""} for this period
        </p>
      </div>

      {/* Close dropdown when clicking outside */}
      {showPeriodDropdown && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setShowPeriodDropdown(false)}
        />
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Payslips Table                                                    */}
      {/* ----------------------------------------------------------------- */}
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
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Emp No
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Department
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                  Gross Pay
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                  Deductions
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                  Net Pay
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-slate-500">
                  Status
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {periodPayslips.map((ps) => {
                const sc = statusConfig[ps.status];
                return (
                  <tr key={ps.id} className="hover:bg-slate-50 transition-colors">
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                          {ps.employee.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)}
                        </div>
                        <span className="text-sm font-medium text-slate-900">
                          {ps.employee.name}
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                      {ps.employee.employeeNumber}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                      {ps.employee.department}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium text-slate-900">
                      {formatNAD(ps.grossPay)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-red-600">
                      -{formatNAD(ps.totalDeductions)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-semibold text-slate-900">
                      {formatNAD(ps.netPay)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-center">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
                          sc.bg,
                          sc.text
                        )}
                      >
                        <span className={cn("h-1.5 w-1.5 rounded-full", sc.dot)} />
                        {ps.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setViewPayslip(ps)}
                          className="rounded p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-blue-600"
                          title="View payslip"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {(ps.status === "GENERATED" || ps.status === "DRAFT") && (
                          <button
                            onClick={() => handleSendPayslip(ps.id)}
                            className="rounded p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-green-600"
                            title="Send to employee"
                          >
                            <Send className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {periodPayslips.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-12 text-center text-sm text-slate-500"
                  >
                    No payslips found for this period. Click &quot;Generate
                    Payslips&quot; to create them.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* ----------------------------------------------------------------- */}
      {/* Generate Payslips Modal                                           */}
      {/* ----------------------------------------------------------------- */}
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
                <h2 className="text-lg font-semibold text-slate-900">
                  Generate Payslips
                </h2>
                <button
                  onClick={() => setShowGenerateModal(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4 px-6 py-5">
                <p className="text-sm text-slate-500">
                  Select a month and year to generate payslips for all employees.
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Month
                    </label>
                    <select
                      value={generateMonth}
                      onChange={(e) => setGenerateMonth(Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {[
                        "January","February","March","April","May","June",
                        "July","August","September","October","November","December",
                      ].map((m, i) => (
                        <option key={m} value={i + 1}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Year
                    </label>
                    <select
                      value={generateYear}
                      onChange={(e) => setGenerateYear(Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value={2025}>2025</option>
                      <option value={2026}>2026</option>
                      <option value={2027}>2027</option>
                    </select>
                  </div>
                </div>

                {/* Result message */}
                {generateResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-2 rounded-lg bg-green-50 p-3"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                    <p className="text-sm text-green-700">{generateResult}</p>
                  </motion.div>
                )}
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
                <button
                  onClick={() => setShowGenerateModal(false)}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Close
                </button>
                <button
                  onClick={handleGenerate}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  <FileText className="h-4 w-4" />
                  Generate
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ----------------------------------------------------------------- */}
      {/* Payslip Detail / Preview Modal                                    */}
      {/* ----------------------------------------------------------------- */}
      <AnimatePresence>
        {viewPayslip && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-2xl rounded-xl bg-white shadow-xl"
            >
              {/* Modal header */}
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                <h2 className="text-lg font-semibold text-slate-900">
                  Payslip &mdash; {viewPayslip.payslipNumber}
                </h2>
                <button
                  onClick={() => setViewPayslip(null)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Scrollable body */}
              <div className="max-h-[75vh] overflow-y-auto px-6 py-5">
                {/* Company Header */}
                <div className="mb-6 text-center">
                  <h3 className="text-xl font-bold text-slate-900">
                    ITRACKERX (Pty) Ltd
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    12 Bismarck Street, Windhoek, Namibia
                  </p>
                  <div className="mt-3 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    PAYSLIP
                  </div>
                </div>

                {/* Employee details + Pay period */}
                <div className="mb-6 grid grid-cols-2 gap-x-8 gap-y-3 rounded-lg bg-slate-50 p-4">
                  <div className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500">Employee Name</p>
                      <p className="text-sm font-medium text-slate-900">
                        {viewPayslip.employee.name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Hash className="h-3.5 w-3.5 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500">Employee No</p>
                      <p className="text-sm font-medium text-slate-900">
                        {viewPayslip.employee.employeeNumber}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500">Department</p>
                      <p className="text-sm font-medium text-slate-900">
                        {viewPayslip.employee.department}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500">Job Title</p>
                      <p className="text-sm font-medium text-slate-900">
                        {viewPayslip.employee.jobTitle}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Tax Number</p>
                    <p className="text-sm font-medium text-slate-900">
                      {viewPayslip.employee.taxNumber}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Social Security No</p>
                    <p className="text-sm font-medium text-slate-900">
                      {viewPayslip.employee.socialSecurityNo}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Pay Period</p>
                    <p className="text-sm font-medium text-slate-900">
                      {viewPayslip.payPeriod}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Pay Date</p>
                    <p className="text-sm font-medium text-slate-900">
                      {viewPayslip.payDate}
                    </p>
                  </div>
                </div>

                {/* Earnings Table */}
                <div className="mb-4">
                  <h4 className="mb-2 text-sm font-semibold text-slate-700">
                    Earnings
                  </h4>
                  <div className="overflow-hidden rounded-lg border border-slate-200">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-50">
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                            Description
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                            Amount
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr>
                          <td className="px-4 py-2.5 text-sm text-slate-700">
                            Basic Salary
                          </td>
                          <td className="px-4 py-2.5 text-right text-sm font-medium text-slate-900">
                            {formatNAD(viewPayslip.employee.basicSalary)}
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2.5 text-sm text-slate-700">
                            Housing Allowance
                          </td>
                          <td className="px-4 py-2.5 text-right text-sm font-medium text-slate-900">
                            {formatNAD(viewPayslip.employee.allowances.housing)}
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2.5 text-sm text-slate-700">
                            Transport Allowance
                          </td>
                          <td className="px-4 py-2.5 text-right text-sm font-medium text-slate-900">
                            {formatNAD(viewPayslip.employee.allowances.transport)}
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2.5 text-sm text-slate-700">
                            Medical Allowance
                          </td>
                          <td className="px-4 py-2.5 text-right text-sm font-medium text-slate-900">
                            {formatNAD(viewPayslip.employee.allowances.medical)}
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2.5 text-sm text-slate-700">
                            Overtime
                          </td>
                          <td className="px-4 py-2.5 text-right text-sm font-medium text-slate-900">
                            {formatNAD(viewPayslip.employee.allowances.overtime)}
                          </td>
                        </tr>
                        <tr className="bg-slate-50 font-semibold">
                          <td className="px-4 py-2.5 text-sm text-slate-900">
                            Gross Pay
                          </td>
                          <td className="px-4 py-2.5 text-right text-sm text-slate-900">
                            {formatNAD(viewPayslip.grossPay)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Deductions Table */}
                <div className="mb-4">
                  <h4 className="mb-2 text-sm font-semibold text-slate-700">
                    Deductions
                  </h4>
                  <div className="overflow-hidden rounded-lg border border-slate-200">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-50">
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                            Description
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                            Amount
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr>
                          <td className="px-4 py-2.5 text-sm text-slate-700">
                            PAYE (Income Tax)
                          </td>
                          <td className="px-4 py-2.5 text-right text-sm font-medium text-red-600">
                            -{formatNAD(viewPayslip.employee.deductions.paye)}
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2.5 text-sm text-slate-700">
                            Social Security
                          </td>
                          <td className="px-4 py-2.5 text-right text-sm font-medium text-red-600">
                            -{formatNAD(viewPayslip.employee.deductions.socialSecurity)}
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2.5 text-sm text-slate-700">
                            Medical Aid
                          </td>
                          <td className="px-4 py-2.5 text-right text-sm font-medium text-red-600">
                            -{formatNAD(viewPayslip.employee.deductions.medicalAid)}
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2.5 text-sm text-slate-700">
                            Pension Fund
                          </td>
                          <td className="px-4 py-2.5 text-right text-sm font-medium text-red-600">
                            -{formatNAD(viewPayslip.employee.deductions.pension)}
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2.5 text-sm text-slate-700">
                            Union Fees
                          </td>
                          <td className="px-4 py-2.5 text-right text-sm font-medium text-red-600">
                            -{formatNAD(viewPayslip.employee.deductions.unionFees)}
                          </td>
                        </tr>
                        <tr className="bg-slate-50 font-semibold">
                          <td className="px-4 py-2.5 text-sm text-slate-900">
                            Total Deductions
                          </td>
                          <td className="px-4 py-2.5 text-right text-sm text-red-600">
                            -{formatNAD(viewPayslip.totalDeductions)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Summary */}
                <div className="mb-6 rounded-lg border-2 border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Gross Pay</span>
                    <span className="font-medium text-slate-900">
                      {formatNAD(viewPayslip.grossPay)}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-slate-600">Total Deductions</span>
                    <span className="font-medium text-red-600">
                      -{formatNAD(viewPayslip.totalDeductions)}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-slate-300 pt-3">
                    <span className="text-base font-bold text-slate-900">
                      Net Pay
                    </span>
                    <span className="text-xl font-bold text-green-700">
                      {formatNAD(viewPayslip.netPay)}
                    </span>
                  </div>
                </div>

                {/* Bank Details */}
                <div className="mb-6 rounded-lg bg-slate-50 p-4">
                  <h4 className="mb-2 text-sm font-semibold text-slate-700">
                    Bank Details
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                      <Banknote className="h-3.5 w-3.5 text-slate-400" />
                      <div>
                        <p className="text-xs text-slate-500">Bank Name</p>
                        <p className="text-sm font-medium text-slate-900">
                          {viewPayslip.employee.bankName}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Account Number</p>
                      <p className="text-sm font-medium text-slate-900">
                        {viewPayslip.employee.bankAccount}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer notice */}
                <p className="text-center text-xs text-slate-400">
                  This is a computer-generated payslip and does not require a
                  signature.
                </p>
              </div>

              {/* Modal footer */}
              <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
                <button
                  onClick={() => setViewPayslip(null)}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Close
                </button>
                {(viewPayslip.status === "GENERATED" ||
                  viewPayslip.status === "DRAFT") && (
                  <button
                    onClick={() => handleSendFromDetail(viewPayslip.id)}
                    className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                  >
                    <Send className="h-4 w-4" />
                    Send to Employee
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
