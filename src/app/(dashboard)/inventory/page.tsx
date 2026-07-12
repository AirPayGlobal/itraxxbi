"use client";

import { useState, useMemo } from "react";
import {
  Package,
  Search,
  Plus,
  Pencil,
  Trash2,
  UserCheck,
  X,
  ChevronDown,
  AlertTriangle,
  Box,
  CheckCircle2,
  Cpu,
  Wrench,
  Car,
  Monitor,
  MapPin,
  Hash,
  Loader2,
} from "lucide-react";
import { cn, getStatusColor, formatCurrency } from "@/lib/utils";
import {
  useAssets,
  useCreateAsset,
  useUpdateAsset,
  useDeleteAsset,
  type Asset,
  type AssetInput,
} from "@/lib/hooks/use-assets";
import type { AssetCategory, AssetStatus } from "@/lib/supabase/database.types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORY_OPTIONS = [
  "ALL",
  "TRACKING_DEVICE",
  "VEHICLE",
  "TOOL",
  "SPARE_PART",
  "OFFICE_EQUIPMENT",
  "IT_EQUIPMENT",
] as const;

const STATUS_OPTIONS = [
  "All",
  "AVAILABLE",
  "ASSIGNED",
  "IN_USE",
  "MAINTENANCE",
  "RETIRED",
  "LOST",
] as const;

const CATEGORY_FORM_OPTIONS: AssetCategory[] = [
  "TRACKING_DEVICE",
  "VEHICLE",
  "TOOL",
  "SPARE_PART",
  "OFFICE_EQUIPMENT",
  "IT_EQUIPMENT",
  "OTHER",
];

const STATUS_FORM_OPTIONS: AssetStatus[] = [
  "AVAILABLE",
  "ASSIGNED",
  "IN_USE",
  "MAINTENANCE",
  "RETIRED",
  "LOST",
];

type FormState = {
  name: string;
  asset_number: string;
  serial_number: string;
  category: AssetCategory;
  status: AssetStatus;
  quantity: string;
  min_stock_level: string;
  purchase_price: string;
  location: string;
  notes: string;
};

const emptyForm: FormState = {
  name: "",
  asset_number: "",
  serial_number: "",
  category: "TRACKING_DEVICE",
  status: "AVAILABLE",
  quantity: "",
  min_stock_level: "",
  purchase_price: "",
  location: "",
  notes: "",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatLabel(value: string): string {
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getCategoryIcon(category: string) {
  const icons: Record<string, React.ReactNode> = {
    TRACKING_DEVICE: <Cpu className="h-3.5 w-3.5" />,
    VEHICLE: <Car className="h-3.5 w-3.5" />,
    TOOL: <Wrench className="h-3.5 w-3.5" />,
    SPARE_PART: <Package className="h-3.5 w-3.5" />,
    OFFICE_EQUIPMENT: <Box className="h-3.5 w-3.5" />,
    IT_EQUIPMENT: <Monitor className="h-3.5 w-3.5" />,
  };
  return icons[category] || <Package className="h-3.5 w-3.5" />;
}

function getCategoryBadgeColor(category: string): string {
  const map: Record<string, string> = {
    TRACKING_DEVICE: "bg-indigo-100 text-indigo-800",
    VEHICLE: "bg-cyan-100 text-cyan-800",
    TOOL: "bg-amber-100 text-amber-800",
    SPARE_PART: "bg-orange-100 text-orange-800",
    OFFICE_EQUIPMENT: "bg-slate-100 text-slate-700",
    IT_EQUIPMENT: "bg-purple-100 text-purple-800",
  };
  return map[category] || "bg-gray-100 text-gray-800";
}

function isLowStock(asset: Asset): boolean {
  return (
    asset.min_stock_level != null &&
    asset.quantity <= asset.min_stock_level &&
    asset.status !== "RETIRED" &&
    asset.status !== "LOST"
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function InventoryPage() {
  const { data: assets = [], isLoading, isError, error } = useAssets();
  const createAsset = useCreateAsset();
  const updateAsset = useUpdateAsset();
  const deleteAsset = useDeleteAsset();

  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormState>(emptyForm);

  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      if (categoryFilter !== "ALL" && asset.category !== categoryFilter)
        return false;
      if (statusFilter !== "All" && asset.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const searchable = [
          asset.name,
          asset.asset_number,
          asset.serial_number ?? "",
          asset.location ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!searchable.includes(q)) return false;
      }
      return true;
    });
  }, [assets, categoryFilter, statusFilter, searchQuery]);

  const lowStockAssets = useMemo(() => assets.filter(isLowStock), [assets]);

  const totalAssets = assets.length;
  const inStockCount = assets.filter((a) => a.status === "AVAILABLE").length;
  const assignedInUseCount = assets.filter(
    (a) => a.status === "ASSIGNED" || a.status === "IN_USE"
  ).length;
  const lowStockCount = lowStockAssets.length;

  function handleFormChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function openCreate() {
    setEditingId(null);
    setFormData(emptyForm);
    setShowModal(true);
  }

  function openEdit(asset: Asset) {
    setEditingId(asset.id);
    setFormData({
      name: asset.name,
      asset_number: asset.asset_number,
      serial_number: asset.serial_number ?? "",
      category: asset.category,
      status: asset.status,
      quantity: String(asset.quantity),
      min_stock_level:
        asset.min_stock_level != null ? String(asset.min_stock_level) : "",
      purchase_price:
        asset.purchase_price != null ? String(asset.purchase_price) : "",
      location: asset.location ?? "",
      notes: asset.notes ?? "",
    });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const price = formData.purchase_price
      ? Number(formData.purchase_price)
      : null;
    const payload: AssetInput = {
      name: formData.name,
      asset_number: formData.asset_number,
      serial_number: formData.serial_number || null,
      category: formData.category,
      status: formData.status,
      quantity: Number(formData.quantity) || 0,
      min_stock_level: formData.min_stock_level
        ? Number(formData.min_stock_level)
        : null,
      purchase_price: price,
      location: formData.location || null,
      notes: formData.notes || null,
    };
    try {
      if (editingId) {
        await updateAsset.mutateAsync({ id: editingId, ...payload });
      } else {
        await createAsset.mutateAsync({ ...payload, current_value: price });
      }
      setShowModal(false);
      setFormData(emptyForm);
      setEditingId(null);
    } catch {
      /* toast handled in hook */
    }
  }

  async function handleDelete(asset: Asset) {
    if (!window.confirm(`Delete ${asset.name}? This cannot be undone.`)) return;
    try {
      await deleteAsset.mutateAsync(asset.id);
    } catch {
      /* handled in hook */
    }
  }

  const isSaving = createAsset.isPending || updateAsset.isPending;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Inventory &amp; Asset Tracking
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Monitor stock levels, manage assets, and track assignments across
              your organisation.
            </p>
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <Plus className="h-4 w-4" />
            Add Asset
          </button>
        </div>

        {/* KPI Stats */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "Total Assets",
              value: totalAssets,
              icon: Package,
              tint: "bg-blue-50 text-blue-600",
              valueClass: "text-gray-900",
            },
            {
              label: "In Stock",
              value: inStockCount,
              icon: CheckCircle2,
              tint: "bg-green-50 text-green-600",
              valueClass: "text-gray-900",
            },
            {
              label: "Assigned / In Use",
              value: assignedInUseCount,
              icon: UserCheck,
              tint: "bg-purple-50 text-purple-600",
              valueClass: "text-gray-900",
            },
            {
              label: "Low Stock Alerts",
              value: lowStockCount,
              icon: AlertTriangle,
              tint: "bg-red-50 text-red-600",
              valueClass: "text-red-600",
            },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-lg",
                    kpi.tint
                  )}
                >
                  <kpi.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    {kpi.label}
                  </p>
                  <p className={cn("text-2xl font-bold", kpi.valueClass)}>
                    {isLoading ? "—" : kpi.value}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex flex-wrap gap-2">
            {CATEGORY_OPTIONS.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  categoryFilter === cat
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                {cat === "ALL" ? "All" : formatLabel(cat)}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, asset number, serial number, location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-700 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="relative min-w-[160px]">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2 pr-9 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s === "All" ? "All Statuses" : formatLabel(s)}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Asset Table */}
        <div className="mb-8 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="whitespace-nowrap px-4 py-3 font-semibold text-gray-600">
                    Asset
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold text-gray-600">
                    Category
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold text-gray-600">
                    Status
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-center font-semibold text-gray-600">
                    Qty
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-center font-semibold text-gray-600">
                    Min Stock
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold text-gray-600">
                    Location
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-right font-semibold text-gray-600">
                    Purchase Price
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-right font-semibold text-gray-600">
                    Current Value
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-center font-semibold text-gray-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                      <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-blue-500" />
                      <p className="text-sm">Loading assets…</p>
                    </td>
                  </tr>
                ) : isError ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-red-500">
                      <p className="text-sm font-medium">Failed to load assets</p>
                      <p className="mt-1 text-xs">
                        {(error as Error)?.message ?? "Please try again."}
                      </p>
                    </td>
                  </tr>
                ) : filteredAssets.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                      <Package className="mx-auto mb-3 h-8 w-8 text-gray-300" />
                      <p className="text-sm font-medium">No assets found</p>
                      <p className="mt-1 text-xs">
                        {assets.length === 0
                          ? "Add your first asset to get started."
                          : "Try adjusting your filters or search query."}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredAssets.map((asset) => {
                    const low = isLowStock(asset);
                    return (
                      <tr
                        key={asset.id}
                        className={cn(
                          "transition-colors hover:bg-gray-50/70",
                          low && "bg-red-50/40"
                        )}
                      >
                        <td className="px-4 py-3">
                          <div className="min-w-[200px]">
                            <p className="font-medium text-gray-900">
                              {asset.name}
                            </p>
                            <div className="mt-0.5 flex items-center gap-3 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Hash className="h-3 w-3" />
                                {asset.asset_number}
                              </span>
                              {asset.serial_number && (
                                <span className="truncate">
                                  SN: {asset.serial_number}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="whitespace-nowrap px-4 py-3">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
                              getCategoryBadgeColor(asset.category)
                            )}
                          >
                            {getCategoryIcon(asset.category)}
                            {formatLabel(asset.category)}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-4 py-3">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                              getStatusColor(asset.status)
                            )}
                          >
                            {formatLabel(asset.status)}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-center">
                          <span
                            className={cn(
                              "text-sm font-semibold",
                              low ? "text-red-600" : "text-gray-900"
                            )}
                          >
                            {asset.quantity}
                          </span>
                          {low && (
                            <AlertTriangle className="ml-1 inline h-3.5 w-3.5 text-red-500" />
                          )}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-center text-sm text-gray-600">
                          {asset.min_stock_level ?? "—"}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3">
                          <div className="flex items-center gap-1.5 text-sm text-gray-600">
                            <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                            <span className="max-w-[160px] truncate">
                              {asset.location ?? "—"}
                            </span>
                          </div>
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-700">
                          {asset.purchase_price != null
                            ? formatCurrency(asset.purchase_price)
                            : "—"}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-gray-900">
                          {asset.current_value != null
                            ? formatCurrency(asset.current_value)
                            : "—"}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              title="Edit"
                              onClick={() => openEdit(asset)}
                              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-amber-600"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              title="Assignments coming soon"
                              disabled
                              className="cursor-not-allowed rounded-lg p-1.5 text-gray-300"
                            >
                              <UserCheck className="h-4 w-4" />
                            </button>
                            <button
                              title="Delete"
                              onClick={() => handleDelete(asset)}
                              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-gray-200 bg-gray-50 px-4 py-3">
            <p className="text-xs text-gray-500">
              Showing{" "}
              <span className="font-medium text-gray-700">
                {filteredAssets.length}
              </span>{" "}
              of{" "}
              <span className="font-medium text-gray-700">{assets.length}</span>{" "}
              assets
            </p>
          </div>
        </div>

        {/* Low Stock Alerts */}
        {lowStockAssets.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-red-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-red-200 bg-red-50 px-6 py-4">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <h3 className="text-lg font-semibold text-red-900">
                Low Stock Alerts
              </h3>
              <span className="ml-auto rounded-full bg-red-600 px-2.5 py-0.5 text-xs font-bold text-white">
                {lowStockAssets.length}
              </span>
            </div>
            <div className="divide-y divide-red-100">
              {lowStockAssets.map((asset) => (
                <div
                  key={asset.id}
                  className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                        getCategoryBadgeColor(asset.category)
                      )}
                    >
                      {getCategoryIcon(asset.category)}
                      {formatLabel(asset.category)}
                    </span>
                    <p className="mt-1 font-medium text-gray-900">
                      {asset.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {asset.asset_number}
                      {asset.location ? ` · ${asset.location}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-xs font-medium text-gray-500">
                        Current Qty
                      </p>
                      <p className="text-lg font-bold text-red-600">
                        {asset.quantity}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-medium text-gray-500">
                        Min Required
                      </p>
                      <p className="text-lg font-bold text-gray-700">
                        {asset.min_stock_level}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-medium text-gray-500">
                        Shortfall
                      </p>
                      <p className="text-lg font-bold text-red-600">
                        -{(asset.min_stock_level ?? 0) - asset.quantity}
                      </p>
                    </div>
                    <button
                      title="Reordering coming soon"
                      disabled
                      className="cursor-not-allowed rounded-lg bg-red-300 px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      Reorder
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Asset Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />
          <div className="relative mx-4 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {editingId ? "Edit Asset" : "Add New Asset"}
                </h2>
                <p className="text-sm text-gray-500">
                  Enter the details for this inventory asset.
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Asset Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleFormChange}
                    placeholder="e.g. Teltonika FMB920 GPS Tracker"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Asset Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="asset_number"
                    required
                    value={formData.asset_number}
                    onChange={handleFormChange}
                    placeholder="e.g. AST-0016"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Serial Number
                  </label>
                  <input
                    type="text"
                    name="serial_number"
                    value={formData.serial_number}
                    onChange={handleFormChange}
                    placeholder="e.g. TEL-FMB920-99001"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      name="category"
                      required
                      value={formData.category}
                      onChange={handleFormChange}
                      className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2 pr-9 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {CATEGORY_FORM_OPTIONS.map((c) => (
                        <option key={c} value={c}>
                          {formatLabel(c)}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Status <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      name="status"
                      required
                      value={formData.status}
                      onChange={handleFormChange}
                      className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2 pr-9 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {STATUS_FORM_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {formatLabel(s)}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Quantity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="quantity"
                    required
                    min="0"
                    value={formData.quantity}
                    onChange={handleFormChange}
                    placeholder="e.g. 10"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Min Stock Level
                  </label>
                  <input
                    type="number"
                    name="min_stock_level"
                    min="0"
                    value={formData.min_stock_level}
                    onChange={handleFormChange}
                    placeholder="e.g. 5"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Purchase Price (N$)
                  </label>
                  <input
                    type="number"
                    name="purchase_price"
                    min="0"
                    step="0.01"
                    value={formData.purchase_price}
                    onChange={handleFormChange}
                    placeholder="e.g. 89.99"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Location
                  </label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleFormChange}
                    placeholder="e.g. Warehouse A - Shelf 3"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Notes
                  </label>
                  <textarea
                    name="notes"
                    rows={3}
                    value={formData.notes}
                    onChange={handleFormChange}
                    placeholder="Additional notes about this asset..."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 border-t border-gray-200 pt-5">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingId ? "Save Changes" : "Add Asset"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
