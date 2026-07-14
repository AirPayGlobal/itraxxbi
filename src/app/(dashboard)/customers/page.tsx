"use client";

import { useState, useMemo } from "react";
import {
  Users,
  FileText,
  UserCheck,
  UserPlus,
  Plus,
  Search,
  Mail,
  Phone,
  MapPin,
  Calendar,
  X,
  Building2,
  Pencil,
  Trash2,
  Loader2,
} from "lucide-react";
import { cn, getStatusColor, formatDate } from "@/lib/utils";
import {
  useCustomers,
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
  type Customer,
  type CustomerInput,
} from "@/lib/hooks/use-customers";
import type { CustomerStatus } from "@/lib/supabase/database.types";

const statusFilters = ["All", "Prospect", "Active", "Inactive", "Churned"] as const;

const emptyForm: CustomerInput = {
  name: "",
  company: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  country: "Namibia",
  status: "ACTIVE",
  notes: "",
};

export default function CustomersPage() {
  const { data: customers = [], isLoading, isError, error } = useCustomers();
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const deleteCustomer = useDeleteCustomer();

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CustomerInput>(emptyForm);

  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      const matchesStatus =
        statusFilter === "All" ||
        customer.status === statusFilter.toUpperCase();

      const query = searchQuery.toLowerCase();
      const matchesSearch =
        query === "" ||
        customer.name.toLowerCase().includes(query) ||
        (customer.company ?? "").toLowerCase().includes(query) ||
        (customer.email ?? "").toLowerCase().includes(query) ||
        (customer.city ?? "").toLowerCase().includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [customers, statusFilter, searchQuery]);

  const stats = useMemo(() => {
    const active = customers.filter((c) => c.status === "ACTIVE").length;
    const prospects = customers.filter((c) => c.status === "PROSPECT").length;
    const withContract = customers.filter(
      (c) => c.contract_start && c.contract_end
    ).length;
    return [
      {
        label: "Total Customers",
        value: String(customers.length),
        icon: Users,
        color: "text-blue-600 bg-blue-50",
      },
      {
        label: "Active",
        value: String(active),
        icon: UserCheck,
        color: "text-green-600 bg-green-50",
      },
      {
        label: "Active Contracts",
        value: String(withContract),
        icon: FileText,
        color: "text-purple-600 bg-purple-50",
      },
      {
        label: "Prospects",
        value: String(prospects),
        icon: UserPlus,
        color: "text-amber-600 bg-amber-50",
      },
    ];
  }, [customers]);

  const handleFormChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  function openCreate() {
    setEditingId(null);
    setFormData(emptyForm);
    setShowModal(true);
  }

  function openEdit(customer: Customer) {
    setEditingId(customer.id);
    setFormData({
      name: customer.name,
      company: customer.company ?? "",
      email: customer.email ?? "",
      phone: customer.phone ?? "",
      address: customer.address ?? "",
      city: customer.city ?? "",
      country: customer.country ?? "Namibia",
      status: customer.status,
      notes: customer.notes ?? "",
    });
    setSelectedCustomer(null);
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: CustomerInput = {
      ...formData,
      company: formData.company || null,
      email: formData.email || null,
      phone: formData.phone || null,
      address: formData.address || null,
      city: formData.city || null,
    };
    try {
      if (editingId) {
        await updateCustomer.mutateAsync({ id: editingId, ...payload });
      } else {
        await createCustomer.mutateAsync(payload);
      }
      setShowModal(false);
      setFormData(emptyForm);
      setEditingId(null);
    } catch {
      // error toast handled in the hook
    }
  }

  async function handleDelete(customer: Customer) {
    if (
      !window.confirm(
        `Delete ${customer.name}? This cannot be undone.`
      )
    )
      return;
    try {
      await deleteCustomer.mutateAsync(customer.id);
      setSelectedCustomer(null);
    } catch {
      // handled in hook
    }
  }

  const isSaving = createCustomer.isPending || updateCustomer.isPending;

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      {/* Page Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Customer Management
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your clients, contracts, and fleet tracking relationships
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <Plus className="h-4 w-4" />
          New Customer
        </button>
      </div>

      {/* Stats Row */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  {stat.label}
                </p>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {isLoading ? "—" : stat.value}
                </p>
              </div>
              <div className={cn("rounded-lg p-3", stat.color)}>
                <stat.icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter / Search Bar */}
      <div className="mb-6 flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {statusFilters.map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                statusFilter === filter
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              {filter}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search customers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* States */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white py-16 shadow-sm">
          <Loader2 className="mb-3 h-8 w-8 animate-spin text-blue-500" />
          <p className="text-sm text-gray-500">Loading customers…</p>
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 py-16 shadow-sm">
          <p className="text-lg font-medium text-red-700">
            Failed to load customers
          </p>
          <p className="mt-1 text-sm text-red-500">
            {(error as Error)?.message ?? "Please try again."}
          </p>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white py-16 shadow-sm">
          <Users className="mb-3 h-12 w-12 text-gray-300" />
          <p className="text-lg font-medium text-gray-500">
            No customers found
          </p>
          <p className="mt-1 text-sm text-gray-400">
            {customers.length === 0
              ? "Create your first customer to get started"
              : "Try adjusting your filters or search query"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredCustomers.map((customer) => (
            <div
              key={customer.id}
              className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              {/* Card Header */}
              <div className="mb-4 flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-lg font-semibold text-gray-900">
                    {customer.name}
                  </h3>
                  <div className="mt-0.5 flex items-center gap-1.5 text-sm text-gray-500">
                    <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">
                      {customer.company ?? "—"}
                    </span>
                  </div>
                </div>
                <span
                  className={cn(
                    "ml-3 inline-flex flex-shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                    getStatusColor(customer.status)
                  )}
                >
                  {customer.status}
                </span>
              </div>

              {/* Contact Info */}
              <div className="mb-4 space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="h-4 w-4 flex-shrink-0 text-gray-400" />
                  <span className="truncate">{customer.email ?? "—"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="h-4 w-4 flex-shrink-0 text-gray-400" />
                  <span>{customer.phone ?? "—"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="h-4 w-4 flex-shrink-0 text-gray-400" />
                  <span>{customer.city ?? "—"}</span>
                </div>
              </div>

              {/* Contract */}
              <div className="mb-4 flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2.5">
                {customer.contract_start && customer.contract_end ? (
                  <div className="flex items-center gap-1.5 text-xs text-gray-600">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>
                      {formatDate(customer.contract_start)} &ndash;{" "}
                      {formatDate(customer.contract_end)}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs italic text-gray-400">
                    No contract on file
                  </span>
                )}
                {customer.account_number && (
                  <code className="rounded bg-white px-2 py-0.5 text-[11px] font-mono text-gray-500">
                    {customer.account_number}
                  </code>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedCustomer(customer)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  <Users className="h-4 w-4" />
                  View
                </button>
                <button
                  onClick={() => openEdit(customer)}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                  aria-label={`Edit ${customer.name}`}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(customer)}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                  aria-label={`Delete ${customer.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Customer Detail Drawer */}
      {selectedCustomer && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/50"
          onClick={() => setSelectedCustomer(null)}
        >
          <div
            className="h-full w-full max-w-md overflow-y-auto bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Customer Details
              </h2>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="space-y-6 px-6 py-5">
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      {selectedCustomer.name}
                    </h3>
                    <div className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
                      <Building2 className="h-4 w-4" />
                      <span>{selectedCustomer.company ?? "—"}</span>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                      getStatusColor(selectedCustomer.status)
                    )}
                  >
                    {selectedCustomer.status}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
                  Contact Information
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                      <Mail className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Email</p>
                      <p className="font-medium text-gray-900">
                        {selectedCustomer.email ?? "—"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50 text-green-600">
                      <Phone className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Phone</p>
                      <p className="font-medium text-gray-900">
                        {selectedCustomer.phone ?? "—"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Location</p>
                      <p className="font-medium text-gray-900">
                        {[selectedCustomer.city, selectedCustomer.country]
                          .filter(Boolean)
                          .join(", ") || "—"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {selectedCustomer.address && (
                <div>
                  <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
                    Address
                  </h4>
                  <p className="text-sm text-gray-700">
                    {selectedCustomer.address}
                  </p>
                </div>
              )}

              <div>
                <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
                  Contract Period
                </h4>
                {selectedCustomer.contract_start &&
                selectedCustomer.contract_end ? (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-gray-700 shadow-sm">
                        <Calendar className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {formatDate(selectedCustomer.contract_start)} &ndash;{" "}
                          {formatDate(selectedCustomer.contract_end)}
                        </p>
                        <p className="text-xs text-gray-500">Active Contract</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm italic text-gray-400">
                    No contract on file
                  </p>
                )}
              </div>

              {selectedCustomer.notes && (
                <div>
                  <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
                    Notes
                  </h4>
                  <p className="whitespace-pre-wrap text-sm text-gray-700">
                    {selectedCustomer.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="flex gap-3 border-t border-gray-200 px-6 py-4">
              <button
                onClick={() => openEdit(selectedCustomer)}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                <Pencil className="h-4 w-4" />
                Edit
              </button>
              <button
                onClick={() => handleDelete(selectedCustomer)}
                className="flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New/Edit Customer Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingId ? "Edit Customer" : "New Customer"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit}>
              <div className="max-h-[65vh] space-y-4 overflow-y-auto px-6 py-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleFormChange}
                    placeholder="Customer full name"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Company
                    </label>
                    <input
                      type="text"
                      name="company"
                      value={formData.company ?? ""}
                      onChange={handleFormChange}
                      placeholder="Company or group name"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Status
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleFormChange}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {(
                        [
                          "PROSPECT",
                          "ACTIVE",
                          "INACTIVE",
                          "CHURNED",
                        ] as CustomerStatus[]
                      ).map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email ?? ""}
                      onChange={handleFormChange}
                      placeholder="email@company.com"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Phone
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone ?? ""}
                      onChange={handleFormChange}
                      placeholder="+264 61 000 0000"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Address
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address ?? ""}
                    onChange={handleFormChange}
                    placeholder="Street address"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      City
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city ?? ""}
                      onChange={handleFormChange}
                      placeholder="City"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Country
                    </label>
                    <input
                      type="text"
                      name="country"
                      value={formData.country ?? ""}
                      onChange={handleFormChange}
                      placeholder="Country"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Notes
                  </label>
                  <textarea
                    name="notes"
                    rows={3}
                    value={formData.notes ?? ""}
                    onChange={handleFormChange}
                    placeholder="Additional notes about the customer..."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingId ? "Save Changes" : "Create Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
