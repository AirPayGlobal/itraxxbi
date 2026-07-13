"use client";

import { useState, useMemo } from "react";
import {
  TrendingUp,
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
  Trash2,
  Loader2,
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
import {
  useInvoices,
  useInvoiceItems,
  useCreateInvoice,
  useUpdateInvoiceStatus,
  useSendInvoice,
  useDeleteInvoice,
  type Invoice,
  type InvoiceInput,
  type InvoiceItemInput,
} from "@/lib/hooks/use-invoices";
import { useCustomers } from "@/lib/hooks/use-customers";
import {
  useExpenses,
  useCreateExpense,
  useSetExpenseApproved,
  useDeleteExpense,
} from "@/lib/hooks/use-expenses";
import type {
  InvoiceStatus,
  ExpenseCategory,
} from "@/lib/supabase/database.types";

// ---------------------------------------------------------------------------
// Mock Data — Reports charts only (not yet wired to Supabase)
// ---------------------------------------------------------------------------

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "FUEL",
  "MAINTENANCE",
  "SALARY",
  "RENT",
  "UTILITIES",
  "EQUIPMENT",
  "TRAVEL",
  "MARKETING",
  "INSURANCE",
  "OTHER",
];

const emptyExpenseForm = {
  description: "",
  amount: "",
  category: "OTHER" as ExpenseCategory,
  date: "",
  vendor: "",
  notes: "",
};

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
// Invoice form
// ---------------------------------------------------------------------------

type LineItemForm = { description: string; quantity: string; unit_price: string };

const emptyLineItem: LineItemForm = { description: "", quantity: "1", unit_price: "" };

const initialInvoiceForm = {
  customer_id: "",
  taxRate: "15",
  issued_date: "",
  due_date: "",
  notes: "",
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function FinancePage() {
  const { data: invoices = [], isLoading, isError, error } = useInvoices();
  const { data: customers = [] } = useCustomers();
  const createInvoice = useCreateInvoice();
  const updateStatus = useUpdateInvoiceStatus();
  const sendInvoice = useSendInvoice();
  const deleteInvoice = useDeleteInvoice();

  const { data: expenses = [], isLoading: expensesLoading } = useExpenses();
  const createExpense = useCreateExpense();
  const setExpenseApproved = useSetExpenseApproved();
  const deleteExpense = useDeleteExpense();
  const [showNewExpense, setShowNewExpense] = useState(false);
  const [expenseForm, setExpenseForm] = useState(emptyExpenseForm);

  const [activeTab, setActiveTab] = useState<string>("Invoices");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewInvoice, setShowNewInvoice] = useState(false);
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const [invoiceForm, setInvoiceForm] = useState(initialInvoiceForm);
  const [lineItems, setLineItems] = useState<LineItemForm[]>([{ ...emptyLineItem }]);

  const { data: viewItems = [] } = useInvoiceItems(viewInvoice?.id ?? null);

  // Map customer id -> name for display/search
  const customerName = useMemo(() => {
    const map = new Map<string, string>();
    customers.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [customers]);

  const nameFor = (id: string) => customerName.get(id) ?? "—";

  // Derived KPIs (real data)
  const totalInvoiced = invoices.reduce((sum, i) => sum + i.total, 0);
  const paidTotal = invoices
    .filter((i) => i.status === "PAID")
    .reduce((sum, i) => sum + i.total, 0);
  const outstandingInvoices = invoices.filter((i) =>
    ["SENT", "OVERDUE", "PARTIAL"].includes(i.status)
  );
  const totalOutstanding = outstandingInvoices.reduce((sum, i) => sum + i.total, 0);
  const overdueInvoices = invoices.filter((i) => i.status === "OVERDUE");
  const overdueTotal = overdueInvoices.reduce((sum, i) => sum + i.total, 0);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchesStatus =
        statusFilter === "All" || inv.status === statusFilter.toUpperCase();
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        query === "" ||
        inv.invoice_number.toLowerCase().includes(query) ||
        nameFor(inv.customer_id).toLowerCase().includes(query);
      return matchesStatus && matchesSearch;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, searchQuery, invoices, customerName]);

  const filteredExpenses = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return expenses.filter(
      (exp) =>
        query === "" ||
        exp.description.toLowerCase().includes(query) ||
        (exp.vendor ?? "").toLowerCase().includes(query) ||
        exp.category.toLowerCase().includes(query)
    );
  }, [searchQuery, expenses]);

  async function handleExpenseSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createExpense.mutateAsync({
        description: expenseForm.description,
        amount: parseFloat(expenseForm.amount) || 0,
        category: expenseForm.category,
        date: expenseForm.date,
        vendor: expenseForm.vendor || null,
        notes: expenseForm.notes || null,
      });
      setShowNewExpense(false);
      setExpenseForm(emptyExpenseForm);
    } catch {
      /* handled in hook */
    }
  }

  // Line item computed totals (preview)
  const parsedItems = lineItems.map((li) => ({
    quantity: parseFloat(li.quantity) || 0,
    unit_price: parseFloat(li.unit_price) || 0,
  }));
  const formSubtotal = parsedItems.reduce(
    (s, i) => s + i.quantity * i.unit_price,
    0
  );
  const formTaxRate = parseFloat(invoiceForm.taxRate) || 0;
  const formTax = formSubtotal * (formTaxRate / 100);
  const formTotal = formSubtotal + formTax;

  function resetForm() {
    setInvoiceForm(initialInvoiceForm);
    setLineItems([{ ...emptyLineItem }]);
  }

  function openCreate() {
    resetForm();
    setShowNewInvoice(true);
  }

  function updateLineItem(index: number, patch: Partial<LineItemForm>) {
    setLineItems((prev) =>
      prev.map((li, i) => (i === index ? { ...li, ...patch } : li))
    );
  }

  function addLineItem() {
    setLineItems((prev) => [...prev, { ...emptyLineItem }]);
  }

  function removeLineItem(index: number) {
    setLineItems((prev) =>
      prev.length === 1 ? prev : prev.filter((_, i) => i !== index)
    );
  }

  async function handleCreateInvoice(e: React.FormEvent) {
    e.preventDefault();
    const items: InvoiceItemInput[] = lineItems
      .filter((li) => li.description.trim())
      .map((li) => ({
        description: li.description.trim(),
        quantity: parseFloat(li.quantity) || 0,
        unit_price: parseFloat(li.unit_price) || 0,
      }));

    // useCreateInvoice throws if items are empty — surface it before submitting.
    if (items.length === 0) {
      // toast handled by hook on throw, but validate early for a clear message
      // eslint-disable-next-line no-alert
      window.alert("Add at least one line item with a description.");
      return;
    }

    const payload: InvoiceInput = {
      customer_id: invoiceForm.customer_id,
      tax_rate: formTaxRate,
      status: "DRAFT",
      issued_date: invoiceForm.issued_date || null,
      due_date: invoiceForm.due_date || null,
      notes: invoiceForm.notes || null,
      items,
    };

    try {
      await createInvoice.mutateAsync(payload);
      setShowNewInvoice(false);
      resetForm();
    } catch {
      // error toast handled in the hook
    }
  }

  async function handleSend(invoice: Invoice) {
    try {
      await sendInvoice.mutateAsync(invoice.id);
    } catch {
      // handled in hook
    }
  }

  async function handleMarkPaid(invoice: Invoice) {
    try {
      await updateStatus.mutateAsync({ id: invoice.id, status: "PAID" });
      setViewInvoice(null);
    } catch {
      // handled in hook
    }
  }

  async function handleDelete(invoice: Invoice) {
    if (
      !window.confirm(
        `Delete ${invoice.invoice_number}? This cannot be undone.`
      )
    )
      return;
    try {
      await deleteInvoice.mutateAsync(invoice.id);
      setViewInvoice(null);
    } catch {
      // handled in hook
    }
  }

  const isSaving = createInvoice.isPending;

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
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          New Invoice
        </button>
      </div>

      {/* KPI Stats — derived from real invoices */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Total Invoiced</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {isLoading ? "—" : formatCurrency(totalInvoiced)}
              </p>
            </div>
            <div className="rounded-lg bg-blue-50 p-3 text-blue-600">
              <Receipt className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1 text-xs text-slate-500">
            <span>{isLoading ? "—" : `${invoices.length} invoices`}</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Paid</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {isLoading ? "—" : formatCurrency(paidTotal)}
              </p>
            </div>
            <div className="rounded-lg bg-green-50 p-3 text-green-600">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1 text-xs text-green-600">
            <ArrowUpRight className="h-3 w-3" />
            <span>
              {isLoading
                ? "—"
                : `${invoices.filter((i) => i.status === "PAID").length} paid invoices`}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Outstanding</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {isLoading ? "—" : formatCurrency(totalOutstanding)}
              </p>
            </div>
            <div className="rounded-lg bg-amber-50 p-3 text-amber-600">
              <CreditCard className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1 text-xs text-slate-500">
            <span>
              {isLoading
                ? "—"
                : `${outstandingInvoices.length} pending invoices`}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Overdue Invoices</p>
              <p className="mt-1 text-2xl font-bold text-red-600">
                {isLoading ? "—" : overdueInvoices.length}
              </p>
            </div>
            <div className="rounded-lg bg-red-50 p-3 text-red-600">
              <AlertCircle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1 text-xs text-red-500">
            <ArrowDownRight className="h-3 w-3" />
            <span>{isLoading ? "—" : `${formatCurrency(overdueTotal)} overdue`}</span>
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

          {/* States */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white py-16 shadow-sm">
              <Loader2 className="mb-3 h-8 w-8 animate-spin text-blue-500" />
              <p className="text-sm text-slate-500">Loading invoices…</p>
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 py-16 shadow-sm">
              <p className="text-lg font-medium text-red-700">
                Failed to load invoices
              </p>
              <p className="mt-1 text-sm text-red-500">
                {(error as Error)?.message ?? "Please try again."}
              </p>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white py-16 shadow-sm">
              <Receipt className="mb-3 h-12 w-12 text-slate-300" />
              <p className="text-lg font-medium text-slate-500">
                No invoices found
              </p>
              <p className="mt-1 text-sm text-slate-400">
                {invoices.length === 0
                  ? "Create your first invoice to get started"
                  : "Try adjusting your filters or search query"}
              </p>
            </div>
          ) : (
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
                          {inv.invoice_number}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-700">
                          {nameFor(inv.customer_id)}
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
                          {inv.issued_date ? formatDate(inv.issued_date) : "—"}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                          {inv.due_date ? formatDate(inv.due_date) : "—"}
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
                                className="rounded p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-green-600 disabled:opacity-50"
                                title="Email invoice to customer"
                                disabled={sendInvoice.isPending}
                                onClick={() => handleSend(inv)}
                              >
                                <Send className="h-4 w-4" />
                              </button>
                            )}
                            {["SENT", "OVERDUE", "PARTIAL"].includes(
                              inv.status
                            ) && (
                              <button
                                className="rounded p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-green-600 disabled:opacity-50"
                                title="Mark paid"
                                disabled={updateStatus.isPending}
                                onClick={() => handleMarkPaid(inv)}
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              className="cursor-not-allowed rounded p-1.5 text-slate-300"
                              title="PDF export coming soon"
                              disabled
                            >
                              <Download className="h-4 w-4" />
                            </button>
                            <button
                              className="rounded p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-red-600 disabled:opacity-50"
                              title="Delete"
                              disabled={deleteInvoice.isPending}
                              onClick={() => handleDelete(inv)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
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
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
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
              <button
                onClick={() => setShowNewExpense(true)}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Add Expense
              </button>
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
                    <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {expensesLoading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                        <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-blue-500" />
                        <p className="text-sm">Loading expenses…</p>
                      </td>
                    </tr>
                  ) : filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                        <Receipt className="mx-auto mb-3 h-8 w-8 text-slate-300" />
                        <p className="text-sm font-medium">No expenses recorded</p>
                        <p className="mt-1 text-xs">
                          Use &quot;Add Expense&quot; to record one.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map((exp) => (
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
                          {exp.vendor ?? "—"}
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
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              title={exp.approved ? "Revoke approval" : "Approve"}
                              disabled={setExpenseApproved.isPending}
                              onClick={() =>
                                setExpenseApproved.mutate({
                                  id: exp.id,
                                  approved: !exp.approved,
                                })
                              }
                              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-green-50 hover:text-green-600 disabled:opacity-50"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </button>
                            <button
                              title="Delete"
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `Delete expense "${exp.description}"?`
                                  )
                                )
                                  deleteExpense.mutate(exp.id);
                              }}
                              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Reports Tab */}
      {/* TODO: expenses not yet wired to Supabase */}
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
                {viewInvoice.invoice_number}
              </h2>
              <button
                onClick={() => setViewInvoice(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[70vh] space-y-4 overflow-y-auto px-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-slate-500">Customer</p>
                  <p className="text-sm font-medium text-slate-900">
                    {nameFor(viewInvoice.customer_id)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Status</p>
                  <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", getStatusColor(viewInvoice.status))}>
                    {viewInvoice.status}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Issued Date</p>
                  <p className="text-sm text-slate-700">
                    {viewInvoice.issued_date ? formatDate(viewInvoice.issued_date) : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Due Date</p>
                  <p className="text-sm text-slate-700">
                    {viewInvoice.due_date ? formatDate(viewInvoice.due_date) : "—"}
                  </p>
                </div>
                {viewInvoice.paid_date && (
                  <div>
                    <p className="text-xs font-medium text-slate-500">Paid Date</p>
                    <p className="text-sm text-green-600">{formatDate(viewInvoice.paid_date)}</p>
                  </div>
                )}
              </div>

              {/* Line items */}
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-400">
                  Line Items
                </p>
                {viewItems.length === 0 ? (
                  <p className="text-sm italic text-slate-400">No line items.</p>
                ) : (
                  <div className="overflow-hidden rounded-lg border border-slate-200">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 text-left text-xs text-slate-500">
                          <th className="px-3 py-2 font-medium">Description</th>
                          <th className="px-3 py-2 text-right font-medium">Qty</th>
                          <th className="px-3 py-2 text-right font-medium">Unit</th>
                          <th className="px-3 py-2 text-right font-medium">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {viewItems.map((item) => (
                          <tr key={item.id}>
                            <td className="px-3 py-2 text-slate-700">{item.description}</td>
                            <td className="px-3 py-2 text-right text-slate-600">{item.quantity}</td>
                            <td className="px-3 py-2 text-right text-slate-600">{formatCurrency(item.unit_price)}</td>
                            <td className="px-3 py-2 text-right font-medium text-slate-900">{formatCurrency(item.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {viewInvoice.notes && (
                <div>
                  <p className="text-xs font-medium text-slate-500">Notes</p>
                  <p className="whitespace-pre-wrap text-sm text-slate-700">{viewInvoice.notes}</p>
                </div>
              )}

              <div className="rounded-lg bg-slate-50 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="text-slate-700">{formatCurrency(viewInvoice.subtotal)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-slate-500">Tax</span>
                  <span className="text-slate-700">{formatCurrency(viewInvoice.tax)}</span>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
                  <span className="text-sm font-semibold text-slate-900">Total</span>
                  <span className="text-lg font-bold text-slate-900">{formatCurrency(viewInvoice.total)}</span>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
              {["SENT", "OVERDUE", "PARTIAL"].includes(viewInvoice.status) && (
                <button
                  onClick={() => handleMarkPaid(viewInvoice)}
                  disabled={updateStatus.isPending}
                  className="inline-flex items-center gap-2 rounded-lg border border-green-200 bg-white px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-50 disabled:opacity-50"
                >
                  {updateStatus.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  <CheckCircle2 className="h-4 w-4" />
                  Mark Paid
                </button>
              )}
              <button
                onClick={() => setViewInvoice(null)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
              <button
                disabled
                title="PDF export coming soon"
                className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg bg-slate-300 px-4 py-2 text-sm font-medium text-white"
              >
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
                onClick={() => { setShowNewInvoice(false); resetForm(); }}
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
                    value={invoiceForm.customer_id}
                    onChange={(e) => setInvoiceForm((prev) => ({ ...prev, customer_id: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Select customer...</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Line items editor */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="block text-sm font-medium text-slate-700">
                      Line Items <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={addLineItem}
                      className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add item
                    </button>
                  </div>
                  <div className="space-y-2">
                    {lineItems.map((li, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <input
                          type="text"
                          placeholder="Description"
                          value={li.description}
                          onChange={(e) => updateLineItem(index, { description: e.target.value })}
                          className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="Qty"
                          value={li.quantity}
                          onChange={(e) => updateLineItem(index, { quantity: e.target.value })}
                          className="w-16 rounded-lg border border-slate-300 px-2 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Unit"
                          value={li.unit_price}
                          onChange={(e) => updateLineItem(index, { unit_price: e.target.value })}
                          className="w-24 rounded-lg border border-slate-300 px-2 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => removeLineItem(index)}
                          disabled={lineItems.length === 1}
                          className="mt-0.5 rounded p-2 text-slate-400 hover:bg-slate-100 hover:text-red-600 disabled:opacity-40"
                          title="Remove"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Tax Rate (%)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={invoiceForm.taxRate}
                      onChange={(e) => setInvoiceForm((prev) => ({ ...prev, taxRate: e.target.value }))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex flex-col justify-end">
                    <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
                      <div className="flex justify-between text-slate-500">
                        <span>Subtotal</span>
                        <span>{formatCurrency(formSubtotal)}</span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>Tax</span>
                        <span>{formatCurrency(formTax)}</span>
                      </div>
                      <div className="flex justify-between font-semibold text-slate-900">
                        <span>Total</span>
                        <span>{formatCurrency(formTotal)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Issue Date</label>
                    <input
                      type="date"
                      value={invoiceForm.issued_date}
                      onChange={(e) => setInvoiceForm((prev) => ({ ...prev, issued_date: e.target.value }))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Due Date</label>
                    <input
                      type="date"
                      value={invoiceForm.due_date}
                      onChange={(e) => setInvoiceForm((prev) => ({ ...prev, due_date: e.target.value }))}
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
                  onClick={() => { setShowNewInvoice(false); resetForm(); }}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Create Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Expense Modal */}
      {showNewExpense && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowNewExpense(false)}
        >
          <div
            className="w-full max-w-lg rounded-xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-900">
                Record Expense
              </h2>
              <button
                onClick={() => setShowNewExpense(false)}
                className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleExpenseSubmit}>
              <div className="space-y-4 px-6 py-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={expenseForm.description}
                    onChange={(e) =>
                      setExpenseForm((p) => ({
                        ...p,
                        description: e.target.value,
                      }))
                    }
                    placeholder="e.g. Office rent - March"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Amount (N$) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={expenseForm.amount}
                      onChange={(e) =>
                        setExpenseForm((p) => ({ ...p, amount: e.target.value }))
                      }
                      placeholder="0.00"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={expenseForm.category}
                      onChange={(e) =>
                        setExpenseForm((p) => ({
                          ...p,
                          category: e.target.value as ExpenseCategory,
                        }))
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {EXPENSE_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c.charAt(0) + c.slice(1).toLowerCase()}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={expenseForm.date}
                      onChange={(e) =>
                        setExpenseForm((p) => ({ ...p, date: e.target.value }))
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Vendor
                    </label>
                    <input
                      type="text"
                      value={expenseForm.vendor}
                      onChange={(e) =>
                        setExpenseForm((p) => ({ ...p, vendor: e.target.value }))
                      }
                      placeholder="Supplier / payee"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Notes
                  </label>
                  <textarea
                    rows={2}
                    value={expenseForm.notes}
                    onChange={(e) =>
                      setExpenseForm((p) => ({ ...p, notes: e.target.value }))
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
                <button
                  type="button"
                  onClick={() => setShowNewExpense(false)}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createExpense.isPending}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {createExpense.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  Record Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
