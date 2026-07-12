"use client";

import { useState, useMemo } from "react";
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
  Trash2,
  Calendar,
  Flag,
  FolderKanban,
  LayoutGrid,
  LayoutList,
  CircleDot,
  Loader2,
} from "lucide-react";
import {
  cn,
  getStatusColor,
  getPriorityColor,
  formatDate,
  formatDateTime,
} from "@/lib/utils";
import {
  useTasks,
  useProjectsLite,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  type Task,
  type TaskInput,
} from "@/lib/hooks/use-tasks";
import type { TaskStatus, Priority } from "@/lib/supabase/database.types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_OPTIONS = [
  "All",
  "TODO",
  "IN_PROGRESS",
  "REVIEW",
  "DONE",
  "CANCELLED",
] as const;

const PRIORITY_OPTIONS = ["All", "LOW", "MEDIUM", "HIGH", "URGENT"] as const;

const KANBAN_COLUMNS: { key: Task["status"]; label: string; color: string }[] =
  [
    { key: "TODO", label: "To Do", color: "border-t-gray-400" },
    { key: "IN_PROGRESS", label: "In Progress", color: "border-t-blue-500" },
    { key: "REVIEW", label: "In Review", color: "border-t-yellow-500" },
    { key: "DONE", label: "Done", color: "border-t-green-500" },
    { key: "CANCELLED", label: "Cancelled", color: "border-t-red-500" },
  ];

type TaskFormData = {
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  due_date: string;
  project_id: string;
};

const emptyForm: TaskFormData = {
  title: "",
  description: "",
  status: "TODO",
  priority: "MEDIUM",
  due_date: "",
  project_id: "",
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

function isOverdue(dueDate: string | null, status: string): boolean {
  if (!dueDate) return false;
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

function shortId(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TasksPage() {
  const { data: tasks = [], isLoading, isError, error } = useTasks();
  const { data: projects = [] } = useProjectsLite();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  // View mode
  const [viewMode, setViewMode] = useState<"table" | "board">("table");

  // Filters
  const [projectFilter, setProjectFilter] = useState("All Tasks");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal + edit state
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [formData, setFormData] = useState<TaskFormData>(emptyForm);

  // Lookup: project id -> name
  const projectName = useMemo(() => {
    const m = new Map<string, string>();
    projects.forEach((p) => m.set(p.id, p.name));
    return (id: string | null) => (id ? m.get(id) ?? "—" : "No project");
  }, [projects]);

  // Filtering logic
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (projectFilter !== "All Tasks" && task.project_id !== projectFilter)
        return false;
      if (statusFilter !== "All" && task.status !== statusFilter) return false;
      if (priorityFilter !== "All" && task.priority !== priorityFilter)
        return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const searchable = [
          task.id,
          task.title,
          task.description ?? "",
          projectName(task.project_id),
        ]
          .join(" ")
          .toLowerCase();
        if (!searchable.includes(q)) return false;
      }
      return true;
    });
  }, [tasks, projectFilter, statusFilter, priorityFilter, searchQuery, projectName]);

  // KPI calculations (derived from real data)
  const kpiStats = useMemo(() => {
    const total = tasks.length;
    const inProgress = tasks.filter((t) => t.status === "IN_PROGRESS").length;
    const completed = tasks.filter((t) => t.status === "DONE").length;
    const overdue = tasks.filter((t) => isOverdue(t.due_date, t.status)).length;
    return { total, inProgress, completed, overdue };
  }, [tasks]);

  // Handlers
  function handleFormChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function closeModal() {
    setShowModal(false);
    setEditingTask(null);
    setFormData(emptyForm);
  }

  function openCreate() {
    setEditingTask(null);
    setFormData(emptyForm);
    setShowModal(true);
  }

  function openEdit(task: Task) {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description ?? "",
      status: task.status,
      priority: task.priority,
      due_date: task.due_date ?? "",
      project_id: task.project_id ?? "",
    });
    setSelectedTask(null);
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: TaskInput = {
      title: formData.title,
      description: formData.description || null,
      status: formData.status,
      priority: formData.priority,
      due_date: formData.due_date || null,
      project_id: formData.project_id || null,
      // assignee_id: left unset — no members hook available yet (TODO)
    };
    try {
      if (editingTask) {
        await updateTask.mutateAsync({ id: editingTask.id, ...payload });
      } else {
        await createTask.mutateAsync(payload);
      }
      closeModal();
    } catch {
      // error toast handled in the hook
    }
  }

  async function handleDelete(task: Task) {
    if (!window.confirm(`Delete "${task.title}"? This cannot be undone.`))
      return;
    try {
      await deleteTask.mutateAsync(task.id);
      setSelectedTask(null);
    } catch {
      // handled in hook
    }
  }

  async function handleMarkDone(task: Task) {
    try {
      await updateTask.mutateAsync({
        id: task.id,
        status: "DONE",
        completed_at: new Date().toISOString(),
      });
      setSelectedTask(null);
    } catch {
      // handled in hook
    }
  }

  const isSaving = createTask.isPending || updateTask.isPending;

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
            onClick={openCreate}
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
                  {isLoading ? "—" : kpiStats.total}
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
                  {isLoading ? "—" : kpiStats.inProgress}
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
                  {isLoading ? "—" : kpiStats.completed}
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
                  {isLoading ? "—" : kpiStats.overdue}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ---- Project Tabs ---- */}
        <div className="mb-6 flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setProjectFilter("All Tasks")}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                projectFilter === "All Tasks"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              All Tasks
            </button>
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => setProjectFilter(project.id)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  projectFilter === project.id
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                {project.name}
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
                  placeholder="Search tasks, projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-700 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ---- States ---- */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white py-16 shadow-sm">
            <Loader2 className="mb-3 h-8 w-8 animate-spin text-blue-500" />
            <p className="text-sm text-gray-500">Loading tasks…</p>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 py-16 shadow-sm">
            <p className="text-lg font-medium text-red-700">
              Failed to load tasks
            </p>
            <p className="mt-1 text-sm text-red-500">
              {(error as Error)?.message ?? "Please try again."}
            </p>
          </div>
        ) : (
          <>
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
                            colSpan={7}
                            className="px-4 py-12 text-center text-gray-400"
                          >
                            <ListTodo className="mx-auto mb-3 h-8 w-8 text-gray-300" />
                            <p className="text-sm font-medium">No tasks found</p>
                            <p className="mt-1 text-xs">
                              {tasks.length === 0
                                ? "Create your first task to get started."
                                : "Try adjusting your filters or search query."}
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
                                className="cursor-pointer font-mono text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline"
                              >
                                {shortId(task.id)}
                              </button>
                            </td>

                            {/* Title */}
                            <td className="max-w-[260px] px-4 py-3">
                              <div className="truncate font-medium text-gray-800">
                                {task.title}
                              </div>
                              {task.description && (
                                <div className="mt-0.5 truncate text-xs text-gray-400">
                                  {task.description}
                                </div>
                              )}
                            </td>

                            {/* Project */}
                            <td className="whitespace-nowrap px-4 py-3">
                              <div className="flex items-center gap-1.5">
                                <FolderKanban className="h-3.5 w-3.5 text-gray-400" />
                                <span className="text-gray-700">
                                  {projectName(task.project_id)}
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
                              {task.due_date ? (
                                <>
                                  <span
                                    className={cn(
                                      "text-gray-600",
                                      isOverdue(task.due_date, task.status) &&
                                        "font-medium text-red-600"
                                    )}
                                  >
                                    {formatDate(task.due_date)}
                                  </span>
                                  {isOverdue(task.due_date, task.status) && (
                                    <span className="ml-1.5 inline-flex items-center rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-700">
                                      Overdue
                                    </span>
                                  )}
                                </>
                              ) : (
                                <span className="text-gray-400">—</span>
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
                                  onClick={() => openEdit(task)}
                                  className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-amber-600"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  title="Delete"
                                  onClick={() => handleDelete(task)}
                                  className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
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
                      {filteredTasks.length}
                    </span>{" "}
                    of{" "}
                    <span className="font-medium text-gray-700">
                      {tasks.length}
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
                            <p className="text-xs text-gray-400">No tasks</p>
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
                                  <Flag
                                    className={cn(
                                      "h-2.5 w-2.5",
                                      getPriorityIcon(task.priority)
                                    )}
                                  />
                                  {formatLabel(task.priority)}
                                </span>
                                <span className="font-mono text-[10px] font-medium text-gray-400">
                                  {shortId(task.id)}
                                </span>
                              </div>

                              {/* Title */}
                              <h4 className="mb-1.5 text-sm font-medium leading-snug text-gray-900">
                                {task.title}
                              </h4>

                              {/* Project */}
                              <div className="mb-3 flex items-center gap-1 text-xs text-gray-400">
                                <FolderKanban className="h-3 w-3" />
                                {projectName(task.project_id)}
                              </div>

                              {/* Card bottom: due date */}
                              <div className="flex items-center justify-end">
                                <div
                                  className={cn(
                                    "flex items-center gap-1 text-xs",
                                    isOverdue(task.due_date, task.status)
                                      ? "font-medium text-red-600"
                                      : "text-gray-400"
                                  )}
                                >
                                  <Calendar className="h-3 w-3" />
                                  {task.due_date
                                    ? formatDate(task.due_date)
                                    : "No due date"}
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
          </>
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
                <span className="rounded-lg bg-blue-50 px-2.5 py-1 font-mono text-sm font-bold text-blue-700">
                  {shortId(selectedTask.id)}
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
                  {selectedTask.is_recurring && (
                    <span className="inline-flex items-center rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-medium text-purple-700">
                      Recurring
                    </span>
                  )}
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
                {selectedTask.description ?? "No description provided."}
              </p>

              {/* Metadata grid */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Project */}
                <div className="rounded-lg bg-gray-50 p-3.5">
                  <p className="mb-1 text-xs font-medium text-gray-500">
                    Project
                  </p>
                  <div className="flex items-center gap-2">
                    <FolderKanban className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-800">
                      {projectName(selectedTask.project_id)}
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
                        isOverdue(selectedTask.due_date, selectedTask.status)
                          ? "text-red-600"
                          : "text-gray-800"
                      )}
                    >
                      {selectedTask.due_date
                        ? formatDate(selectedTask.due_date)
                        : "—"}
                      {isOverdue(
                        selectedTask.due_date,
                        selectedTask.status
                      ) && (
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
                      {formatDateTime(selectedTask.created_at)}
                    </span>
                  </div>
                </div>

                {/* Completed */}
                {selectedTask.completed_at && (
                  <div className="rounded-lg bg-gray-50 p-3.5">
                    <p className="mb-1 text-xs font-medium text-gray-500">
                      Completed
                    </p>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium text-gray-800">
                        {formatDateTime(selectedTask.completed_at)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
              <button
                onClick={() => handleDelete(selectedTask)}
                className="mr-auto inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 shadow-sm transition-colors hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
              {selectedTask.status !== "DONE" && (
                <button
                  onClick={() => handleMarkDone(selectedTask)}
                  disabled={updateTask.isPending}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-green-200 bg-white px-4 py-2 text-sm font-medium text-green-700 shadow-sm transition-colors hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Mark Done
                </button>
              )}
              <button
                onClick={() => openEdit(selectedTask)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- New / Edit Task Modal ---- */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeModal}
          />

          {/* Modal content */}
          <div className="relative mx-4 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {editingTask ? "Edit Task" : "New Task"}
                </h2>
                <p className="text-sm text-gray-500">
                  {editingTask
                    ? "Update the details below."
                    : "Fill in the details to create a new task."}
                </p>
              </div>
              <button
                onClick={closeModal}
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
                    Project
                  </label>
                  <div className="relative">
                    <select
                      name="project_id"
                      value={formData.project_id}
                      onChange={handleFormChange}
                      className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2 pr-9 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">No project</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>

                {/* Due Date */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Due Date
                  </label>
                  <input
                    type="date"
                    name="due_date"
                    value={formData.due_date}
                    onChange={handleFormChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Form Actions */}
              <div className="mt-6 flex items-center justify-end gap-3 border-t border-gray-200 pt-5">
                <button
                  type="button"
                  onClick={closeModal}
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
                  {editingTask ? "Save Changes" : "Create Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
