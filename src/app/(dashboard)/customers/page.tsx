"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  Users,
  FileText,
  Car,
  DollarSign,
  Plus,
  Search,
  Mail,
  Phone,
  MapPin,
  Calendar,
  X,
  Building2,
  ClipboardList,
} from "lucide-react";
import { cn, getStatusColor, formatDate } from "@/lib/utils";

const mockCustomers = [
  {
    id: "1",
    name: "Namibia Breweries Ltd",
    company: "NBL Group",
    email: "fleet@nbl.com.na",
    phone: "+264 61 320 4999",
    status: "ACTIVE",
    vehicles: 18,
    city: "Windhoek",
    contractStart: "2025-01-15",
    contractEnd: "2026-01-15",
  },
  {
    id: "2",
    name: "TransNamib Holdings",
    company: "TransNamib",
    email: "ops@transnamib.com.na",
    phone: "+264 61 298 2032",
    status: "ACTIVE",
    vehicles: 45,
    city: "Windhoek",
    contractStart: "2025-03-01",
    contractEnd: "2026-03-01",
  },
  {
    id: "3",
    name: "Pupkewitz Motors",
    company: "Pupkewitz Group",
    email: "fleet@pupkewitz.com",
    phone: "+264 61 224 081",
    status: "ACTIVE",
    vehicles: 22,
    city: "Windhoek",
    contractStart: "2025-06-01",
    contractEnd: "2026-06-01",
  },
  {
    id: "4",
    name: "Ohlthaver & List",
    company: "O&L Group",
    email: "transport@ol.na",
    phone: "+264 61 207 5111",
    status: "ACTIVE",
    vehicles: 35,
    city: "Windhoek",
    contractStart: "2025-02-15",
    contractEnd: "2026-02-15",
  },
  {
    id: "5",
    name: "Namibia Logistics",
    company: "NamLog",
    email: "info@namlog.com.na",
    phone: "+264 61 215 774",
    status: "PROSPECT",
    vehicles: 0,
    city: "Walvis Bay",
    contractStart: null,
    contractEnd: null,
  },
  {
    id: "6",
    name: "Meat Corp Namibia",
    company: "MeatCo",
    email: "logistics@meatco.com.na",
    phone: "+264 61 321 200",
    status: "ACTIVE",
    vehicles: 28,
    city: "Windhoek",
    contractStart: "2025-04-01",
    contractEnd: "2026-04-01",
  },
  {
    id: "7",
    name: "Bank Windhoek",
    company: "Capricorn Group",
    email: "fleet@bankwindhoek.com.na",
    phone: "+264 61 299 1234",
    status: "ACTIVE",
    vehicles: 12,
    city: "Windhoek",
    contractStart: "2025-07-01",
    contractEnd: "2026-07-01",
  },
  {
    id: "8",
    name: "Namdeb Diamond Corp",
    company: "Namdeb",
    email: "fleet@namdeb.com",
    phone: "+264 63 233 300",
    status: "INACTIVE",
    vehicles: 8,
    city: "Oranjemund",
    contractStart: "2024-06-01",
    contractEnd: "2025-06-01",
  },
  {
    id: "9",
    name: "FNB Namibia",
    company: "FirstRand",
    email: "ops@fnbnamibia.com.na",
    phone: "+264 61 299 2222",
    status: "PROSPECT",
    vehicles: 0,
    city: "Windhoek",
    contractStart: null,
    contractEnd: null,
  },
];

const statusFilters = ["All", "Prospect", "Active", "Inactive", "Churned"] as const;

export default function CustomersPage() {
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewModal, setShowNewModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    country: "",
    notes: "",
  });

  const filteredCustomers = useMemo(() => {
    return mockCustomers.filter((customer) => {
      const matchesStatus =
        statusFilter === "All" ||
        customer.status === statusFilter.toUpperCase();

      const query = searchQuery.toLowerCase();
      const matchesSearch =
        query === "" ||
        customer.name.toLowerCase().includes(query) ||
        customer.company.toLowerCase().includes(query) ||
        customer.email.toLowerCase().includes(query) ||
        customer.city.toLowerCase().includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [statusFilter, searchQuery]);

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowNewModal(false);
    setFormData({
      name: "",
      company: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      country: "",
      notes: "",
    });
  };

  const stats = [
    {
      label: "Total Customers",
      value: "156",
      icon: Users,
      color: "text-blue-600 bg-blue-50",
    },
    {
      label: "Active Contracts",
      value: "128",
      icon: FileText,
      color: "text-green-600 bg-green-50",
    },
    {
      label: "Vehicles Tracked",
      value: "342",
      icon: Car,
      color: "text-purple-600 bg-purple-50",
    },
    {
      label: "Monthly Recurring",
      value: "$28,400",
      icon: DollarSign,
      color: "text-emerald-600 bg-emerald-50",
    },
  ];

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
          onClick={() => setShowNewModal(true)}
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
                  {stat.value}
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

      {/* Customer Cards Grid */}
      {filteredCustomers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white py-16 shadow-sm">
          <Users className="mb-3 h-12 w-12 text-gray-300" />
          <p className="text-lg font-medium text-gray-500">
            No customers found
          </p>
          <p className="mt-1 text-sm text-gray-400">
            Try adjusting your filters or search query
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
                    <span className="truncate">{customer.company}</span>
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
                  <span className="truncate">{customer.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="h-4 w-4 flex-shrink-0 text-gray-400" />
                  <span>{customer.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="h-4 w-4 flex-shrink-0 text-gray-400" />
                  <span>{customer.city}</span>
                </div>
              </div>

              {/* Vehicles & Contract */}
              <div className="mb-4 flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2.5">
                <div className="flex items-center gap-2 text-sm">
                  <Car className="h-4 w-4 text-gray-500" />
                  <span className="font-medium text-gray-700">
                    {customer.vehicles}
                  </span>
                  <span className="text-gray-500">vehicles</span>
                </div>
                {customer.contractStart && customer.contractEnd ? (
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>
                      {formatDate(customer.contractStart)} &ndash;{" "}
                      {formatDate(customer.contractEnd)}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs italic text-gray-400">
                    No contract
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button onClick={() => toast.info(`Viewing ${customer.name}`)} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">
                  <Users className="h-4 w-4" />
                  View Details
                </button>
                <button onClick={() => toast.info(`New job card for ${customer.name} — coming soon`)} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700">
                  <ClipboardList className="h-4 w-4" />
                  Add Job Card
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Customer Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">
                New Customer
              </h2>
              <button
                onClick={() => setShowNewModal(false)}
                className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit}>
              <div className="max-h-[65vh] space-y-4 overflow-y-auto px-6 py-4">
                {/* Name */}
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

                {/* Company */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Company
                  </label>
                  <input
                    type="text"
                    name="company"
                    value={formData.company}
                    onChange={handleFormChange}
                    placeholder="Company or group name"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Email & Phone Row */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      value={formData.email}
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
                      value={formData.phone}
                      onChange={handleFormChange}
                      placeholder="+264 61 000 0000"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Address */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Address
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleFormChange}
                    placeholder="Street address"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* City & Country Row */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      City
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
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
                      value={formData.country}
                      onChange={handleFormChange}
                      placeholder="Country"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Notes
                  </label>
                  <textarea
                    name="notes"
                    rows={3}
                    value={formData.notes}
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
                  onClick={() => setShowNewModal(false)}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Create Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
