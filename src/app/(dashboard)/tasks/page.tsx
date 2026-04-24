"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  Plus,
  Search,
  CheckSquare,
  Clock,
  CheckCircle2,
  AlertTriangle,
  X,
  ChevronDown,
  ListTodo,
  Eye,
  Pencil,
  Calendar,
  Flag,
  FolderKanban,
  LayoutGrid,
  LayoutList,
  ArrowUpRight,
  CircleDot,
} from "lucide-react";
import {
  cn,
  getStatusColor,
  getPriorityColor,
  formatDate,
  formatDateTime,
} from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Task {
  id: string;
  title: string;
  description: string;
  status: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE" | "CANCELLED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  assignee: string;
  dueDate: string;
  project: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const mockTasks: Task[] = [
  {
    id: "TSK-001",
    title: "Install GPS trackers on new Hilux fleet",
    description:
      "Install and configure GPS tracking devices on 5 new Toyota Hilux vehicles for Namibia Breweries. Ensure all units are reporting to the central dashboard before sign-off.",
    status: "IN_PROGRESS",
    priority: "HIGH",
    assignee: "John Mutua",
    dueDate: "2026-02-24",
    project: "Fleet Tracker Rollout",
    createdAt: "2026-02-18T08:30:00",
  },
  {
    id: "TSK-002",
    title: "Conduct quarterly maintenance audit",
    description:
      "Review maintenance logs for all tracked vehicles in the TransNamib fleet. Identify overdue services and generate compliance report for management.",
    status: "TODO",
    priority: "MEDIUM",
    assignee: "Lisa Amupolo",
    dueDate: "2026-02-28",
    project: "Fleet Maintenance",
    createdAt: "2026-02-17T10:00:00",
  },
  {
    id: "TSK-003",
    title: "Fix signal loss on Ford Ranger N 5678 WB",
    description:
      "Investigate and resolve intermittent GPS signal loss reported on Ford Ranger. Suspect faulty antenna connection. Urgent priority due to client SLA breach risk.",
    status: "IN_PROGRESS",
    priority: "URGENT",
    assignee: "James Shilongo",
    dueDate: "2026-02-22",
    project: "Vehicle Diagnostics",
    createdAt: "2026-02-20T14:15:00",
  },
  {
    id: "TSK-004",
    title: "Update fleet dashboard with real-time alerts",
    description:
      "Implement geofence breach and speed limit violation alerts on the fleet management dashboard. Integrate with existing notification system.",
    status: "REVIEW",
    priority: "HIGH",
    assignee: "Sarah Peters",
    dueDate: "2026-02-25",
    project: "Fleet Tracker Rollout",
    createdAt: "2026-02-15T09:00:00",
  },
  {
    id: "TSK-005",
    title: "Prepare monthly vehicle utilization report",
    description:
      "Generate comprehensive vehicle utilization report for January 2026 covering all active fleet customers. Include mileage, idle time, and route efficiency metrics.",
    status: "DONE",
    priority: "MEDIUM",
    assignee: "Lisa Amupolo",
    dueDate: "2026-02-10",
    project: "Fleet Maintenance",
    createdAt: "2026-02-03T11:00:00",
  },
  {
    id: "TSK-006",
    title: "Replace faulty dash cam on Isuzu KB",
    description:
      "Dash cam unit on Isuzu KB N 9012 WB is recording intermittently. Replace hardware and verify recording quality before returning vehicle to service.",
    status: "TODO",
    priority: "LOW",
    assignee: "Peter Angula",
    dueDate: "2026-03-01",
    project: "Vehicle Diagnostics",
    createdAt: "2026-02-19T16:30:00",
  },
  {
    id: "TSK-007",
    title: "Onboard Bank Windhoek fleet vehicles",
    description:
      "Register 12 new Bank Windhoek vehicles in the tracking system. Configure custom geofences for branch locations and set up driver ID assignment.",
    status: "TODO",
    priority: "HIGH",
    assignee: "John Mutua",
    dueDate: "2026-02-26",
    project: "Client Onboarding",
    createdAt: "2026-02-20T08:00:00",
  },
  {
    id: "TSK-008",
    title: "Calibrate fuel sensors on MeatCo trucks",
    description:
      "Recalibrate fuel level sensors on 8 MeatCo refrigerated trucks. Current readings showing 15-20% variance from actual fuel levels.",
    status: "IN_PROGRESS",
    priority: "MEDIUM",
    assignee: "James Shilongo",
    dueDate: "2026-02-23",
    project: "Vehicle Diagnostics",
    createdAt: "2026-02-19T13:00:00",
  },
  {
    id: "TSK-009",
    title: "Train O&L dispatch team on tracking platform",
    description:
      "Conduct 2-hour training session with Ohlthaver & List dispatch team on using the fleet tracking platform. Cover real-time monitoring, reporting, and alert configuration.",
    status: "DONE",
    priority: "MEDIUM",
    assignee: "Sarah Peters",
    dueDate: "2026-02-18",
    project: "Client Onboarding",
    createdAt: "2026-02-12T10:00:00",
  },
  {
    id: "TSK-010",
    title: "Investigate high idle time on Pupkewitz fleet",
    description:
      "Analyze GPS data to identify vehicles with excessive idle time in the Pupkewitz Motors fleet. Prepare recommendations for route optimization.",
    status: "REVIEW",
    priority: "LOW",
    assignee: "Peter Angula",
    dueDate: "2026-02-27",
    project: "Fleet Maintenance",
    createdAt: "2026-02-16T14:00:00",
  },
  {
    id: "TSK-011",
    title: "Upgrade firmware on all Gen-2 tracker units",
    description:
      "Roll out firmware v3.2.1 to all Gen-2 tracker hardware across client fleets. Coordinate downtime windows with operations team to minimize disruption.",
    status: "TODO",
    priority: "URGENT",
    assignee: "David Kapere",
    dueDate: "2026-02-25",
    project: "Fleet Tracker Rollout",
    createdAt: "2026-02-21T09:30:00",
  },
  {
    id: "TSK-012",
    title: "Resolve Namibia Logistics contract renewal",
    description:
      "Follow up with Namibia Logistics on contract renewal proposal sent on Feb 10. Negotiate pricing for additional 15 vehicle trackers requested.",
    status: "CANCELLED",
    priority: "HIGH",
    assignee: "Lisa Amupolo",
    dueDate: "2026-02-20",
    project: "Client Onboarding",
    createdAt: "2026-02-10T11:00:00",
  },
];

const PROJECTS = [
  "All Tasks",
  "Fleet Tracker Rollout",
  "Fleet Maintenance",
  "Vehicle Diagnostics",
  "Client Onboarding",
] as const;

const STATUS_OPTIONS = [
  "All",
  "TODO",
  "IN_PROGRESS",
  "REVIEW",
  "DONE",
  "CANCELLED",
] as const;

const PRIORITY_OPTIONS = ["All", "LOW", "MEDIUM", "HIGH", "URGENT"] as const;

const ASSIGNEES = [
  "John Mutua",
  "James Shilongo",
  "Peter Angula",
  "Sarah Peters",
  "Lisa Amupolo",
  "David Kapere",
];

const KANBAN_COLUMNS: { key: Task["status"]; label: string; color: string }[] =
  [
    { key: "TODO", label: "To Do", color: "border-t-gray-400" },
    { key: "IN_PROGRESS", label: "In Progress", color: "border-t-blue-500" },
    { key: "REVIEW", label: "In Review", color: "border-t-yellow-500" },
    { key: "DONE", label: "Done", color: "border-t-green-500" },
    { key: "CANCELLED", label: "Cancelled", color: "border-t-red-500" },
  ];

// ---------------------------------------------------------------------------
// Helpers
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

function getAvatarColor(name: string): string {
  const colors = [
    "bg-blue-100 text-blue-700",
    "bg-purple-100 text-purple-700",
    "bg-emerald-100 text-emerald-700",
    "bg-amber-100 text-amber-700",
    "bg-rose-100 text-rose-700",
    "bg-cyan-100 text-cyan-700",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function isOverdue(dueDate: string, status: string): boolean {
  if (status === "DONE" || status === "CANCELLED") return false;
  return new Date(dueDate) < new Date();
}

function getPriorityIcon(priority: string): string {
  const map: Record<string, string> = {
    LOW: "text-gray-400",
    MEDIUM: "text-blue-500",
    HIGH: "text-orange-500",
    URGENT: "text-red-500",
  };
  return map[priority] || "text-gray-400";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TasksPage() {
  // View mode
  const [viewMode, setViewMode] = useState<"table" | "board">("table");

  // Filters
  const [projectFilter, setProjectFilter] = useState("All Tasks");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal
  const [showModal, setShowModal] = useState(false);

  // Detail drawer
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: "TODO",
    priority: "MEDIUM",
    assignee: "",
    dueDate: "",
    project: "Fleet Tracker Rollout",
  });

  // Filtering logic
  const filteredTasks = useMemo(() => {
    return mockTasks.filter((task) => {
      if (projectFilter !== "All Tasks" && task.project !== projectFilter)
        return false;
      if (statusFilter !== "All" && task.status !== statusFilter) return false;
      if (priorityFilter !== "All" && task.priority !== priorityFilter)
        return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const searchable = [
          task.id,
          task.title,
          task.description,
          task.assignee,
          task.project,
        ]
          .join(" ")
          .toLowerCase();
        if (!searchable.includes(q)) return false;
      }
      return true;
    });
  }, [projectFilter, statusFilter, priorityFilter, searchQuery]);

  // KPI calculations
  const kpiStats = useMemo(() => {
    const total = mockTasks.length;
    const inProgress = mockTasks.filter(
      (t) => t.status === "IN_PROGRESS"
    ).length;
    const completed = mockTasks.filter((t) => t.status === "DONE").length;
    const overdue = mockTasks.filter((t) =>
      isOverdue(t.dueDate, t.status)
    ).length;
    return { total, inProgress, completed, overdue };
  }, []);

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
    setShowModal(false);
    setFormData({
      title: "",
      description: "",
      status: "TODO",
      priority: "MEDIUM",
      assignee: "",
      dueDate: "",
      project: "Fleet Tracker Rollout",
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
              Tasks &amp; Project Management
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Organize, track, and manage tasks across all fleet projects.
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <Plus className="h-4 w-4" />
            New Task
          </button>
        </div>

        {/* ---- Stats Row ---- */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Total Tasks */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                <CheckSquare className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Total Tasks</p>
                <p className="text-2xl font-bold text-gray-900">
                  {kpiStats.total}
                </p>
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
                <p className="text-2xl font-bold text-gray-900">
                  {kpiStats.inProgress}
                </p>
              </div>
            </div>
          </div>

          {/* Completed */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Completed</p>
                <p className="text-2xl font-bold text-gray-900">
                  {kpiStats.completed}
                </p>
              </div>
            </div>
          </div>

          {/* Overdue */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Overdue</p>
                <p className="text-2xl font-bold text-gray-900">
                  {kpiStats.overdue}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ---- Project Tabs ---- */}
        <div className="mb-6 flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {PROJECTS.map((project) => (
              <button
                key={project}
                onClick={() => setProjectFilter(project)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  projectFilter === project
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                {project}
              </button>
            ))}
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 p-0.5">
            <button
              onClick={() => setViewMode("table")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                viewMode === "table"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              <LayoutList className="h-4 w-4" />
              Table
            </button>
            <button
              onClick={() => setViewMode("board")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                viewMode === "board"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              <LayoutGrid className="h-4 w-4" />
              Board
            </button>
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
                  placeholder="Search tasks, assignees, projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-700 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ---- Table View ---- */}
        {viewMode === "table" && (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="whitespace-nowrap px-4 py-3 font-semibold text-gray-600">
                      Task ID
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 font-semibold text-gray-600">
                      Title
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 font-semibold text-gray-600">
                      Project
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 font-semibold text-gray-600">
                      Assignee
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 font-semibold text-gray-600">
                      Status
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 font-semibold text-gray-600">
                      Priority
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 font-semibold text-gray-600">
                      Due Date
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-center font-semibold text-gray-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredTasks.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-12 text-center text-gray-400"
                      >
                        <ListTodo className="mx-auto mb-3 h-8 w-8 text-gray-300" />
                        <p className="text-sm font-medium">No tasks found</p>
                        <p className="mt-1 text-xs">
                          Try adjusting your filters or search query.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredTasks.map((task) => (
                      <tr
                        key={task.id}
                        className="transition-colors hover:bg-gray-50/70"
                      >
                        {/* Task ID */}
                        <td className="whitespace-nowrap px-4 py-3">
                          <button
                            onClick={() => setSelectedTask(task)}
                            className="cursor-pointer font-bold text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {task.id}
                          </button>
                        </td>

                        {/* Title */}
                        <td className="max-w-[260px] px-4 py-3">
                          <div className="truncate font-medium text-gray-800">
                            {task.title}
                          </div>
                          <div className="mt-0.5 truncate text-xs text-gray-400">
                            {task.description}
                          </div>
                        </td>

                        {/* Project */}
                        <td className="whitespace-nowrap px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <FolderKanban className="h-3.5 w-3.5 text-gray-400" />
                            <span className="text-gray-700">
                              {task.project}
                            </span>
                          </div>
                        </td>

                        {/* Assignee */}
                        <td className="whitespace-nowrap px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                                getAvatarColor(task.assignee)
                              )}
                            >
                              {getInitials(task.assignee)}
                            </span>
                            <span className="text-gray-700">
                              {task.assignee}
                            </span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="whitespace-nowrap px-4 py-3">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                              getStatusColor(task.status)
                            )}
                          >
                            {formatLabel(task.status)}
                          </span>
                        </td>

                        {/* Priority */}
                        <td className="whitespace-nowrap px-4 py-3">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
                              getPriorityColor(task.priority)
                            )}
                          >
                            <Flag
                              className={cn(
                                "h-3 w-3",
                                getPriorityIcon(task.priority)
                              )}
                            />
                            {formatLabel(task.priority)}
                          </span>
                        </td>

                        {/* Due Date */}
                        <td className="whitespace-nowrap px-4 py-3">
                          <span
                            className={cn(
                              "text-gray-600",
                              isOverdue(task.dueDate, task.status) &&
                                "font-medium text-red-600"
                            )}
                          >
                            {formatDate(task.dueDate)}
                          </span>
                          {isOverdue(task.dueDate, task.status) && (
                            <span className="ml-1.5 inline-flex items-center rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-700">
                              Overdue
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="whitespace-nowrap px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              title="View Details"
                              onClick={() => setSelectedTask(task)}
                              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-blue-600"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              title="Edit"
                              onClick={() => { setSelectedTask(task); toast.info(`Editing ${task.id}`); }}
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
                  {filteredTasks.length}
                </span>{" "}
                of{" "}
                <span className="font-medium text-gray-700">
                  {mockTasks.length}
                </span>{" "}
                tasks
              </p>
            </div>
          </div>
        )}

        {/* ---- Kanban Board View ---- */}
        {viewMode === "board" && (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {KANBAN_COLUMNS.map((column) => {
              const columnTasks = filteredTasks.filter(
                (t) => t.status === column.key
              );
              return (
                <div
                  key={column.key}
                  className="w-72 flex-shrink-0 lg:min-w-0 lg:flex-1"
                >
                  {/* Column header */}
                  <div
                    className={cn(
                      "mb-3 rounded-xl border border-gray-200 border-t-4 bg-white px-4 py-3 shadow-sm",
                      column.color
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-800">
                        {column.label}
                      </h3>
                      <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gray-100 px-1.5 text-xs font-medium text-gray-600">
                        {columnTasks.length}
                      </span>
                    </div>
                  </div>

                  {/* Column tasks */}
                  <div className="space-y-3">
                    {columnTasks.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 px-4 py-8 text-center">
                        <p className="text-xs text-gray-400">
                          No tasks
                        </p>
                      </div>
                    ) : (
                      columnTasks.map((task) => (
                        <button
                          key={task.id}
                          onClick={() => setSelectedTask(task)}
                          className="w-full cursor-pointer rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-shadow hover:shadow-md"
                        >
                          {/* Card top: priority + id */}
                          <div className="mb-2 flex items-center justify-between">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                                getPriorityColor(task.priority)
                              )}
                            >
                              <Flag className={cn("h-2.5 w-2.5", getPriorityIcon(task.priority))} />
                              {formatLabel(task.priority)}
                            </span>
                            <span className="text-[10px] font-medium text-gray-400">
                              {task.id}
                            </span>
                          </div>

                          {/* Title */}
                          <h4 className="mb-1.5 text-sm font-medium leading-snug text-gray-900">
                            {task.title}
                          </h4>

                          {/* Project */}
                          <div className="mb-3 flex items-center gap-1 text-xs text-gray-400">
                            <FolderKanban className="h-3 w-3" />
                            {task.project}
                          </div>

                          {/* Card bottom: avatar + due date */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={cn(
                                  "flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold",
                                  getAvatarColor(task.assignee)
                                )}
                              >
                                {getInitials(task.assignee)}
                              </span>
                              <span className="text-xs text-gray-500">
                                {task.assignee.split(" ")[0]}
                              </span>
                            </div>
                            <div
                              className={cn(
                                "flex items-center gap-1 text-xs",
                                isOverdue(task.dueDate, task.status)
                                  ? "font-medium text-red-600"
                                  : "text-gray-400"
                              )}
                            >
                              <Calendar className="h-3 w-3" />
                              {formatDate(task.dueDate)}
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ---- Task Detail Drawer ---- */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setSelectedTask(null)}
          />

          {/* Drawer content */}
          <div className="relative mx-4 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-sm font-bold text-blue-700">
                  {selectedTask.id}
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                      getStatusColor(selectedTask.status)
                    )}
                  >
                    {formatLabel(selectedTask.status)}
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
                      getPriorityColor(selectedTask.priority)
                    )}
                  >
                    <Flag
                      className={cn(
                        "h-3 w-3",
                        getPriorityIcon(selectedTask.priority)
                      )}
                    />
                    {formatLabel(selectedTask.priority)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5">
              <h2 className="mb-2 text-lg font-bold text-gray-900">
                {selectedTask.title}
              </h2>
              <p className="mb-6 text-sm leading-relaxed text-gray-600">
                {selectedTask.description}
              </p>

              {/* Metadata grid */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Assignee */}
                <div className="rounded-lg bg-gray-50 p-3.5">
                  <p className="mb-1 text-xs font-medium text-gray-500">
                    Assignee
                  </p>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold",
                        getAvatarColor(selectedTask.assignee)
                      )}
                    >
                      {getInitials(selectedTask.assignee)}
                    </span>
                    <span className="text-sm font-medium text-gray-800">
                      {selectedTask.assignee}
                    </span>
                  </div>
                </div>

                {/* Project */}
                <div className="rounded-lg bg-gray-50 p-3.5">
                  <p className="mb-1 text-xs font-medium text-gray-500">
                    Project
                  </p>
                  <div className="flex items-center gap-2">
                    <FolderKanban className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-800">
                      {selectedTask.project}
                    </span>
                  </div>
                </div>

                {/* Due Date */}
                <div className="rounded-lg bg-gray-50 p-3.5">
                  <p className="mb-1 text-xs font-medium text-gray-500">
                    Due Date
                  </p>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span
                      className={cn(
                        "text-sm font-medium",
                        isOverdue(selectedTask.dueDate, selectedTask.status)
                          ? "text-red-600"
                          : "text-gray-800"
                      )}
                    >
                      {formatDate(selectedTask.dueDate)}
                      {isOverdue(selectedTask.dueDate, selectedTask.status) && (
                        <span className="ml-2 inline-flex items-center rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-700">
                          Overdue
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Created */}
                <div className="rounded-lg bg-gray-50 p-3.5">
                  <p className="mb-1 text-xs font-medium text-gray-500">
                    Created
                  </p>
                  <div className="flex items-center gap-2">
                    <CircleDot className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-800">
                      {formatDateTime(selectedTask.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
              <button
                onClick={() => setSelectedTask(null)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Close
              </button>
              <button
                onClick={() => toast.info(`Edit mode for ${selectedTask?.id} — coming soon`)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- New Task Modal ---- */}
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
                <h2 className="text-lg font-bold text-gray-900">New Task</h2>
                <p className="text-sm text-gray-500">
                  Fill in the details to create a new task.
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
                    placeholder="e.g. Install GPS trackers on fleet vehicles"
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
                    placeholder="Provide details about the task..."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
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
                      <option value="TODO">To Do</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="REVIEW">In Review</option>
                      <option value="DONE">Done</option>
                      <option value="CANCELLED">Cancelled</option>
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

                {/* Project */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Project <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      name="project"
                      required
                      value={formData.project}
                      onChange={handleFormChange}
                      className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2 pr-9 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {PROJECTS.filter((p) => p !== "All Tasks").map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>

                {/* Assignee */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Assignee <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      name="assignee"
                      required
                      value={formData.assignee}
                      onChange={handleFormChange}
                      className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2 pr-9 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">Select assignee</option>
                      {ASSIGNEES.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>

                {/* Due Date */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Due Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="dueDate"
                    required
                    value={formData.dueDate}
                    onChange={handleFormChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
