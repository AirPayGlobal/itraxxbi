"use client";

import { useState, useMemo, useRef } from "react";
import {
  FileText,
  FileCheck2,
  Award,
  AlertTriangle,
  Search,
  Eye,
  Download,
  Trash2,
  X,
  Upload,
  File as FileIcon,
  FileSpreadsheet,
  FileImage,
  Calendar,
  Shield,
  FolderOpen,
  ChevronDown,
  HardDrive,
  Loader2,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import {
  useDocuments,
  useUploadDocument,
  useDeleteDocument,
  type Document,
} from "@/lib/hooks/use-documents";
import { useProfiles } from "@/lib/hooks/use-hr";
import { useCustomers } from "@/lib/hooks/use-customers";
import type { DocCategory, DocAccess } from "@/lib/supabase/database.types";

// ---------------------------------------------------------------------------
// Constants + helpers
// ---------------------------------------------------------------------------

const CATEGORIES: { value: "ALL" | DocCategory; label: string }[] = [
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

const ACCESS_LEVELS: DocAccess[] = [
  "PUBLIC",
  "INTERNAL",
  "RESTRICTED",
  "CONFIDENTIAL",
];

function fileExt(fileName: string): string {
  return fileName.split(".").pop()?.toUpperCase() || "FILE";
}

function getFileIcon(fileName: string) {
  const ext = fileExt(fileName);
  if (ext === "PDF") return <FileText className="h-5 w-5 text-red-500" />;
  if (["DOC", "DOCX"].includes(ext))
    return <FileIcon className="h-5 w-5 text-blue-500" />;
  if (["XLS", "XLSX", "CSV"].includes(ext))
    return <FileSpreadsheet className="h-5 w-5 text-green-600" />;
  if (["PNG", "JPG", "JPEG", "GIF", "WEBP"].includes(ext))
    return <FileImage className="h-5 w-5 text-purple-500" />;
  return <FileIcon className="h-5 w-5 text-gray-500" />;
}

function formatFileSize(bytes: number | null): string {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

function getAccessLevelColor(level: string): string {
  const map: Record<string, string> = {
    PUBLIC: "bg-green-100 text-green-800",
    INTERNAL: "bg-blue-100 text-blue-800",
    RESTRICTED: "bg-amber-100 text-amber-800",
    CONFIDENTIAL: "bg-red-100 text-red-800",
  };
  return map[level] || "bg-gray-100 text-gray-700";
}

function isExpiringSoon(expiryDate: string | null): boolean {
  if (!expiryDate) return false;
  const diffDays = Math.ceil(
    (new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
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
  const { data: documents = [], isLoading, isError, error } = useDocuments();
  const { data: profiles = [] } = useProfiles();
  const { data: customers = [] } = useCustomers();
  const uploadDoc = useUploadDocument();
  const deleteDoc = useDeleteDocument();

  const [activeCategory, setActiveCategory] = useState<"ALL" | DocCategory>(
    "ALL"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "GENERAL" as DocCategory,
    access_level: "INTERNAL" as DocAccess,
    customer_id: "",
    expiry_date: "",
  });

  const profileName = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of profiles) m.set(p.id, p.name);
    return m;
  }, [profiles]);

  const customerName = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of customers) m.set(c.id, c.name);
    return m;
  }, [customers]);

  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const matchesCategory =
        activeCategory === "ALL" || doc.category === activeCategory;
      const query = searchQuery.toLowerCase();
      const uploader = profileName.get(doc.uploaded_by_id) ?? "";
      const cust = doc.customer_id
        ? customerName.get(doc.customer_id) ?? ""
        : "";
      const matchesSearch =
        query === "" ||
        doc.name.toLowerCase().includes(query) ||
        (doc.description ?? "").toLowerCase().includes(query) ||
        uploader.toLowerCase().includes(query) ||
        cust.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [documents, activeCategory, searchQuery, profileName, customerName]);

  const stats = useMemo(
    () => [
      {
        label: "Total Documents",
        value: documents.length,
        icon: FileText,
        color: "text-blue-600 bg-blue-50",
      },
      {
        label: "Contracts",
        value: documents.filter((d) => d.category === "CONTRACT").length,
        icon: FileCheck2,
        color: "text-emerald-600 bg-emerald-50",
      },
      {
        label: "Certificates",
        value: documents.filter((d) => d.category === "CERTIFICATE").length,
        icon: Award,
        color: "text-purple-600 bg-purple-50",
      },
      {
        label: "Expiring Soon",
        value: documents.filter((d) => isExpiringSoon(d.expiry_date)).length,
        icon: AlertTriangle,
        color: "text-amber-600 bg-amber-50",
      },
    ],
    [documents]
  );

  function handleFormChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleDrag(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!formData.name) {
        setFormData((p) => ({ ...p, name: file.name.replace(/\.[^.]+$/, "") }));
      }
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!formData.name) {
        setFormData((p) => ({ ...p, name: file.name.replace(/\.[^.]+$/, "") }));
      }
    }
  }

  function resetForm() {
    setFormData({
      name: "",
      description: "",
      category: "GENERAL",
      access_level: "INTERNAL",
      customer_id: "",
      expiry_date: "",
    });
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFile) {
      const { toast } = await import("sonner");
      toast.error("Please choose a file to upload.");
      return;
    }
    try {
      await uploadDoc.mutateAsync({
        file: selectedFile,
        name: formData.name || selectedFile.name,
        description: formData.description || null,
        category: formData.category,
        access_level: formData.access_level,
        expiry_date: formData.expiry_date || null,
        customer_id: formData.customer_id || null,
      });
      setShowUploadModal(false);
      resetForm();
    } catch {
      /* handled in hook */
    }
  }

  async function handleDelete(doc: Document) {
    if (!window.confirm(`Delete "${doc.name}"? This also removes the file.`))
      return;
    try {
      await deleteDoc.mutateAsync(doc);
    } catch {
      /* handled in hook */
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
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

        {/* Stats */}
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

        {/* Category Tabs + Search */}
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
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
        {isLoading ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white py-16 shadow-sm">
            <Loader2 className="mb-3 h-8 w-8 animate-spin text-blue-500" />
            <p className="text-sm text-gray-500">Loading documents…</p>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 py-16 shadow-sm">
            <p className="text-lg font-medium text-red-700">
              Failed to load documents
            </p>
            <p className="mt-1 text-sm text-red-500">
              {(error as Error)?.message ?? "Please try again."}
            </p>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white py-16 shadow-sm">
            <FolderOpen className="mb-3 h-12 w-12 text-gray-300" />
            <p className="text-lg font-medium text-gray-500">
              No documents found
            </p>
            <p className="mt-1 text-sm text-gray-400">
              {documents.length === 0
                ? "Upload your first document to get started"
                : "Try adjusting your filters or search query"}
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
                  {filteredDocuments.map((doc) => {
                    const uploader =
                      profileName.get(doc.uploaded_by_id) ?? "Unknown";
                    const cust = doc.customer_id
                      ? customerName.get(doc.customer_id)
                      : null;
                    return (
                      <tr
                        key={doc.id}
                        className="transition-colors hover:bg-gray-50/70"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100">
                              {getFileIcon(doc.file_name)}
                            </div>
                            <div className="min-w-0">
                              <p className="max-w-[300px] truncate font-medium text-gray-900">
                                {doc.name}
                              </p>
                              <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
                                <span className="font-medium text-gray-600">
                                  {fileExt(doc.file_name)}
                                </span>
                                <span className="text-gray-300">|</span>
                                <div className="flex items-center gap-1">
                                  <HardDrive className="h-3 w-3" />
                                  {formatFileSize(doc.file_size)}
                                </div>
                                {cust && (
                                  <>
                                    <span className="text-gray-300">|</span>
                                    <span className="max-w-[140px] truncate">
                                      {cust}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

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

                        <td className="whitespace-nowrap px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
                              {getInitials(uploader)}
                            </span>
                            <span className="text-gray-700">{uploader}</span>
                          </div>
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-gray-400" />
                            {formatDate(doc.created_at)}
                          </div>
                        </td>

                        <td className="whitespace-nowrap px-4 py-3">
                          {doc.expiry_date ? (
                            <div
                              className={cn(
                                "flex items-center gap-1.5 text-sm",
                                isExpired(doc.expiry_date)
                                  ? "font-medium text-red-600"
                                  : isExpiringSoon(doc.expiry_date)
                                  ? "font-medium text-amber-600"
                                  : "text-gray-600"
                              )}
                            >
                              {(isExpired(doc.expiry_date) ||
                                isExpiringSoon(doc.expiry_date)) && (
                                <AlertTriangle className="h-3.5 w-3.5" />
                              )}
                              {formatDate(doc.expiry_date)}
                              {isExpired(doc.expiry_date) && (
                                <span className="ml-1 text-xs">(Expired)</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs italic text-gray-400">
                              N/A
                            </span>
                          )}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
                              getAccessLevelColor(doc.access_level)
                            )}
                          >
                            <Shield className="h-3 w-3" />
                            {formatLabel(doc.access_level)}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <a
                              title="View"
                              href={doc.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-blue-600"
                            >
                              <Eye className="h-4 w-4" />
                            </a>
                            <a
                              title="Download"
                              href={doc.file_url}
                              download={doc.file_name}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-green-600"
                            >
                              <Download className="h-4 w-4" />
                            </a>
                            <button
                              title="Delete"
                              onClick={() => handleDelete(doc)}
                              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

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
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowUploadModal(false)}
          />
          <div className="relative mx-4 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
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

            <form onSubmit={handleSubmit} className="px-6 py-5">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
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
                        : selectedFile
                        ? "border-green-300 bg-green-50"
                        : "border-gray-300 bg-gray-50 hover:border-gray-400"
                    )}
                  >
                    {selectedFile ? (
                      <>
                        <FileCheck2 className="mb-2 h-8 w-8 text-green-500" />
                        <p className="text-sm font-medium text-green-700">
                          {selectedFile.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(selectedFile.size)}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedFile(null);
                            if (fileInputRef.current)
                              fileInputRef.current.value = "";
                          }}
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
                          PDF, DOC, DOCX, XLS, XLSX, PNG, JPG up to 50MB
                        </p>
                      </>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleFileChange}
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.csv"
                    />
                  </div>
                </div>

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

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Access Level <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      name="access_level"
                      required
                      value={formData.access_level}
                      onChange={handleFormChange}
                      className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2 pr-9 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {ACCESS_LEVELS.map((level) => (
                        <option key={level} value={level}>
                          {formatLabel(level)}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Customer
                  </label>
                  <div className="relative">
                    <select
                      name="customer_id"
                      value={formData.customer_id}
                      onChange={handleFormChange}
                      className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2 pr-9 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">None (Internal Document)</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    name="expiry_date"
                    value={formData.expiry_date}
                    onChange={handleFormChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 border-t border-gray-200 pt-5">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadDoc.isPending}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50"
                >
                  {uploadDoc.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
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
