"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Briefcase,
  Clock,
  CheckCircle2,
  DollarSign,
  Eye,
  Pencil,
  X,
  ChevronDown,
  Wrench,
} from "lucide-react";
import {
  cn,
  getStatusColor,
  getPriorityColor,
  formatDate,
  formatCurrency,
} from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface JobCard {
  id: string;
  jobNumber: string;
  title: string;
  customer: string;
  technician: string;
  jobType: string;
  status: string;
  priority: string;
  scheduledDate: string;
  estimatedHours: number;
}

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const INITIAL_JOB_CARDS: JobCard[] = [
  {
    id: "1",
    jobNumber: "JC-2602-0001",
    title: "GPS Tracker Installation - Toyota Hilux",
    customer: "Namibia Breweries",
    technician: "John Mutua",
    jobType: "INSTALLATION",
    status: "OPEN",
    priority: "HIGH",
    scheduledDate: "2026-02-22",
    estimatedHours: 3,
  },
  {
    id: "2",
    jobNumber: "JC-2602-0002",
    title: "Fleet Maintenance Check - 5 Vehicles",
    customer: "TransNamib Holdings",
    technician: "James Shilongo",
    jobType: "MAINTENANCE",
    status: "IN_PROGRESS",
    priority: "MEDIUM",
    scheduledDate: "2026-02-21",
    estimatedHours: 8,
  },
  {
    id: "3",
    jobNumber: "JC-2602-0003",
    title: "Tracker Repair - Ford Ranger",
    customer: "Pupkewitz Motors",
    technician: "John Mutua",
    jobType: "REPAIR",
    status: "ASSIGNED",
    priority: "URGENT",
    scheduledDate: "2026-02-21",
    estimatedHours: 2,
  },
  {
    id: "4",
    jobNumber: "JC-2602-0004",
    title: "Vehicle Inspection - Annual",
    customer: "Ohlthaver & List",
    technician: "James Shilongo",
    jobType: "INSPECTION",
    status: "COMPLETED",
    priority: "LOW",
    scheduledDate: "2026-02-18",
    estimatedHours: 4,
  },
  {
    id: "5",
    jobNumber: "JC-2602-0005",
    title: "Install Dash Cam + Tracker",
    customer: "Namibia Logistics",
    technician: "Peter Angula",
    jobType: "INSTALLATION",
    status: "IN_PROGRESS",
    priority: "HIGH",
    scheduledDate: "2026-02-20",
    estimatedHours: 5,
  },
  {
    id: "6",
    jobNumber: "JC-2602-0006",
    title: "Remove old tracker - Isuzu KB",
    customer: "Meat Corp Namibia",
    technician: "Peter Angula",
    jobType: "REMOVAL",
    status: "INVOICED",
    priority: "LOW",
    scheduledDate: "2026-02-15",
    estimatedHours: 1,
  },
  {
    id: "7",
    jobNumber: "JC-2602-0007",
    title: "Emergency Repair - Signal Lost",
    customer: "Namibia Breweries",
    technician: "John Mutua",
    jobType: "REPAIR",
    status: "OPEN",
    priority: "URGENT",
    scheduledDate: "2026-02-22",
    estimatedHours: 2,
  },
  {
    id: "8",
    jobNumber: "JC-2602-0008",
    title: "Quarterly Fleet Inspection",
    customer: "Bank Windhoek",
    technician: "James Shilongo",
    jobType: "INSPECTION",
    status: "ASSIGNED",
    priority: "MEDIUM",
    scheduledDate: "2026-02-24",
    estimatedHours: 6,
  },
];

const STATUS_OPTIONS = [
  "All",
  "OPEN",
  "ASSIGNED",
  "IN_PROGRESS",
  "COMPLETED",
  "INVOICED",
] as const;

const JOB_TYPE_OPTIONS = [
  "All",
  "INSTALLATION",
  "MAINTENANCE",
  "REPAIR",
  "INSPECTION",
  "REMOVAL",
] as const;

const PRIORITY_OPTIONS = ["All", "LOW", "MEDIUM", "HIGH", "URGENT"] as const;

const CUSTOMERS = [
  "Namibia Breweries",
  "TransNamib Holdings",
  "Pupkewitz Motors",
  "Ohlthaver & List",
  "Namibia Logistics",
  "Meat Corp Namibia",
  "Bank Windhoek",
];

const VEHICLES = [
  "Toyota Hilux - N 1234 WB",
  "Ford Ranger - N 5678 WB",
  "Isuzu KB - N 9012 WB",
  "Toyota Land Cruiser - N 3456 WB",
  "Nissan NP300 - N 7890 WB",
];

const TECHNICIANS = ["John Mutua", "James Shilongo", "Peter Angula"];

// ---------------------------------------------------------------------------
// Helper – readable labels
// ---------------------------------------------------------------------------

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
  };
  return map[type] || "bg-gray-100 text-gray-800";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function JobCardsPage() {
  // Job cards state
  const [jobCards, setJobCards] = useState<JobCard[]>(INITIAL_JOB_CARDS);

  // Selected job for detail drawer
  const [selectedJob, setSelectedJob] = useState<JobCard | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState("All");
  const [jobTypeFilter, setJobTypeFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    jobType: "INSTALLATION",
    priority: "MEDIUM",
    customer: "",
    vehicle: "",
    technician: "",
    scheduledDate: "",
    estimatedHours: "",
    location: "",
  });

  // Filtering logic
  const filteredJobCards = useMemo(() => {
    return jobCards.filter((job) => {
      if (statusFilter !== "All" && job.status !== statusFilter) return false;
      if (jobTypeFilter !== "All" && job.jobType !== jobTypeFilter) return false;
      if (priorityFilter !== "All" && job.priority !== priorityFilter)
        return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const searchable = [
          job.jobNumber,
          job.title,
          job.customer,
          job.technician,
        ]
          .join(" ")
          .toLowerCase();
        if (!searchable.includes(q)) return false;
      }
      return true;
    });
  }, [jobCards, statusFilter, jobTypeFilter, priorityFilter, searchQuery]);

  // Handlers
  function handleFormChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Generate a sequential job number based on existing cards
    const nextNum = jobCards.length + 1;
    const jobNumber = `JC-2602-${String(nextNum).padStart(4, "0")}`;

    const newJobCard: JobCard = {
      id: String(Date.now()),
      jobNumber,
      title: formData.title,
      customer: formData.customer,
      technician: formData.technician,
      jobType: formData.jobType,
      status: "OPEN",
      priority: formData.priority,
      scheduledDate: formData.scheduledDate,
      estimatedHours: formData.estimatedHours
        ? Number(formData.estimatedHours)
        : 0,
    };

    setJobCards((prev) => [newJobCard, ...prev]);
    toast.success(`Job card ${jobNumber} created`);
    setShowModal(false);
    setFormData({
      title: "",
      description: "",
      jobType: "INSTALLATION",
      priority: "MEDIUM",
      customer: "",
      vehicle: "",
      technician: "",
      scheduledDate: "",
      estimatedHours: "",
      location: "",
    });
  }

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
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <Plus className="h-4 w-4" />
            New Job Card
          </button>
        </div>

        {/* ---- Stats Row ---- */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Total Jobs */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                <Briefcase className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Total Jobs</p>
                <p className="text-2xl font-bold text-gray-900">24</p>
              </div>
            </div>
          </div>

          {/* In Progress */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">In Progress</p>
                <p className="text-2xl font-bold text-gray-900">8</p>
              </div>
            </div>
          </div>

          {/* Completed This Month */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Completed This Month
                </p>
                <p className="text-2xl font-bold text-gray-900">12</p>
              </div>
            </div>
          </div>

          {/* Revenue Generated */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Revenue Generated
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(35400)}
                </p>
              </div>
            </div>
          </div>
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

        {/* ---- Job Cards Table ---- */}
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
                    Technician
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
                      colSpan={9}
                      className="px-4 py-12 text-center text-gray-400"
                    >
                      <Wrench className="mx-auto mb-3 h-8 w-8 text-gray-300" />
                      <p className="text-sm font-medium">No job cards found</p>
                      <p className="mt-1 text-xs">
                        Try adjusting your filters or search query.
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
                          {job.jobNumber}
                        </span>
                      </td>

                      {/* Title */}
                      <td className="max-w-[240px] truncate px-4 py-3 text-gray-800">
                        {job.title}
                      </td>

                      {/* Customer */}
                      <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                        {job.customer}
                      </td>

                      {/* Technician */}
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
                            {getInitials(job.technician)}
                          </span>
                          <span className="text-gray-700">
                            {job.technician}
                          </span>
                        </div>
                      </td>

                      {/* Type */}
                      <td className="whitespace-nowrap px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                            getJobTypeBadgeColor(job.jobType)
                          )}
                        >
                          {formatLabel(job.jobType)}
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
                        {formatDate(job.scheduledDate)}
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
                            onClick={() => toast.info(`Editing ${job.jobNumber} — coming soon`)}
                            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-amber-600"
                          >
                            <Pencil className="h-4 w-4" />
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
                  {selectedJob.jobNumber}
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
                      getJobTypeBadgeColor(selectedJob.jobType)
                    )}
                  >
                    {formatLabel(selectedJob.jobType)}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">
                    Scheduled Date
                  </p>
                  <p className="mt-1 text-sm font-medium text-gray-800">
                    {formatDate(selectedJob.scheduledDate)}
                  </p>
                </div>
              </div>

              <hr className="border-gray-200" />

              <div>
                <p className="text-xs font-medium text-gray-500">Customer</p>
                <p className="mt-1 text-sm font-medium text-gray-800">
                  {selectedJob.customer}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-500">Technician</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
                    {getInitials(selectedJob.technician)}
                  </span>
                  <span className="text-sm font-medium text-gray-800">
                    {selectedJob.technician}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-500">
                  Estimated Hours
                </p>
                <p className="mt-1 text-sm font-medium text-gray-800">
                  {selectedJob.estimatedHours}h
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---- New Job Card Modal ---- */}
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
                  New Job Card
                </h2>
                <p className="text-sm text-gray-500">
                  Fill in the details to create a new job card.
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
                      name="jobType"
                      required
                      value={formData.jobType}
                      onChange={handleFormChange}
                      className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2 pr-9 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="INSTALLATION">Installation</option>
                      <option value="MAINTENANCE">Maintenance</option>
                      <option value="REPAIR">Repair</option>
                      <option value="INSPECTION">Inspection</option>
                      <option value="REMOVAL">Removal</option>
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
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>

                {/* Customer */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Customer <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      name="customer"
                      required
                      value={formData.customer}
                      onChange={handleFormChange}
                      className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2 pr-9 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">Select customer</option>
                      {CUSTOMERS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>

                {/* Vehicle */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Vehicle
                  </label>
                  <div className="relative">
                    <select
                      name="vehicle"
                      value={formData.vehicle}
                      onChange={handleFormChange}
                      className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2 pr-9 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">Select vehicle</option>
                      {VEHICLES.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>

                {/* Technician */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Technician <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      name="technician"
                      required
                      value={formData.technician}
                      onChange={handleFormChange}
                      className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2 pr-9 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">Select technician</option>
                      {TECHNICIANS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>

                {/* Scheduled Date */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Scheduled Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="scheduledDate"
                    required
                    value={formData.scheduledDate}
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
                    name="estimatedHours"
                    min="0"
                    step="0.5"
                    value={formData.estimatedHours}
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
                  Create Job Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
