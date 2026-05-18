"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  DollarSign,
  FileText,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Receipt,
  Plus,
  Search,
  Eye,
  Send,
  CheckCircle2,
  AlertCircle,
  X,
  Download,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { cn, getStatusColor, formatDate, formatCurrency } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Invoice {
  id: string;
  invoiceNumber: string;
  customer: string;
  jobCard: string | null;
  subtotal: number;
  tax: number;
  total: number;
  status: string;
  issuedDate: string;
  dueDate: string;
  paidDate: string | null;
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  vendor: string;
  approved: boolean;
}

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const mockInvoices: Invoice[] = [
  {
    id: "1",
    invoiceNumber: "INV-2602-0001",
    customer: "Namibia Breweries Ltd",
    jobCard: "JC-2602-0001",
    subtotal: 4500,
    tax: 675,
    total: 5175,
    status: "PAID",
    issuedDate: "2026-02-01",
    dueDate: "2026-02-15",
    paidDate: "2026-02-12",
  },
  {
    id: "2",
    invoiceNumber: "INV-2602-0002",
    customer: "TransNamib Holdings",
    jobCard: "JC-2602-0002",
    subtotal: 12000,
    tax: 1800,
    total: 13800,
    status: "SENT",
    issuedDate: "2026-02-05",
    dueDate: "2026-02-19",
    paidDate: null,
  },
  {
    id: "3",
    invoiceNumber: "INV-2602-0003",
    customer: "Pupkewitz Motors",
    jobCard: "JC-2602-0003",
    subtotal: 2800,
    tax: 420,
    total: 3220,
    status: "OVERDUE",
    issuedDate: "2026-01-20",
    dueDate: "2026-02-03",
    paidDate: null,
  },
  {
    id: "4",
    invoiceNumber: "INV-2602-0004",
    customer: "Ohlthaver & List",
    jobCard: "JC-2602-0004",
    subtotal: 1500,
    tax: 225,
    total: 1725,
    status: "DRAFT",
    issuedDate: "2026-02-18",
    dueDate: "2026-03-04",
    paidDate: null,
  },
  {
    id: "5",
    invoiceNumber: "INV-2602-0005",
    customer: "Meat Corp Namibia",
    jobCard: "JC-2602-0005",
    subtotal: 8500,
    tax: 1275,
    total: 9775,
    status: "PAID",
    issuedDate: "2026-01-25",
    dueDate: "2026-02-08",
    paidDate: "2026-02-06",
  },
  {
    id: "6",
    invoiceNumber: "INV-2602-0006",
    customer: "Bank Windhoek",
    jobCard: null,
    subtotal: 3200,
    tax: 480,
    total: 3680,
    status: "PARTIAL",
    issuedDate: "2026-02-10",
    dueDate: "2026-02-24",
    paidDate: null,
  },
  {
    id: "7",
    invoiceNumber: "INV-2602-0007",
    customer: "FNB Namibia",
    jobCard: "JC-2602-0008",
    subtotal: 6000,
    tax: 900,
    total: 6900,
    status: "SENT",
    issuedDate: "2026-02-15",
    dueDate: "2026-03-01",
    paidDate: null,
  },
  {
    id: "8",
    invoiceNumber: "INV-2601-0048",
    customer: "Namibia Breweries Ltd",
    jobCard: "JC-2601-0045",
    subtotal: 5200,
    tax: 780,
    total: 5980,
    status: "PAID",
    issuedDate: "2026-01-15",
    dueDate: "2026-01-29",
    paidDate: "2026-01-28",
  },
];

const mockExpenses: Expense[] = [
  { id: "1", description: "GPS Tracker Units (x50)", amount: 15000, category: "EQUIPMENT", date: "2026-02-01", vendor: "SinoTrack Global", approved: true },
  { id: "2", description: "Vehicle fuel - Fleet A", amount: 2400, category: "FUEL", date: "2026-02-05", vendor: "Engen Namibia", approved: true },
  { id: "3", description: "Office rent - February", amount: 8500, category: "RENT", date: "2026-02-01", vendor: "Windhoek Properties", approved: true },
  { id: "4", description: "Soldering station & tools", amount: 1800, category: "EQUIPMENT", date: "2026-02-10", vendor: "RS Components", approved: true },
  { id: "5", description: "Insurance premium - Q1", amount: 4500, category: "INSURANCE", date: "2026-02-15", vendor: "Old Mutual Namibia", approved: false },
  { id: "6", description: "Staff salaries - February", amount: 45000, category: "SALARY", date: "2026-02-25", vendor: "Payroll", approved: true },
  { id: "7", description: "Marketing - Google Ads", amount: 1200, category: "MARKETING", date: "2026-02-12", vendor: "Google LLC", approved: true },
  { id: "8", description: "SIM cards for trackers (x100)", amount: 800, category: "EQUIPMENT", date: "2026-02-08", vendor: "MTC Namibia", approved: true },
];

const revenueByMonth = [
  { month: "Sep", revenue: 35000, expenses: 28000 },
  { month: "Oct", revenue: 38000, expenses: 30000 },
  { month: "Nov", revenue: 42000, expenses: 32000 },
  { month: "Dec", revenue: 45000, expenses: 35000 },
  { month: "Jan", revenue: 48000, expenses: 38000 },
  { month: "Feb", revenue: 50275, expenses: 41000 },
];

const invoiceStatusBreakdown = [
  { name: "Paid", value: 3, color: "#22c55e" },
  { name: "Sent", value: 2, color: "#3b82f6" },
  { name: "Draft", value: 1, color: "#94a3b8" },
  { name: "Overdue", value: 1, color: "#ef4444" },
  { name: "Partial", value: 1, color: "#f59e0b" },
];

const expenseByCategory = [
  { category: "Salary", amount: 45000 },
  { category: "Equipment", amount: 17600 },
  { category: "Rent", amount: 8500 },
  { category: "Insurance", amount: 4500 },
  { category: "Fuel", amount: 2400 },
  { category: "Marketing", amount: 1200 },
];

const statusFilters = ["All", "Draft", "Sent", "Paid", "Overdue", "Partial"] as const;
const tabs = ["Invoices", "Expenses", "Reports"] as const;

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const initialInvoiceForm = {
  customer: "",
  jobCard: "",
  subtotal: "",
  tax: "",
  issuedDate: "",
  dueDate: "",
  notes: "",
};

export default function FinancePage() {
  const [activeTab, setActiveTab] = useState<string>("Invoices");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewInvoice, setShowNewInvoice] = useState(false);
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>(mockInvoices);
  const [invoiceForm, setInvoiceForm] = useState(initialInvoiceForm);

  const totalRevenue = invoices
    .filter((i) => i.status === "PAID")
    .reduce((sum, i) => sum + i.total, 0);
  const totalOutstanding = invoices
    .filter((i) => ["SENT", "OVERDUE", "PARTIAL"].includes(i.status))
    .reduce((sum, i) => sum + i.total, 0);
  const totalExpenses = mockExpenses
    .filter((e) => e.approved)
    .reduce((sum, e) => sum + e.amount, 0);
  const overdueCount = invoices.filter((i) => i.status === "OVERDUE").length;

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchesStatus =
        statusFilter === "All" || inv.status === statusFilter.toUpperCase();
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        query === "" ||
        inv.invoiceNumber.toLowerCase().includes(query) ||
        inv.customer.toLowerCase().includes(query);
      return matchesStatus && matchesSearch;
    });
  }, [statusFilter, searchQuery, invoices]);

  const filteredExpenses = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return mockExpenses.filter(
      (exp) =>
        query === "" ||
        exp.description.toLowerCase().includes(query) ||
        exp.vendor.toLowerCase().includes(query) ||
        exp.category.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const handleSubtotalChange = (value: string) => {
    const subtotalNum = parseFloat(value) || 0;
    const tax = (subtotalNum * 0.15).toFixed(2);
    setInvoiceForm((prev) => ({ ...prev, subtotal: value, tax }));
  };

  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    const subtotal = parseFloat(invoiceForm.subtotal) || 0;
    const tax = parseFloat(invoiceForm.tax) || 0;
    const total = subtotal + tax;
    const seqNum = String(invoices.length + 1).padStart(4, "0");
    const newInvoice: Invoice = {
      id: String(Date.now()),
      invoiceNumber: `INV-2026-${seqNum}`,
      customer: invoiceForm.customer,
      jobCard: invoiceForm.jobCard || null,
      subtotal,
      tax,
      total,
      status: "DRAFT",
      issuedDate: invoiceForm.issuedDate || new Date().toISOString().slice(0, 10),
      dueDate: invoiceForm.dueDate || "",
      paidDate: null,
    };
    setInvoices((prev) => [newInvoice, ...prev]);
    toast.success("Invoice created successfully");
    setShowNewInvoice(false);
    setInvoiceForm(initialInvoiceForm);
  };

  const handleSendInvoice = (invoiceId: string) => {
    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id === invoiceId ? { ...inv, status: "SENT" } : inv
      )
    );
    const inv = invoices.find((i) => i.id === invoiceId);
    if (inv) {
      toast.success(`Invoice ${inv.invoiceNumber} sent to ${inv.customer}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      {/* Page Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Financial Management
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Invoices, expenses, and financial reporting
          </p>
        </div>
        <button
          onClick={() => setShowNewInvoice(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          New Invoice
        </button>
      </div>

      {/* KPI Stats */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Total Revenue</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {formatCurrency(totalRevenue)}
              </p>
            </div>
            <div className="rounded-lg bg-green-50 p-3 text-green-600">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1 text-xs text-green-600">
            <ArrowUpRight className="h-3 w-3" />
            <span>+15% from last month</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Outstanding</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {formatCurrency(totalOutstanding)}
              </p>
            </div>
            <div className="rounded-lg bg-amber-50 p-3 text-amber-600">
              <CreditCard className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1 text-xs text-slate-500">
            <span>{invoices.filter((i) => ["SENT", "OVERDUE", "PARTIAL"].includes(i.status)).length} pending invoices</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Total Expenses</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {formatCurrency(totalExpenses)}
              </p>
            </div>
            <div className="rounded-lg bg-red-50 p-3 text-red-600">
              <Receipt className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1 text-xs text-red-500">
            <ArrowDownRight className="h-3 w-3" />
            <span>+8% from last month</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Overdue Invoices</p>
              <p className="mt-1 text-2xl font-bold text-red-600">{overdueCount}</p>
            </div>
            <div className="rounded-lg bg-red-50 p-3 text-red-600">
              <AlertCircle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1 text-xs text-red-500">
            <span>{formatCurrency(invoices.filter((i) => i.status === "OVERDUE").reduce((s, i) => s + i.total, 0))} overdue</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-slate-200">
        <nav className="-mb-px flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setSearchQuery("");
                setStatusFilter("All");
              }}
              className={cn(
                "border-b-2 pb-3 text-sm font-medium transition-colors",
                activeTab === tab
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
              )}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Invoices Tab */}
      {activeTab === "Invoices" && (
        <>
          {/* Filter / Search */}
          <div className="mb-6 flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {statusFilters.map((filter) => (
                <button
                  key={filter}
                  onClick={() => setStatusFilter(filter)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                    statusFilter === filter
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  {filter}
                </button>
              ))}
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search invoices..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Invoices Table */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      Invoice
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      Job Card
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                      Total
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-slate-500">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      Issued
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      Due
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-blue-600">
                        {inv.invoiceNumber}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-700">
                        {inv.customer}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                        {inv.jobCard || "—"}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-semibold text-slate-900">
                        {formatCurrency(inv.total)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-center">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                            getStatusColor(inv.status)
                          )}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                        {formatDate(inv.issuedDate)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                        {formatDate(inv.dueDate)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setViewInvoice(inv)}
                            className="rounded p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-blue-600"
                            title="View"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {inv.status === "DRAFT" && (
                            <button
                              className="rounded p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-green-600"
                              title="Send"
                              onClick={() => handleSendInvoice(inv.id)}
                            >
                              <Send className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            className="rounded p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                            title="Download PDF"
                            onClick={() => toast.success(`Downloading ${inv.invoiceNumber}.pdf`)}
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredInvoices.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-sm text-slate-500">
                        No invoices found matching your criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Expenses Tab */}
      {activeTab === "Expenses" && (
        <>
          <div className="mb-6 flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-slate-700">
              {filteredExpenses.length} expense{filteredExpenses.length !== 1 ? "s" : ""} &middot; Total:{" "}
              <span className="font-semibold">{formatCurrency(filteredExpenses.reduce((s, e) => s + e.amount, 0))}</span>
            </p>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search expenses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      Category
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      Vendor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      Date
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-slate-500">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredExpenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-slate-900">
                        {exp.description}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                          {exp.category}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-semibold text-slate-900">
                        {formatCurrency(exp.amount)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                        {exp.vendor}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                        {formatDate(exp.date)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-center">
                        {exp.approved ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                            <CheckCircle2 className="h-3 w-3" />
                            Approved
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-yellow-50 px-2.5 py-0.5 text-xs font-medium text-yellow-700">
                            <AlertCircle className="h-3 w-3" />
                            Pending
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Reports Tab */}
      {activeTab === "Reports" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Revenue vs Expenses */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-slate-900">
                Revenue vs Expenses
              </h3>
            </div>
            <div className="p-6">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={revenueByMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12, fill: "#64748b" }}
                    axisLine={{ stroke: "#e2e8f0" }}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
                    tick={{ fontSize: 12, fill: "#64748b" }}
                    axisLine={{ stroke: "#e2e8f0" }}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value ?? 0))}
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                    }}
                  />
                  <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Revenue" />
                  <Bar dataKey="expenses" fill="#f87171" radius={[4, 4, 0, 0]} name="Expenses" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Profit Trend */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-slate-900">
                Profit Trend
              </h3>
            </div>
            <div className="p-6">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={revenueByMonth.map((d) => ({
                    ...d,
                    profit: d.revenue - d.expenses,
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12, fill: "#64748b" }}
                    axisLine={{ stroke: "#e2e8f0" }}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
                    tick={{ fontSize: 12, fill: "#64748b" }}
                    axisLine={{ stroke: "#e2e8f0" }}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value) => [formatCurrency(Number(value ?? 0)), "Profit"] as [string, string]}
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="profit"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={{ fill: "#22c55e", r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Invoice Status Breakdown */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-slate-900">
                Invoice Status Breakdown
              </h3>
            </div>
            <div className="flex items-center justify-center p-6">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={invoiceStatusBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {invoiceStatusBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Expense by Category */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-slate-900">
                Expenses by Category
              </h3>
            </div>
            <div className="p-6">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={expenseByCategory} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    type="number"
                    tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
                    tick={{ fontSize: 12, fill: "#64748b" }}
                    axisLine={{ stroke: "#e2e8f0" }}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="category"
                    tick={{ fontSize: 12, fill: "#64748b" }}
                    axisLine={{ stroke: "#e2e8f0" }}
                    tickLine={false}
                    width={80}
                  />
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value ?? 0))}
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                    }}
                  />
                  <Bar dataKey="amount" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* View Invoice Modal */}
      {viewInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-900">
                {viewInvoice.invoiceNumber}
              </h2>
              <button
                onClick={() => setViewInvoice(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 px-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-slate-500">Customer</p>
                  <p className="text-sm font-medium text-slate-900">{viewInvoice.customer}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Status</p>
                  <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", getStatusColor(viewInvoice.status))}>
                    {viewInvoice.status}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Issued Date</p>
                  <p className="text-sm text-slate-700">{formatDate(viewInvoice.issuedDate)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Due Date</p>
                  <p className="text-sm text-slate-700">{formatDate(viewInvoice.dueDate)}</p>
                </div>
                {viewInvoice.jobCard && (
                  <div>
                    <p className="text-xs font-medium text-slate-500">Job Card</p>
                    <p className="text-sm text-blue-600">{viewInvoice.jobCard}</p>
                  </div>
                )}
                {viewInvoice.paidDate && (
                  <div>
                    <p className="text-xs font-medium text-slate-500">Paid Date</p>
                    <p className="text-sm text-green-600">{formatDate(viewInvoice.paidDate)}</p>
                  </div>
                )}
              </div>
              <div className="rounded-lg bg-slate-50 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="text-slate-700">{formatCurrency(viewInvoice.subtotal)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-slate-500">Tax (15% VAT)</span>
                  <span className="text-slate-700">{formatCurrency(viewInvoice.tax)}</span>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
                  <span className="text-sm font-semibold text-slate-900">Total</span>
                  <span className="text-lg font-bold text-slate-900">{formatCurrency(viewInvoice.total)}</span>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button
                onClick={() => setViewInvoice(null)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
              <button onClick={() => toast.success("Downloading invoice PDF")} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                <Download className="h-4 w-4" />
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Invoice Modal */}
      {showNewInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-900">New Invoice</h2>
              <button
                onClick={() => setShowNewInvoice(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateInvoice}>
              <div className="max-h-[65vh] space-y-4 overflow-y-auto px-6 py-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Customer <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={invoiceForm.customer}
                    onChange={(e) => setInvoiceForm((prev) => ({ ...prev, customer: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Select customer...</option>
                    <option>Namibia Breweries Ltd</option>
                    <option>TransNamib Holdings</option>
                    <option>Pupkewitz Motors</option>
                    <option>Ohlthaver & List</option>
                    <option>Meat Corp Namibia</option>
                    <option>Bank Windhoek</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Job Card (optional)
                  </label>
                  <select
                    value={invoiceForm.jobCard}
                    onChange={(e) => setInvoiceForm((prev) => ({ ...prev, jobCard: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Select job card...</option>
                    <option>JC-2602-0001</option>
                    <option>JC-2602-0002</option>
                    <option>JC-2602-0003</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Subtotal <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      placeholder="0.00"
                      value={invoiceForm.subtotal}
                      onChange={(e) => handleSubtotalChange(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Tax (15%)
                    </label>
                    <input
                      type="number"
                      placeholder="Auto-calculated"
                      disabled
                      value={invoiceForm.tax}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Issue Date</label>
                    <input
                      type="date"
                      value={invoiceForm.issuedDate}
                      onChange={(e) => setInvoiceForm((prev) => ({ ...prev, issuedDate: e.target.value }))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Due Date</label>
                    <input
                      type="date"
                      value={invoiceForm.dueDate}
                      onChange={(e) => setInvoiceForm((prev) => ({ ...prev, dueDate: e.target.value }))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Notes</label>
                  <textarea
                    rows={3}
                    placeholder="Invoice notes..."
                    value={invoiceForm.notes}
                    onChange={(e) => setInvoiceForm((prev) => ({ ...prev, notes: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
                <button
                  type="button"
                  onClick={() => { setShowNewInvoice(false); setInvoiceForm(initialInvoiceForm); }}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Create Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
