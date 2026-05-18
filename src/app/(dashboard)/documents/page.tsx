"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  FileText,
  FileCheck2,
  Award,
  AlertTriangle,
  Plus,
  Search,
  Eye,
  Download,
  Trash2,
  X,
  Upload,
  File,
  FileSpreadsheet,
  FileImage,
  Calendar,
  User,
  Shield,
  FolderOpen,
  ChevronDown,
  HardDrive,
} from "lucide-react";
import { cn, getStatusColor, formatDate } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DocumentCategory =
  | "ALL"
  | "CONTRACT"
  | "CERTIFICATE"
  | "REGISTRATION"
  | "COMPLIANCE"
  | "SOP"
  | "INVOICE"
  | "REPORT"
  | "GENERAL";

type AccessLevel = "PUBLIC" | "INTERNAL" | "RESTRICTED" | "CONFIDENTIAL";

type FileType = "PDF" | "DOC" | "DOCX" | "XLS" | "XLSX" | "PNG" | "JPG" | "CSV";

interface Document {
  id: string;
  name: string;
  description: string;
  category: Exclude<DocumentCategory, "ALL">;
  fileType: FileType;
  fileSize: string;
  uploadedBy: string;
  uploadDate: string;
  expiryDate: string | null;
  accessLevel: AccessLevel;
  customer: string | null;
}

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const mockDocuments: Document[] = [
  {
    id: "1",
    name: "Fleet Service Agreement - NBL 2026",
    description: "Annual fleet management and GPS tracking service agreement with Namibia Breweries Ltd",
    category: "CONTRACT",
    fileType: "PDF",
    fileSize: "2.4 MB",
    uploadedBy: "Lisa Amupolo",
    uploadDate: "2026-01-10",
    expiryDate: "2027-01-10",
    accessLevel: "CONFIDENTIAL",
    customer: "Namibia Breweries Ltd",
  },
  {
    id: "2",
    name: "ISO 9001 Quality Management Certificate",
    description: "Quality management system certification for fleet tracking operations",
    category: "CERTIFICATE",
    fileType: "PDF",
    fileSize: "1.1 MB",
    uploadedBy: "Sarah Peters",
    uploadDate: "2025-09-15",
    expiryDate: "2026-09-15",
    accessLevel: "PUBLIC",
    customer: null,
  },
  {
    id: "3",
    name: "Vehicle Registration - Toyota Hilux N 1234 WB",
    description: "Vehicle registration and roadworthy certificate for fleet vehicle",
    category: "REGISTRATION",
    fileType: "PDF",
    fileSize: "856 KB",
    uploadedBy: "John Mutua",
    uploadDate: "2025-11-20",
    expiryDate: "2026-11-20",
    accessLevel: "INTERNAL",
    customer: "Namibia Breweries Ltd",
  },
  {
    id: "4",
    name: "NRSC Compliance Audit Report Q4 2025",
    description: "National Road Safety Council compliance audit report for fleet operations",
    category: "COMPLIANCE",
    fileType: "DOCX",
    fileSize: "3.8 MB",
    uploadedBy: "Lisa Amupolo",
    uploadDate: "2026-01-05",
    expiryDate: null,
    accessLevel: "RESTRICTED",
    customer: null,
  },
  {
    id: "5",
    name: "GPS Tracker Installation Procedure v3.2",
    description: "Standard operating procedure for installing GPS tracking devices across all vehicle models",
    category: "SOP",
    fileType: "PDF",
    fileSize: "5.2 MB",
    uploadedBy: "James Shilongo",
    uploadDate: "2025-08-12",
    expiryDate: null,
    accessLevel: "INTERNAL",
    customer: null,
  },
  {
    id: "6",
    name: "TransNamib Invoice INV-2602-0042",
    description: "Monthly fleet tracking subscription and maintenance invoice for February 2026",
    category: "INVOICE",
    fileType: "PDF",
    fileSize: "420 KB",
    uploadedBy: "Sarah Peters",
    uploadDate: "2026-02-01",
    expiryDate: null,
    accessLevel: "CONFIDENTIAL",
    customer: "TransNamib Holdings",
  },
  {
    id: "7",
    name: "Fleet Utilization Report - Jan 2026",
    description: "Monthly fleet utilization, mileage, and idle time analysis report",
    category: "REPORT",
    fileType: "XLSX",
    fileSize: "1.8 MB",
    uploadedBy: "Lisa Amupolo",
    uploadDate: "2026-02-05",
    expiryDate: null,
    accessLevel: "INTERNAL",
    customer: null,
  },
  {
    id: "8",
    name: "O&L Group Service Contract Renewal",
    description: "Service contract renewal terms and conditions for Ohlthaver & List fleet management",
    category: "CONTRACT",
    fileType: "DOCX",
    fileSize: "1.5 MB",
    uploadedBy: "Sarah Peters",
    uploadDate: "2026-02-10",
    expiryDate: "2027-02-10",
    accessLevel: "CONFIDENTIAL",
    customer: "Ohlthaver & List",
  },
  {
    id: "9",
    name: "Fire Safety Compliance Certificate",
    description: "Annual fire safety and emergency preparedness certificate for workshop premises",
    category: "CERTIFICATE",
    fileType: "PDF",
    fileSize: "680 KB",
    uploadedBy: "John Mutua",
    uploadDate: "2025-06-01",
    expiryDate: "2026-03-01",
    accessLevel: "PUBLIC",
    customer: null,
  },
  {
    id: "10",
    name: "Vehicle Inspection Checklist Template",
    description: "Standardized pre- and post-installation vehicle inspection checklist",
    category: "SOP",
    fileType: "DOCX",
    fileSize: "340 KB",
    uploadedBy: "James Shilongo",
    uploadDate: "2025-10-18",
    expiryDate: null,
    accessLevel: "INTERNAL",
    customer: null,
  },
  {
    id: "11",
    name: "MeatCo Fleet Tracking Agreement",
    description: "GPS tracking and fleet monitoring service level agreement with Meat Corp Namibia",
    category: "CONTRACT",
    fileType: "PDF",
    fileSize: "2.1 MB",
    uploadedBy: "Sarah Peters",
    uploadDate: "2025-04-01",
    expiryDate: "2026-04-01",
    accessLevel: "CONFIDENTIAL",
    customer: "Meat Corp Namibia",
  },
  {
    id: "12",
    name: "Driver Safety Training Manual",
    description: "Comprehensive driver safety training material and assessment procedures",
    category: "GENERAL",
    fileType: "PDF",
    fileSize: "8.4 MB",
    uploadedBy: "Lisa Amupolo",
    uploadDate: "2025-07-22",
    expiryDate: null,
    accessLevel: "PUBLIC",
    customer: null,
  },
  {
    id: "13",
    name: "Vehicle Registration - Ford Ranger N 5678 WB",
    description: "Vehicle registration papers and licence disc for fleet Ford Ranger",
    category: "REGISTRATION",
    fileType: "PDF",
    fileSize: "920 KB",
    uploadedBy: "John Mutua",
    uploadDate: "2025-12-05",
    expiryDate: "2026-12-05",
    accessLevel: "INTERNAL",
    customer: "TransNamib Holdings",
  },
  {
    id: "14",
    name: "Environmental Compliance Policy",
    description: "Fleet environmental impact policy including emissions monitoring and fuel efficiency guidelines",
    category: "COMPLIANCE",
    fileType: "PDF",
    fileSize: "1.3 MB",
    uploadedBy: "Lisa Amupolo",
    uploadDate: "2025-05-10",
    expiryDate: null,
    accessLevel: "INTERNAL",
    customer: null,
  },
  {
    id: "15",
    name: "Fuel Consumption Report - Q4 2025",
    description: "Quarterly fuel consumption analysis with cost breakdown per vehicle and route",
    category: "REPORT",
    fileType: "XLS",
    fileSize: "2.6 MB",
    uploadedBy: "Sarah Peters",
    uploadDate: "2026-01-15",
    expiryDate: null,
    accessLevel: "RESTRICTED",
    customer: null,
  },
];

const CATEGORIES: { value: DocumentCategory; label: string }[] = [
  { value: "ALL", label: "All Documents" },
  { value: "CONTRACT", label: "Contracts" },
  { value: "CERTIFICATE", label: "Certificates" },
  { value: "REGISTRATION", label: "Registration" },
  { value: "COMPLIANCE", label: "Compliance" },
  { value: "SOP", label: "SOPs" },
  { value: "INVOICE", label: "Invoices" },
  { value: "REPORT", label: "Reports" },
  { value: "GENERAL", label: "General" },
];

const CUSTOMERS = [
  "Namibia Breweries Ltd",
  "TransNamib Holdings",
  "Pupkewitz Motors",
  "Ohlthaver & List",
  "Namibia Logistics",
  "Meat Corp Namibia",
  "Bank Windhoek",
  "Namdeb Diamond Corp",
  "FNB Namibia",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getFileIcon(fileType: FileType) {
  switch (fileType) {
    case "PDF":
      return <FileText className="h-5 w-5 text-red-500" />;
    case "DOC":
    case "DOCX":
      return <File className="h-5 w-5 text-blue-500" />;
    case "XLS":
    case "XLSX":
    case "CSV":
      return <FileSpreadsheet className="h-5 w-5 text-green-600" />;
    case "PNG":
    case "JPG":
      return <FileImage className="h-5 w-5 text-purple-500" />;
    default:
      return <File className="h-5 w-5 text-gray-500" />;
  }
}

function getCategoryColor(category: string): string {
  const map: Record<string, string> = {
    CONTRACT: "bg-blue-100 text-blue-800",
    CERTIFICATE: "bg-green-100 text-green-800",
    REGISTRATION: "bg-purple-100 text-purple-800",
    COMPLIANCE: "bg-amber-100 text-amber-800",
    SOP: "bg-cyan-100 text-cyan-800",
    INVOICE: "bg-emerald-100 text-emerald-800",
    REPORT: "bg-orange-100 text-orange-800",
    GENERAL: "bg-gray-100 text-gray-700",
  };
  return map[category] || "bg-gray-100 text-gray-700";
}

function getAccessLevelColor(level: AccessLevel): string {
  const map: Record<AccessLevel, string> = {
    PUBLIC: "bg-green-100 text-green-800",
    INTERNAL: "bg-blue-100 text-blue-800",
    RESTRICTED: "bg-amber-100 text-amber-800",
    CONFIDENTIAL: "bg-red-100 text-red-800",
  };
  return map[level];
}

function getAccessLevelIcon(level: AccessLevel) {
  switch (level) {
    case "PUBLIC":
      return <Shield className="h-3 w-3" />;
    case "INTERNAL":
      return <Shield className="h-3 w-3" />;
    case "RESTRICTED":
      return <Shield className="h-3 w-3" />;
    case "CONFIDENTIAL":
      return <Shield className="h-3 w-3" />;
  }
}

function isExpiringSoon(expiryDate: string | null): boolean {
  if (!expiryDate) return false;
  const now = new Date();
  const expiry = new Date(expiryDate);
  const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays > 0 && diffDays <= 30;
}

function isExpired(expiryDate: string | null): boolean {
  if (!expiryDate) return false;
  return new Date(expiryDate) < new Date();
}

function formatLabel(value: string): string {
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>(mockDocuments);
  const [activeCategory, setActiveCategory] = useState<DocumentCategory>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "GENERAL" as Exclude<DocumentCategory, "ALL">,
    accessLevel: "INTERNAL" as AccessLevel,
    customer: "",
    expiryDate: "",
  });
  const [dragActive, setDragActive] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState("");

  // Filtered documents
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const matchesCategory =
        activeCategory === "ALL" || doc.category === activeCategory;

      const query = searchQuery.toLowerCase();
      const matchesSearch =
        query === "" ||
        doc.name.toLowerCase().includes(query) ||
        doc.description.toLowerCase().includes(query) ||
        doc.uploadedBy.toLowerCase().includes(query) ||
        (doc.customer && doc.customer.toLowerCase().includes(query));

      return matchesCategory && matchesSearch;
    });
  }, [documents, activeCategory, searchQuery]);

  // KPI calculations
  const totalDocuments = documents.length;
  const totalContracts = documents.filter((d) => d.category === "CONTRACT").length;
  const totalCertificates = documents.filter((d) => d.category === "CERTIFICATE").length;
  const expiringSoon = documents.filter((d) => isExpiringSoon(d.expiryDate)).length;

  const stats = [
    {
      label: "Total Documents",
      value: totalDocuments,
      icon: FileText,
      color: "text-blue-600 bg-blue-50",
    },
    {
      label: "Contracts",
      value: totalContracts,
      icon: FileCheck2,
      color: "text-emerald-600 bg-emerald-50",
    },
    {
      label: "Certificates",
      value: totalCertificates,
      icon: Award,
      color: "text-purple-600 bg-purple-50",
    },
    {
      label: "Expiring Soon",
      value: expiringSoon,
      icon: AlertTriangle,
      color: "text-amber-600 bg-amber-50",
    },
  ];

  // Handlers
  function handleFormChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const fileExt = selectedFileName.split(".").pop()?.toUpperCase() || "PDF";
    const newDoc: Document = {
      id: `doc-${Date.now()}`,
      name: formData.name,
      description: formData.description,
      category: formData.category,
      fileType: (["PDF", "DOC", "DOCX", "XLS", "XLSX", "PNG", "JPG", "CSV"].includes(fileExt) ? fileExt : "PDF") as FileType,
      fileSize: selectedFileName ? "N/A" : "N/A",
      uploadedBy: "Current User",
      uploadDate: new Date().toISOString().split("T")[0],
      expiryDate: formData.expiryDate || null,
      accessLevel: formData.accessLevel,
      customer: formData.customer || null,
    };

    setDocuments((prev) => [newDoc, ...prev]);
    toast.success("Document uploaded successfully");
    setShowUploadModal(false);
    setFormData({
      name: "",
      description: "",
      category: "GENERAL",
      accessLevel: "INTERNAL",
      customer: "",
      expiryDate: "",
    });
    setSelectedFileName("");
  }

  function handleDrag(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFileName(e.dataTransfer.files[0].name);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      setSelectedFileName(e.target.files[0].name);
    }
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Document Management
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage contracts, certificates, SOPs, and all operational documents
            </p>
          </div>
          <button
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <Upload className="h-4 w-4" />
            Upload Document
          </button>
        </div>

        {/* Stats Row */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

        {/* Category Tabs + Search */}
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {/* Category Tabs */}
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => {
                const count =
                  cat.value === "ALL"
                    ? documents.length
                    : documents.filter((d) => d.category === cat.value).length;
                return (
                  <button
                    key={cat.value}
                    onClick={() => setActiveCategory(cat.value)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                      activeCategory === cat.value
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    )}
                  >
                    {cat.label}
                    <span
                      className={cn(
                        "inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-semibold",
                        activeCategory === cat.value
                          ? "bg-blue-500 text-white"
                          : "bg-gray-200 text-gray-600"
                      )}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search */}
            <div className="relative w-full lg:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Document List */}
        {filteredDocuments.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white py-16 shadow-sm">
            <FolderOpen className="mb-3 h-12 w-12 text-gray-300" />
            <p className="text-lg font-medium text-gray-500">
              No documents found
            </p>
            <p className="mt-1 text-sm text-gray-400">
              Try adjusting your filters or search query
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="whitespace-nowrap px-4 py-3 font-semibold text-gray-600">
                      Document
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 font-semibold text-gray-600">
                      Category
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 font-semibold text-gray-600">
                      Uploaded By
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 font-semibold text-gray-600">
                      Upload Date
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 font-semibold text-gray-600">
                      Expiry
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 font-semibold text-gray-600">
                      Access
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-center font-semibold text-gray-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredDocuments.map((doc) => (
                    <tr
                      key={doc.id}
                      className="transition-colors hover:bg-gray-50/70"
                    >
                      {/* Document Name + File Info */}
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100">
                            {getFileIcon(doc.fileType)}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-gray-900 max-w-[300px]">
                              {doc.name}
                            </p>
                            <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
                              <span className="font-medium text-gray-600">
                                {doc.fileType}
                              </span>
                              <span className="text-gray-300">|</span>
                              <div className="flex items-center gap-1">
                                <HardDrive className="h-3 w-3" />
                                {doc.fileSize}
                              </div>
                              {doc.customer && (
                                <>
                                  <span className="text-gray-300">|</span>
                                  <span className="truncate max-w-[140px]">
                                    {doc.customer}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="whitespace-nowrap px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                            getCategoryColor(doc.category)
                          )}
                        >
                          {formatLabel(doc.category)}
                        </span>
                      </td>

                      {/* Uploaded By */}
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
                            {getInitials(doc.uploadedBy)}
                          </span>
                          <span className="text-gray-700">
                            {doc.uploadedBy}
                          </span>
                        </div>
                      </td>

                      {/* Upload Date */}
                      <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-gray-400" />
                          {formatDate(doc.uploadDate)}
                        </div>
                      </td>

                      {/* Expiry Date */}
                      <td className="whitespace-nowrap px-4 py-3">
                        {doc.expiryDate ? (
                          <div
                            className={cn(
                              "flex items-center gap-1.5 text-sm",
                              isExpired(doc.expiryDate)
                                ? "font-medium text-red-600"
                                : isExpiringSoon(doc.expiryDate)
                                  ? "font-medium text-amber-600"
                                  : "text-gray-600"
                            )}
                          >
                            {(isExpired(doc.expiryDate) || isExpiringSoon(doc.expiryDate)) && (
                              <AlertTriangle className="h-3.5 w-3.5" />
                            )}
                            {formatDate(doc.expiryDate)}
                            {isExpired(doc.expiryDate) && (
                              <span className="ml-1 text-xs">(Expired)</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs italic text-gray-400">
                            N/A
                          </span>
                        )}
                      </td>

                      {/* Access Level */}
                      <td className="whitespace-nowrap px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
                            getAccessLevelColor(doc.accessLevel)
                          )}
                        >
                          {getAccessLevelIcon(doc.accessLevel)}
                          {formatLabel(doc.accessLevel)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            title="View"
                            onClick={() => toast.info(`Viewing ${doc.name}`)}
                            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-blue-600"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            title="Download"
                            onClick={() => toast.success(`Downloading ${doc.name}`)}
                            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-green-600"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          <button
                            title="Delete"
                            onClick={() => {
                              setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
                              toast.success(`${doc.name} deleted`);
                            }}
                            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-red-600"
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

            {/* Table Footer */}
            <div className="border-t border-gray-200 bg-gray-50 px-4 py-3">
              <p className="text-xs text-gray-500">
                Showing{" "}
                <span className="font-medium text-gray-700">
                  {filteredDocuments.length}
                </span>{" "}
                of{" "}
                <span className="font-medium text-gray-700">
                  {documents.length}
                </span>{" "}
                documents
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Upload Document Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowUploadModal(false)}
          />

          {/* Modal Content */}
          <div className="relative mx-4 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Upload Document
                </h2>
                <p className="text-sm text-gray-500">
                  Add a new document to the system
                </p>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="px-6 py-5">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {/* File Upload Area - full width */}
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    File <span className="text-red-500">*</span>
                  </label>
                  <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    className={cn(
                      "relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-8 transition-colors",
                      dragActive
                        ? "border-blue-500 bg-blue-50"
                        : selectedFileName
                          ? "border-green-300 bg-green-50"
                          : "border-gray-300 bg-gray-50 hover:border-gray-400"
                    )}
                  >
                    {selectedFileName ? (
                      <>
                        <FileCheck2 className="mb-2 h-8 w-8 text-green-500" />
                        <p className="text-sm font-medium text-green-700">
                          {selectedFileName}
                        </p>
                        <button
                          type="button"
                          onClick={() => setSelectedFileName("")}
                          className="mt-2 text-xs text-gray-500 underline hover:text-gray-700"
                        >
                          Remove file
                        </button>
                      </>
                    ) : (
                      <>
                        <Upload className="mb-2 h-8 w-8 text-gray-400" />
                        <p className="text-sm text-gray-600">
                          <span className="font-medium text-blue-600">
                            Click to upload
                          </span>{" "}
                          or drag and drop
                        </p>
                        <p className="mt-1 text-xs text-gray-400">
                          PDF, DOC, DOCX, XLS, XLSX, PNG, JPG up to 25MB
                        </p>
                      </>
                    )}
                    <input
                      type="file"
                      onChange={handleFileChange}
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.csv"
                    />
                  </div>
                </div>

                {/* Document Name - full width */}
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Document Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleFormChange}
                    placeholder="e.g. Fleet Service Agreement - NBL 2026"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Description - full width */}
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    name="description"
                    rows={3}
                    value={formData.description}
                    onChange={handleFormChange}
                    placeholder="Brief description of the document..."
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
                      {CATEGORIES.filter((c) => c.value !== "ALL").map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>

                {/* Access Level */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Access Level <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      name="accessLevel"
                      required
                      value={formData.accessLevel}
                      onChange={handleFormChange}
                      className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2 pr-9 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="PUBLIC">Public</option>
                      <option value="INTERNAL">Internal</option>
                      <option value="RESTRICTED">Restricted</option>
                      <option value="CONFIDENTIAL">Confidential</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>

                {/* Customer (optional) */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Customer
                  </label>
                  <div className="relative">
                    <select
                      name="customer"
                      value={formData.customer}
                      onChange={handleFormChange}
                      className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2 pr-9 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">None (Internal Document)</option>
                      {CUSTOMERS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>

                {/* Expiry Date (optional) */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    name="expiryDate"
                    value={formData.expiryDate}
                    onChange={handleFormChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Form Actions */}
              <div className="mt-6 flex items-center justify-end gap-3 border-t border-gray-200 pt-5">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  <Upload className="h-4 w-4" />
                  Upload Document
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
