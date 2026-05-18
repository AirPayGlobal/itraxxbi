"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  Package,
  Search,
  Plus,
  Eye,
  Pencil,
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
} from "lucide-react";
import { cn, getStatusColor, formatDate, formatCurrency } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Asset {
  id: string;
  name: string;
  assetNumber: string;
  serialNumber: string;
  category: string;
  status: string;
  quantity: number;
  minStockLevel: number;
  location: string;
  purchasePrice: number;
  currentValue: number;
  purchaseDate: string;
  assignedTo: string | null;
  notes: string;
}

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const mockAssets: Asset[] = [
  {
    id: "1",
    name: "Teltonika FMB920 GPS Tracker",
    assetNumber: "AST-0001",
    serialNumber: "TEL-FMB920-48271",
    category: "TRACKING_DEVICE",
    status: "AVAILABLE",
    quantity: 24,
    minStockLevel: 10,
    location: "Warehouse A - Shelf 3",
    purchasePrice: 89.99,
    currentValue: 75.0,
    purchaseDate: "2025-06-15",
    assignedTo: null,
    notes: "Bulk order from Teltonika. Latest firmware v3.28.",
  },
  {
    id: "2",
    name: "Teltonika FMC130 Advanced Tracker",
    assetNumber: "AST-0002",
    serialNumber: "TEL-FMC130-93184",
    category: "TRACKING_DEVICE",
    status: "AVAILABLE",
    quantity: 8,
    minStockLevel: 10,
    location: "Warehouse A - Shelf 3",
    purchasePrice: 149.99,
    currentValue: 130.0,
    purchaseDate: "2025-08-20",
    assignedTo: null,
    notes: "Low stock - reorder needed.",
  },
  {
    id: "3",
    name: "Toyota Hilux 2.4 GD-6 (N 4521 WB)",
    assetNumber: "AST-0003",
    serialNumber: "AHTFR22G109876543",
    category: "VEHICLE",
    status: "IN_USE",
    quantity: 1,
    minStockLevel: 1,
    location: "Field - Windhoek North",
    purchasePrice: 42500.0,
    currentValue: 35200.0,
    purchaseDate: "2024-03-10",
    assignedTo: "John Mutua",
    notes: "Service due at 60,000 km. Currently at 52,340 km.",
  },
  {
    id: "4",
    name: "Ford Ranger 2.0 BiT XLT (N 7832 WB)",
    assetNumber: "AST-0004",
    serialNumber: "WF0XXXGCDXLY12345",
    category: "VEHICLE",
    status: "MAINTENANCE",
    quantity: 1,
    minStockLevel: 1,
    location: "Workshop Bay 2",
    purchasePrice: 48900.0,
    currentValue: 39500.0,
    purchaseDate: "2024-01-22",
    assignedTo: "James Shilongo",
    notes: "Brake pad replacement and wheel alignment in progress.",
  },
  {
    id: "5",
    name: "Fluke 87V Industrial Multimeter",
    assetNumber: "AST-0005",
    serialNumber: "FLK-87V-29438",
    category: "TOOL",
    status: "ASSIGNED",
    quantity: 3,
    minStockLevel: 2,
    location: "Tool Room",
    purchasePrice: 450.0,
    currentValue: 350.0,
    purchaseDate: "2025-02-10",
    assignedTo: "John Mutua",
    notes: "Calibration due March 2026.",
  },
  {
    id: "6",
    name: "Wiring Harness Kit - Universal",
    assetNumber: "AST-0006",
    serialNumber: "WHK-UNI-88412",
    category: "SPARE_PART",
    status: "AVAILABLE",
    quantity: 5,
    minStockLevel: 15,
    location: "Warehouse B - Bin 12",
    purchasePrice: 18.5,
    currentValue: 18.5,
    purchaseDate: "2025-11-05",
    assignedTo: null,
    notes: "Critical spare for tracker installations. Reorder urgently.",
  },
  {
    id: "7",
    name: "SIM Card - MTC Business (Data)",
    assetNumber: "AST-0007",
    serialNumber: "SIM-MTC-BATCH-2026A",
    category: "SPARE_PART",
    status: "AVAILABLE",
    quantity: 42,
    minStockLevel: 20,
    location: "Office Safe",
    purchasePrice: 5.0,
    currentValue: 5.0,
    purchaseDate: "2026-01-10",
    assignedTo: null,
    notes: "MTC bulk data SIMs for fleet trackers.",
  },
  {
    id: "8",
    name: "Dell Latitude 5540 Laptop",
    assetNumber: "AST-0008",
    serialNumber: "DELL-LAT5540-CN0X9M2",
    category: "IT_EQUIPMENT",
    status: "ASSIGNED",
    quantity: 1,
    minStockLevel: 1,
    location: "Office - Desk 4",
    purchasePrice: 1350.0,
    currentValue: 1050.0,
    purchaseDate: "2025-04-18",
    assignedTo: "Sarah Peters",
    notes: "Windows 11 Pro, 16GB RAM, 512GB SSD.",
  },
  {
    id: "9",
    name: "HP LaserJet Pro MFP M428fdn",
    assetNumber: "AST-0009",
    serialNumber: "HP-M428-PHBKR09221",
    category: "OFFICE_EQUIPMENT",
    status: "IN_USE",
    quantity: 1,
    minStockLevel: 1,
    location: "Office - Print Room",
    purchasePrice: 520.0,
    currentValue: 380.0,
    purchaseDate: "2025-01-08",
    assignedTo: null,
    notes: "Shared printer. Toner replaced Jan 2026.",
  },
  {
    id: "10",
    name: "OBD-II Diagnostic Scanner",
    assetNumber: "AST-0010",
    serialNumber: "OBD-SCAN-PRO-7721",
    category: "TOOL",
    status: "AVAILABLE",
    quantity: 2,
    minStockLevel: 2,
    location: "Tool Room",
    purchasePrice: 320.0,
    currentValue: 260.0,
    purchaseDate: "2025-05-22",
    assignedTo: null,
    notes: "Supports CAN, K-Line, J1850 protocols.",
  },
  {
    id: "11",
    name: "Antenna Extension Cable (3m)",
    assetNumber: "AST-0011",
    serialNumber: "AEC-3M-BATCH-55",
    category: "SPARE_PART",
    status: "AVAILABLE",
    quantity: 3,
    minStockLevel: 10,
    location: "Warehouse B - Bin 8",
    purchasePrice: 12.0,
    currentValue: 12.0,
    purchaseDate: "2025-09-14",
    assignedTo: null,
    notes: "SMA male to SMA female. Needed for concealed installations.",
  },
  {
    id: "12",
    name: "Teltonika FMB140 Tracker (Retired)",
    assetNumber: "AST-0012",
    serialNumber: "TEL-FMB140-12093",
    category: "TRACKING_DEVICE",
    status: "RETIRED",
    quantity: 6,
    minStockLevel: 0,
    location: "Warehouse A - Returns Shelf",
    purchasePrice: 65.0,
    currentValue: 0.0,
    purchaseDate: "2023-04-01",
    assignedTo: null,
    notes: "End of life. Replaced by FMB920. Pending disposal.",
  },
  {
    id: "13",
    name: "Relay Module - 12V Automotive",
    assetNumber: "AST-0013",
    serialNumber: "RLY-12V-BATCH-203",
    category: "SPARE_PART",
    status: "AVAILABLE",
    quantity: 18,
    minStockLevel: 10,
    location: "Warehouse B - Bin 5",
    purchasePrice: 8.5,
    currentValue: 8.5,
    purchaseDate: "2025-12-02",
    assignedTo: null,
    notes: "Used for remote engine cut-off feature.",
  },
  {
    id: "14",
    name: "Cisco Catalyst 1000 Switch",
    assetNumber: "AST-0014",
    serialNumber: "CSC-C1000-FCW2341L0N8",
    category: "IT_EQUIPMENT",
    status: "IN_USE",
    quantity: 1,
    minStockLevel: 1,
    location: "Server Room",
    purchasePrice: 890.0,
    currentValue: 670.0,
    purchaseDate: "2025-03-15",
    assignedTo: null,
    notes: "24-port managed switch. Core network infrastructure.",
  },
  {
    id: "15",
    name: "GPS Signal Booster",
    assetNumber: "AST-0015",
    serialNumber: "GSB-PRO-44821",
    category: "TRACKING_DEVICE",
    status: "LOST",
    quantity: 0,
    minStockLevel: 2,
    location: "Unknown",
    purchasePrice: 75.0,
    currentValue: 0.0,
    purchaseDate: "2025-07-20",
    assignedTo: "Peter Angula",
    notes: "Reported lost during field installation on 2026-01-18. Insurance claim pending.",
  },
];

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

const CATEGORY_FORM_OPTIONS = [
  "TRACKING_DEVICE",
  "VEHICLE",
  "TOOL",
  "SPARE_PART",
  "OFFICE_EQUIPMENT",
  "IT_EQUIPMENT",
] as const;

const STATUS_FORM_OPTIONS = [
  "AVAILABLE",
  "ASSIGNED",
  "IN_USE",
  "MAINTENANCE",
  "RETIRED",
  "LOST",
] as const;

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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function InventoryPage() {
  // Asset data
  const [assets, setAssets] = useState<Asset[]>(mockAssets);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    assetNumber: "",
    serialNumber: "",
    category: "TRACKING_DEVICE",
    status: "AVAILABLE",
    quantity: "",
    minStockLevel: "",
    purchasePrice: "",
    location: "",
    notes: "",
  });

  // ---- Computed values ----

  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      if (categoryFilter !== "ALL" && asset.category !== categoryFilter)
        return false;
      if (statusFilter !== "All" && asset.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const searchable = [
          asset.name,
          asset.assetNumber,
          asset.serialNumber,
          asset.location,
          asset.assignedTo || "",
        ]
          .join(" ")
          .toLowerCase();
        if (!searchable.includes(q)) return false;
      }
      return true;
    });
  }, [assets, categoryFilter, statusFilter, searchQuery]);

  const lowStockAssets = useMemo(() => {
    return assets.filter(
      (asset) =>
        asset.quantity <= asset.minStockLevel &&
        asset.status !== "RETIRED" &&
        asset.status !== "LOST"
    );
  }, [assets]);

  const totalAssets = assets.length;
  const inStockCount = assets.filter(
    (a) => a.status === "AVAILABLE"
  ).length;
  const assignedInUseCount = assets.filter(
    (a) => a.status === "ASSIGNED" || a.status === "IN_USE"
  ).length;
  const lowStockCount = lowStockAssets.length;

  // ---- Handlers ----

  function handleFormChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const newAsset: Asset = {
      id: String(Date.now()),
      name: formData.name,
      assetNumber:
        formData.assetNumber ||
        `AST-${String(assets.length + 1).padStart(4, "0")}`,
      serialNumber: formData.serialNumber,
      category: formData.category,
      status: formData.status,
      quantity: Number(formData.quantity) || 0,
      minStockLevel: Number(formData.minStockLevel) || 0,
      location: formData.location,
      purchasePrice: Number(formData.purchasePrice) || 0,
      currentValue: Number(formData.purchasePrice) || 0,
      purchaseDate: new Date().toISOString().split("T")[0],
      assignedTo: null,
      notes: formData.notes,
    };

    setAssets((prev) => [...prev, newAsset]);
    toast.success("Asset added successfully");

    setShowModal(false);
    setFormData({
      name: "",
      assetNumber: "",
      serialNumber: "",
      category: "TRACKING_DEVICE",
      status: "AVAILABLE",
      quantity: "",
      minStockLevel: "",
      purchasePrice: "",
      location: "",
      notes: "",
    });
  }

  // ---- Render ----

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* ---- Page Header ---- */}
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
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <Plus className="h-4 w-4" />
            Add Asset
          </button>
        </div>

        {/* ---- KPI Stats Row ---- */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Total Assets */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Total Assets
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {totalAssets}
                </p>
              </div>
            </div>
          </div>

          {/* In Stock */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">In Stock</p>
                <p className="text-2xl font-bold text-gray-900">
                  {inStockCount}
                </p>
              </div>
            </div>
          </div>

          {/* Assigned / In Use */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50">
                <UserCheck className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Assigned / In Use
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {assignedInUseCount}
                </p>
              </div>
            </div>
          </div>

          {/* Low Stock Alert */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Low Stock Alerts
                </p>
                <p className="text-2xl font-bold text-red-600">
                  {lowStockCount}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ---- Category Filter Tabs + Search / Status Filter ---- */}
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          {/* Category Tabs */}
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

          {/* Search + Status */}
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

        {/* ---- Asset Table ---- */}
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
                {filteredAssets.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-12 text-center text-gray-400"
                    >
                      <Package className="mx-auto mb-3 h-8 w-8 text-gray-300" />
                      <p className="text-sm font-medium">No assets found</p>
                      <p className="mt-1 text-xs">
                        Try adjusting your filters or search query.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredAssets.map((asset) => {
                    const isLowStock =
                      asset.quantity <= asset.minStockLevel &&
                      asset.status !== "RETIRED" &&
                      asset.status !== "LOST";

                    return (
                      <tr
                        key={asset.id}
                        className={cn(
                          "transition-colors hover:bg-gray-50/70",
                          isLowStock && "bg-red-50/40"
                        )}
                      >
                        {/* Asset name + numbers */}
                        <td className="px-4 py-3">
                          <div className="min-w-[200px]">
                            <p className="font-medium text-gray-900">
                              {asset.name}
                            </p>
                            <div className="mt-0.5 flex items-center gap-3 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Hash className="h-3 w-3" />
                                {asset.assetNumber}
                              </span>
                              <span className="truncate">
                                SN: {asset.serialNumber}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Category badge */}
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

                        {/* Status badge */}
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

                        {/* Quantity */}
                        <td className="whitespace-nowrap px-4 py-3 text-center">
                          <span
                            className={cn(
                              "text-sm font-semibold",
                              isLowStock ? "text-red-600" : "text-gray-900"
                            )}
                          >
                            {asset.quantity}
                          </span>
                          {isLowStock && (
                            <AlertTriangle className="ml-1 inline h-3.5 w-3.5 text-red-500" />
                          )}
                        </td>

                        {/* Min Stock Level */}
                        <td className="whitespace-nowrap px-4 py-3 text-center text-sm text-gray-600">
                          {asset.minStockLevel}
                        </td>

                        {/* Location */}
                        <td className="whitespace-nowrap px-4 py-3">
                          <div className="flex items-center gap-1.5 text-sm text-gray-600">
                            <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                            <span className="max-w-[160px] truncate">
                              {asset.location}
                            </span>
                          </div>
                        </td>

                        {/* Purchase Price */}
                        <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-700">
                          {formatCurrency(asset.purchasePrice)}
                        </td>

                        {/* Current Value */}
                        <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-gray-900">
                          {formatCurrency(asset.currentValue)}
                        </td>

                        {/* Actions */}
                        <td className="whitespace-nowrap px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              title="View"
                              onClick={() => toast.info(`Viewing ${asset.name}`)}
                              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-blue-600"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              title="Edit"
                              onClick={() => toast.info(`Editing ${asset.name} — coming soon`)}
                              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-amber-600"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              title="Assign"
                              onClick={() => toast.info(`Assigning ${asset.name} — coming soon`)}
                              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-purple-600"
                            >
                              <UserCheck className="h-4 w-4" />
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

          {/* Table footer */}
          <div className="border-t border-gray-200 bg-gray-50 px-4 py-3">
            <p className="text-xs text-gray-500">
              Showing{" "}
              <span className="font-medium text-gray-700">
                {filteredAssets.length}
              </span>{" "}
              of{" "}
              <span className="font-medium text-gray-700">
                {assets.length}
              </span>{" "}
              assets
            </p>
          </div>
        </div>

        {/* ---- Low Stock Alerts Section ---- */}
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
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                          getCategoryBadgeColor(asset.category)
                        )}
                      >
                        {getCategoryIcon(asset.category)}
                        {formatLabel(asset.category)}
                      </span>
                    </div>
                    <p className="mt-1 font-medium text-gray-900">
                      {asset.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {asset.assetNumber} &middot; {asset.location}
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
                        {asset.minStockLevel}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-medium text-gray-500">
                        Shortfall
                      </p>
                      <p className="text-lg font-bold text-red-600">
                        -{asset.minStockLevel - asset.quantity}
                      </p>
                    </div>
                    <button onClick={() => toast.success(`Reorder request submitted for ${asset.name}`)} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700">
                      Reorder
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ---- Add Asset Modal ---- */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />

          {/* Modal content */}
          <div className="relative mx-4 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Add New Asset
                </h2>
                <p className="text-sm text-gray-500">
                  Enter the details for the new inventory asset.
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="px-6 py-5">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {/* Name - full width */}
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

                {/* Asset Number */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Asset Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="assetNumber"
                    required
                    value={formData.assetNumber}
                    onChange={handleFormChange}
                    placeholder="e.g. AST-0016"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Serial Number */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Serial Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="serialNumber"
                    required
                    value={formData.serialNumber}
                    onChange={handleFormChange}
                    placeholder="e.g. TEL-FMB920-99001"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Category */}
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

                {/* Status */}
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

                {/* Quantity */}
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

                {/* Min Stock Level */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Min Stock Level <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="minStockLevel"
                    required
                    min="0"
                    value={formData.minStockLevel}
                    onChange={handleFormChange}
                    placeholder="e.g. 5"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Purchase Price */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Purchase Price ($)
                  </label>
                  <input
                    type="number"
                    name="purchasePrice"
                    min="0"
                    step="0.01"
                    value={formData.purchasePrice}
                    onChange={handleFormChange}
                    placeholder="e.g. 89.99"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Location */}
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

                {/* Notes - full width */}
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

              {/* Form Actions */}
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
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Add Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
