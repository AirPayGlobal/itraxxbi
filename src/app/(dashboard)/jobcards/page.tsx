"use client";

import { useState, useMemo } from "react";
import {
  Plus,
  Search,
  Briefcase,
  Clock,
  CheckCircle2,
  ClipboardList,
  Eye,
  Pencil,
  Trash2,
  X,
  ChevronDown,
  Wrench,
  Loader2,
} from "lucide-react";
import {
  cn,
  getStatusColor,
  getPriorityColor,
  formatDate,
} from "@/lib/utils";
import {
  useJobCards,
  useCreateJobCard,
  useUpdateJobCard,
  useDeleteJobCard,
  type JobCard,
  type JobCardInput,
} from "@/lib/hooks/use-job-cards";
import { useCustomers } from "@/lib/hooks/use-customers";
import type {
  JobStatus,
  JobType,
  Priority,
} from "@/lib/supabase/database.types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_OPTIONS = [
  "All",
  "OPEN",
  "ASSIGNED",
  "IN_PROGRESS",
  "COMPLETED",
  "INVOICED",
  "CANCELLED",
] as const;

const JOB_TYPE_OPTIONS = [
  "All",
  "INSTALLATION",
  "MAINTENANCE",
  "REPAIR",
  "INSPECTION",
  "REMOVAL",
  "OTHER",
] as const;

const PRIORITY_OPTIONS = ["All", "LOW", "MEDIUM", "HIGH", "URGENT"] as const;

const JOB_TYPE_VALUES: JobType[] = [
  "INSTALLATION",
  "MAINTENANCE",
  "REPAIR",
  "INSPECTION",
  "REMOVAL",
  "OTHER",
];

const PRIORITY_VALUES: Priority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

const STATUS_VALUES: JobStatus[] = [
  "OPEN",
  "ASSIGNED",
  "IN_PROGRESS",
  "COMPLETED",
  "INVOICED",
  "CANCELLED",
];

// ---------------------------------------------------------------------------
// Form types & helpers
// ---------------------------------------------------------------------------

interface JobCardFormData {
  title: string;
  description: string;
  job_type: JobType;
  priority: Priority;
  status: JobStatus;
  customer_id: string;
  scheduled_date: string;
  estimated_hours: string;
  location: string;
  notes: string;
}

const emptyForm: JobCardFormData = {
  title: "",
  description: "",
  job_type: "INSTALLATION",
  priority: "MEDIUM",
  status: "OPEN",
  customer_id: "",
  scheduled_date: "",
  estimated_hours: "",
  location: "",
  notes: "",
};

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

function getJobTypeBadgeColor(type: string): string {
  const map: Record<string, string> = {
    INSTALLATION: "bg-indigo-100 text-indigo-800",
    MAINTENANCE: "bg-amber-100 text-amber-800",
    REPAIR: "bg-rose-100 text-rose-800",
    INSPECTION: "bg-cyan-100 text-cyan-800",
    REMOVAL: "bg-slate-100 text-slate-700",
    OTHER: "bg-gray-100 text-gray-800",
  };
  return map[type] || "bg-gray-100 text-gray-800";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function JobCardsPage() {
  const { data: jobCards = [], isLoading, isError, error } = useJobCards();
  const { data: customers = [] } = useCustomers();
  const createJobCard = useCreateJobCard();
  const updateJobCard = useUpdateJobCard();
  const deleteJobCard = useDeleteJobCard();

  // Selected job for detail drawer
  const [selectedJob, setSelectedJob] = useState<JobCard | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState("All");
  const [jobTypeFilter, setJobTypeFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal / form
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<JobCardFormData>(emptyForm);

  // Customer id -> name lookup
  const customerName = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of customers) map.set(c.id, c.name);
    return (id: string | null) => (id ? map.get(id) ?? "—" : "—");
  }, [customers]);

  // Filtering logic
  const filteredJobCards = useMemo(() => {
    return jobCards.filter((job) => {
      if (statusFilter !== "All" && job.status !== statusFilter) return false;
      if (jobTypeFilter !== "All" && job.job_type !== jobTypeFilter)
        return false;
      if (priorityFilter !== "All" && job.priority !== priorityFilter)
        return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const searchable = [
          job.job_number,
          job.title,
          customerName(job.customer_id),
        ]
          .join(" ")
          .toLowerCase();
        if (!searchable.includes(q)) return false;
      }
      return true;
    });
  }, [
    jobCards,
    statusFilter,
    jobTypeFilter,
    priorityFilter,
    searchQuery,
    customerName,
  ]);

  // Derived stats
  const stats = useMemo(() => {
    const inProgress = jobCards.filter(
      (j) => j.status === "IN_PROGRESS"
    ).length;
    const completed = jobCards.filter(
      (j) => j.status === "COMPLETED" || j.status === "INVOICED"
    ).length;
    const open = jobCards.filter(
      (j) => j.status === "OPEN" || j.status === "ASSIGNED"
    ).length;
    return [
      {
        label: "Total Jobs",
        value: String(jobCards.length),
        icon: Briefcase,
        iconBg: "bg-blue-50",
        iconColor: "text-blue-600",
      },
      {
        label: "In Progress",
        value: String(inProgress),
        icon: Clock,
        iconBg: "bg-amber-50",
        iconColor: "text-amber-600",
      },
      {
        label: "Completed",
        value: String(completed),
        icon: CheckCircle2,
        iconBg: "bg-green-50",
        iconColor: "text-green-600",
      },
      {
        label: "Open / Assigned",
        value: String(open),
        icon: ClipboardList,
        iconBg: "bg-emerald-50",
        iconColor: "text-emerald-600",
      },
    ];
  }, [jobCards]);

  // Handlers
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

  function openEdit(job: JobCard) {
    setEditingId(job.id);
    setFormData({
      title: job.title,
      description: job.description ?? "",
      job_type: job.job_type,
      priority: job.priority,
      status: job.status,
      customer_id: job.customer_id ?? "",
      scheduled_date: job.scheduled_date ?? "",
      estimated_hours:
        job.estimated_hours != null ? String(job.estimated_hours) : "",
      location: job.location ?? "",
      notes: job.notes ?? "",
    });
    setSelectedJob(null);
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: JobCardInput = {
      title: formData.title,
      description: formData.description || null,
      job_type: formData.job_type,
      priority: formData.priority,
      status: formData.status,
      customer_id: formData.customer_id || null,
      scheduled_date: formData.scheduled_date || null,
      estimated_hours: formData.estimated_hours
        ? Number(formData.estimated_hours)
        : null,
      location: formData.location || null,
      notes: formData.notes || null,
    };
    try {
      if (editingId) {
        await updateJobCard.mutateAsync({ id: editingId, ...payload });
      } else {
        await createJobCard.mutateAsync(payload);
      }
      setShowModal(false);
      setFormData(emptyForm);
      setEditingId(null);
    } catch {
      // error toast handled in the hook
    }
  }

  async function handleDelete(job: JobCard) {
    if (
      !window.confirm(
        `Delete ${job.job_number}? This cannot be undone.`
      )
    )
      return;
    try {
      await deleteJobCard.mutateAsync(job.id);
      setSelectedJob(null);
    } catch {
      // handled in hook
    }
  }

  const isSaving = createJobCard.isPending || updateJobCard.isPending;

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* ---- Page Header ---- */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Job Card Management
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Track, assign, and manage all job cards across your team.
            </p>
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <Plus className="h-4 w-4" />
            New Job Card
          </button>
        </div>

        {/* ---- Stats Row ---- */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-lg",
                    stat.iconBg
                  )}
                >
                  <stat.icon className={cn("h-5 w-5", stat.iconColor)} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    {stat.label}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {isLoading ? "—" : stat.value}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ---- Filter Bar ---- */}
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            {/* Status */}
            <div className="relative min-w-[160px]">
              <label className="mb-1 block text-xs font-medium text-gray-500">
                Status
              </label>
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-9 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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

            {/* Job Type */}
            <div className="relative min-w-[160px]">
              <label className="mb-1 block text-xs font-medium text-gray-500">
                Job Type
              </label>
              <div className="relative">
                <select
                  value={jobTypeFilter}
                  onChange={(e) => setJobTypeFilter(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-9 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {JOB_TYPE_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t === "All" ? "All Types" : formatLabel(t)}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              </div>
            </div>

            {/* Priority */}
            <div className="relative min-w-[160px]">
              <label className="mb-1 block text-xs font-medium text-gray-500">
                Priority
              </label>
              <div className="relative">
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-9 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {PRIORITY_OPTIONS.map((p) => (
                    <option key={p} value={p}>
                      {p === "All" ? "All Priorities" : formatLabel(p)}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              </div>
            </div>

            {/* Search */}
            <div className="flex-1 lg:min-w-[220px]">
              <label className="mb-1 block text-xs font-medium text-gray-500">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search job number, title, customer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-700 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ---- States / Job Cards Table ---- */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white py-16 shadow-sm">
            <Loader2 className="mb-3 h-8 w-8 animate-spin text-blue-500" />
            <p className="text-sm text-gray-500">Loading job cards…</p>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 py-16 shadow-sm">
            <p className="text-lg font-medium text-red-700">
              Failed to load job cards
            </p>
            <p className="mt-1 text-sm text-red-500">
              {(error as Error)?.message ?? "Please try again."}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="whitespace-nowrap px-4 py-3 font-semibold text-gray-600">
                      Job Number
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 font-semibold text-gray-600">
                      Title
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 font-semibold text-gray-600">
                      Customer
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 font-semibold text-gray-600">
                      Type
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 font-semibold text-gray-600">
                      Status
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 font-semibold text-gray-600">
                      Priority
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 font-semibold text-gray-600">
                      Scheduled Date
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-center font-semibold text-gray-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredJobCards.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-12 text-center text-gray-400"
                      >
                        <Wrench className="mx-auto mb-3 h-8 w-8 text-gray-300" />
                        <p className="text-sm font-medium">No job cards found</p>
                        <p className="mt-1 text-xs">
                          {jobCards.length === 0
                            ? "Create your first job card to get started."
                            : "Try adjusting your filters or search query."}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredJobCards.map((job) => (
                      <tr
                        key={job.id}
                        className="transition-colors hover:bg-gray-50/70"
                      >
                        {/* Job Number */}
                        <td className="whitespace-nowrap px-4 py-3">
                          <span
                            className="cursor-pointer font-bold text-blue-600 hover:text-blue-800 hover:underline"
                            onClick={() => setSelectedJob(job)}
                          >
                            {job.job_number}
                          </span>
                        </td>

                        {/* Title */}
                        <td className="max-w-[240px] truncate px-4 py-3 text-gray-800">
                          {job.title}
                        </td>

                        {/* Customer */}
                        <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                          {customerName(job.customer_id)}
                        </td>

                        {/* Type */}
                        <td className="whitespace-nowrap px-4 py-3">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                              getJobTypeBadgeColor(job.job_type)
                            )}
                          >
                            {formatLabel(job.job_type)}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="whitespace-nowrap px-4 py-3">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                              getStatusColor(job.status)
                            )}
                          >
                            {formatLabel(job.status)}
                          </span>
                        </td>

                        {/* Priority */}
                        <td className="whitespace-nowrap px-4 py-3">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                              getPriorityColor(job.priority)
                            )}
                          >
                            {formatLabel(job.priority)}
                          </span>
                        </td>

                        {/* Scheduled Date */}
                        <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                          {job.scheduled_date
                            ? formatDate(job.scheduled_date)
                            : "—"}
                        </td>

                        {/* Actions */}
                        <td className="whitespace-nowrap px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              title="View"
                              onClick={() => setSelectedJob(job)}
                              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-blue-600"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              title="Edit"
                              onClick={() => openEdit(job)}
                              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-amber-600"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              title="Delete"
                              onClick={() => handleDelete(job)}
                              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-red-600"
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

            {/* Table footer */}
            <div className="border-t border-gray-200 bg-gray-50 px-4 py-3">
              <p className="text-xs text-gray-500">
                Showing{" "}
                <span className="font-medium text-gray-700">
                  {filteredJobCards.length}
                </span>{" "}
                of{" "}
                <span className="font-medium text-gray-700">
                  {jobCards.length}
                </span>{" "}
                job cards
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ---- Detail Drawer ---- */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setSelectedJob(null)}
          />

          {/* Drawer panel */}
          <div className="relative w-full max-w-md overflow-y-auto bg-white shadow-2xl">
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {selectedJob.job_number}
                </h2>
                <p className="text-sm text-gray-500">{selectedJob.title}</p>
              </div>
              <button
                onClick={() => setSelectedJob(null)}
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Details */}
            <div className="space-y-5 px-6 py-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-gray-500">Status</p>
                  <span
                    className={cn(
                      "mt-1 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                      getStatusColor(selectedJob.status)
                    )}
                  >
                    {formatLabel(selectedJob.status)}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">Priority</p>
                  <span
                    className={cn(
                      "mt-1 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                      getPriorityColor(selectedJob.priority)
                    )}
                  >
                    {formatLabel(selectedJob.priority)}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">Job Type</p>
                  <span
                    className={cn(
                      "mt-1 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                      getJobTypeBadgeColor(selectedJob.job_type)
                    )}
                  >
                    {formatLabel(selectedJob.job_type)}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">
                    Scheduled Date
                  </p>
                  <p className="mt-1 text-sm font-medium text-gray-800">
                    {selectedJob.scheduled_date
                      ? formatDate(selectedJob.scheduled_date)
                      : "—"}
                  </p>
                </div>
              </div>

              <hr className="border-gray-200" />

              <div>
                <p className="text-xs font-medium text-gray-500">Customer</p>
                <p className="mt-1 text-sm font-medium text-gray-800">
                  {customerName(selectedJob.customer_id)}
                </p>
              </div>

              {selectedJob.technician_id && (
                <div>
                  <p className="text-xs font-medium text-gray-500">
                    Technician
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
                      {getInitials(selectedJob.technician_id)}
                    </span>
                    <span className="text-sm font-medium text-gray-800">
                      {selectedJob.technician_id}
                    </span>
                  </div>
                </div>
              )}

              {selectedJob.description && (
                <div>
                  <p className="text-xs font-medium text-gray-500">
                    Description
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">
                    {selectedJob.description}
                  </p>
                </div>
              )}

              {selectedJob.location && (
                <div>
                  <p className="text-xs font-medium text-gray-500">Location</p>
                  <p className="mt-1 text-sm font-medium text-gray-800">
                    {selectedJob.location}
                  </p>
                </div>
              )}

              <div>
                <p className="text-xs font-medium text-gray-500">
                  Estimated Hours
                </p>
                <p className="mt-1 text-sm font-medium text-gray-800">
                  {selectedJob.estimated_hours != null
                    ? `${selectedJob.estimated_hours}h`
                    : "—"}
                </p>
              </div>

              {selectedJob.notes && (
                <div>
                  <p className="text-xs font-medium text-gray-500">Notes</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">
                    {selectedJob.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 border-t border-gray-200 px-6 py-4">
              <button
                onClick={() => openEdit(selectedJob)}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                <Pencil className="h-4 w-4" />
                Edit
              </button>
              <button
                onClick={() => handleDelete(selectedJob)}
                className="flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- New / Edit Job Card Modal ---- */}
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
                  {editingId ? "Edit Job Card" : "New Job Card"}
                </h2>
                <p className="text-sm text-gray-500">
                  {editingId
                    ? "Update the details of this job card."
                    : "Fill in the details to create a new job card."}
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
                {/* Title - full width */}
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="title"
                    required
                    value={formData.title}
                    onChange={handleFormChange}
                    placeholder="e.g. GPS Tracker Installation"
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
                    placeholder="Provide details about the job..."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Job Type */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Job Type <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      name="job_type"
                      required
                      value={formData.job_type}
                      onChange={handleFormChange}
                      className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2 pr-9 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {JOB_TYPE_VALUES.map((t) => (
                        <option key={t} value={t}>
                          {formatLabel(t)}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>

                {/* Priority */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Priority <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      name="priority"
                      required
                      value={formData.priority}
                      onChange={handleFormChange}
                      className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2 pr-9 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {PRIORITY_VALUES.map((p) => (
                        <option key={p} value={p}>
                          {formatLabel(p)}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>

                {/* Customer */}
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
                      <option value="">Select customer</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>

                {/* Status (edit only makes most sense, shown for both) */}
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
                      {STATUS_VALUES.map((s) => (
                        <option key={s} value={s}>
                          {formatLabel(s)}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>

                {/* Scheduled Date */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Scheduled Date
                  </label>
                  <input
                    type="date"
                    name="scheduled_date"
                    value={formData.scheduled_date}
                    onChange={handleFormChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Estimated Hours */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Estimated Hours
                  </label>
                  <input
                    type="number"
                    name="estimated_hours"
                    min="0"
                    step="0.5"
                    value={formData.estimated_hours}
                    onChange={handleFormChange}
                    placeholder="e.g. 3"
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
                    placeholder="e.g. Workshop Bay 2"
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
                    rows={2}
                    value={formData.notes}
                    onChange={handleFormChange}
                    placeholder="Additional notes..."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* TODO: technician & vehicle pickers pending dedicated hooks */}
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
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingId ? "Save Changes" : "Create Job Card"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
