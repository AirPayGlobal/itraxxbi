"use client";

import { useState, useMemo, useRef } from "react";
import {
  FolderKanban,
  Plus,
  Search,
  X,
  Clock,
  CheckCircle2,
  Users,
  Calendar,
  ChevronLeft,
  ChevronRight,
  GanttChart,
  LayoutList,
  Pencil,
  Trash2,
  Loader2,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import {
  useProjects,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  type Project,
  type ProjectInput,
} from "@/lib/hooks/use-projects";
import { useTasks, type Task } from "@/lib/hooks/use-tasks";
import type { ProjectStatus, TaskStatus } from "@/lib/supabase/database.types";

// ---------------------------------------------------------------------------
// Derived task view (a task belonging to a project, adapted for the timeline)
// ---------------------------------------------------------------------------

interface ProjectTask {
  id: string;
  title: string;
  status: TaskStatus;
  startDate: string;
  endDate: string;
  progress: number;
}

const statusFilters = ["All", "Planning", "Active", "On Hold", "Completed", "Archived"] as const;

const emptyForm: ProjectInput = {
  name: "",
  description: "",
  status: "ACTIVE",
  start_date: "",
  end_date: "",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getProjectStatusColor(status: ProjectStatus): string {
  const map: Record<ProjectStatus, string> = {
    PLANNING: "bg-purple-100 text-purple-800",
    ACTIVE: "bg-blue-100 text-blue-800",
    ON_HOLD: "bg-yellow-100 text-yellow-800",
    COMPLETED: "bg-green-100 text-green-800",
    ARCHIVED: "bg-gray-100 text-gray-800",
  };
  return map[status];
}

function taskProgress(status: TaskStatus): number {
  switch (status) {
    case "DONE":
      return 100;
    case "REVIEW":
      return 75;
    case "IN_PROGRESS":
      return 50;
    default:
      return 0;
  }
}

function getTaskBarColor(status: TaskStatus): string {
  const map: Record<TaskStatus, string> = {
    TODO: "bg-gray-300",
    IN_PROGRESS: "bg-blue-500",
    REVIEW: "bg-yellow-500",
    DONE: "bg-green-500",
    CANCELLED: "bg-rose-300",
  };
  return map[status];
}

function formatStatusLabel(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function daysBetween(a: string, b: string): number {
  return Math.ceil(
    (new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24)
  );
}

function isoDay(d: string | Date): string {
  return new Date(d).toISOString().split("T")[0];
}

// Adapt a real Task row into the timeline shape, guarding missing dates.
function toProjectTask(task: Task): ProjectTask {
  const start = task.start_date ?? task.created_at;
  const end = task.due_date ?? task.start_date ?? task.created_at;
  return {
    id: task.id,
    title: task.title,
    status: task.status,
    startDate: isoDay(start),
    endDate: isoDay(end),
    progress: taskProgress(task.status),
  };
}

// A project's effective timeline: explicit dates, else derived from its tasks.
function projectRange(
  project: Project,
  tasks: ProjectTask[]
): { start: string; end: string } {
  if (project.start_date && project.end_date) {
    return { start: isoDay(project.start_date), end: isoDay(project.end_date) };
  }
  if (tasks.length > 0) {
    const starts = tasks.map((t) => new Date(t.startDate).getTime());
    const ends = tasks.map((t) => new Date(t.endDate).getTime());
    return {
      start: isoDay(new Date(Math.min(...starts))),
      end: isoDay(new Date(Math.max(...ends))),
    };
  }
  const base = isoDay(project.created_at);
  return { start: base, end: base };
}

function projectProgress(tasks: ProjectTask[]): number {
  if (tasks.length === 0) return 0;
  return Math.round(
    tasks.reduce((sum, t) => sum + t.progress, 0) / tasks.length
  );
}

// ---------------------------------------------------------------------------
// Gantt Chart
// ---------------------------------------------------------------------------

function GanttChartView({
  tasks,
  range,
}: {
  tasks: ProjectTask[];
  range: { start: string; end: string };
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (tasks.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-gray-400">
        No tasks linked to this project yet.
      </p>
    );
  }

  const projectStart = new Date(range.start);
  const projectEnd = new Date(range.end);
  const totalDays = Math.max(daysBetween(range.start, range.end) + 1, 1);

  const months: { label: string; days: number; offset: number }[] = [];
  const cursor = new Date(projectStart);
  cursor.setDate(1);
  while (cursor <= projectEnd) {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);
    const visibleStart = monthStart < projectStart ? projectStart : monthStart;
    const visibleEnd = monthEnd > projectEnd ? projectEnd : monthEnd;
    const offset = daysBetween(range.start, isoDay(visibleStart));
    const days = daysBetween(isoDay(visibleStart), isoDay(visibleEnd)) + 1;
    months.push({
      label: visibleStart.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      }),
      days,
      offset,
    });
    cursor.setMonth(cursor.getMonth() + 1);
    cursor.setDate(1);
  }

  const DAY_WIDTH = 8;
  const chartWidth = totalDays * DAY_WIDTH;
  const todayOffset = daysBetween(range.start, isoDay(new Date()));
  const showToday = todayOffset >= 0 && todayOffset <= totalDays;

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <div className="flex">
        <div className="w-56 flex-shrink-0 border-r border-gray-200 bg-gray-50">
          <div className="h-10 border-b border-gray-200 px-3 py-2">
            <span className="text-xs font-semibold uppercase text-gray-500">
              Task
            </span>
          </div>
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex h-10 items-center border-b border-gray-100 px-3"
            >
              <span className="truncate text-xs text-gray-700">
                {task.title}
              </span>
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-x-auto" ref={scrollRef}>
          <div style={{ width: chartWidth, minWidth: "100%" }}>
            <div className="flex h-10 border-b border-gray-200">
              {months.map((m, i) => (
                <div
                  key={i}
                  className="flex items-center justify-center border-r border-gray-100 text-xs font-medium text-gray-500"
                  style={{ width: m.days * DAY_WIDTH }}
                >
                  {m.days * DAY_WIDTH > 40 ? m.label : ""}
                </div>
              ))}
            </div>

            <div className="relative">
              {showToday && (
                <div
                  className="absolute bottom-0 top-0 z-10 w-0.5 bg-red-400"
                  style={{ left: todayOffset * DAY_WIDTH }}
                />
              )}

              {tasks.map((task) => {
                const taskStart = daysBetween(range.start, task.startDate);
                const taskDuration = daysBetween(task.startDate, task.endDate) + 1;
                const barLeft = Math.max(0, taskStart) * DAY_WIDTH;
                const barWidth = Math.max(taskDuration * DAY_WIDTH, 12);

                return (
                  <div
                    key={task.id}
                    className="relative flex h-10 items-center border-b border-gray-50"
                  >
                    <div
                      className="absolute h-5 rounded-full bg-gray-100"
                      style={{ left: barLeft, width: barWidth }}
                    />
                    <div
                      className={cn(
                        "absolute h-5 rounded-full transition-all",
                        getTaskBarColor(task.status)
                      )}
                      style={{ left: barLeft, width: barWidth * (task.progress / 100) }}
                    />
                    {barWidth > 60 && (
                      <span
                        className="absolute text-[10px] font-medium text-white mix-blend-difference"
                        style={{ left: barLeft + 6, lineHeight: "40px" }}
                      >
                        {task.progress}%
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 border-t border-gray-200 bg-gray-50 px-4 py-2">
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <div className="h-2.5 w-2.5 rounded-full bg-gray-300" /> Not Started
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <div className="h-2.5 w-2.5 rounded-full bg-blue-500" /> In Progress
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <div className="h-2.5 w-2.5 rounded-full bg-yellow-500" /> In Review
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <div className="h-2.5 w-2.5 rounded-full bg-green-500" /> Done
        </div>
        {showToday && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <div className="h-2.5 w-0.5 bg-red-400" /> Today
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ProjectsPage() {
  const { data: projects = [], isLoading, isError, error } = useProjects();
  const { data: allTasks = [] } = useTasks();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();

  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "gantt">("gantt");
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ProjectInput>(emptyForm);

  // Group tasks by project once.
  const tasksByProject = useMemo(() => {
    const map = new Map<string, ProjectTask[]>();
    for (const t of allTasks) {
      if (!t.project_id) continue;
      const list = map.get(t.project_id) ?? [];
      list.push(toProjectTask(t));
      map.set(t.project_id, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.startDate.localeCompare(b.startDate));
    }
    return map;
  }, [allTasks]);

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const filterMap: Record<string, string> = {
        All: "All",
        Planning: "PLANNING",
        Active: "ACTIVE",
        "On Hold": "ON_HOLD",
        Completed: "COMPLETED",
        Archived: "ARCHIVED",
      };
      const matchesStatus =
        statusFilter === "All" || p.status === filterMap[statusFilter];
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        query === "" ||
        p.name.toLowerCase().includes(query) ||
        (p.description ?? "").toLowerCase().includes(query);
      return matchesStatus && matchesSearch;
    });
  }, [projects, statusFilter, searchQuery]);

  const stats = useMemo(
    () => [
      {
        label: "Total Projects",
        value: String(projects.length),
        icon: FolderKanban,
        color: "text-blue-600 bg-blue-50",
      },
      {
        label: "Active",
        value: String(projects.filter((p) => p.status === "ACTIVE").length),
        icon: Clock,
        color: "text-emerald-600 bg-emerald-50",
      },
      {
        label: "Completed",
        value: String(projects.filter((p) => p.status === "COMPLETED").length),
        icon: CheckCircle2,
        color: "text-green-600 bg-green-50",
      },
      {
        label: "Linked Tasks",
        value: String(allTasks.filter((t) => t.project_id).length),
        icon: Users,
        color: "text-purple-600 bg-purple-50",
      },
    ],
    [projects, allTasks]
  );

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

  function openEdit(project: Project) {
    setEditingId(project.id);
    setFormData({
      name: project.name,
      description: project.description ?? "",
      status: project.status,
      start_date: project.start_date ? isoDay(project.start_date) : "",
      end_date: project.end_date ? isoDay(project.end_date) : "",
    });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (
      formData.start_date &&
      formData.end_date &&
      new Date(formData.end_date) < new Date(formData.start_date)
    ) {
      const { toast } = await import("sonner");
      toast.error("End date cannot be before the start date.");
      return;
    }
    const payload: ProjectInput = {
      ...formData,
      description: formData.description || null,
      start_date: formData.start_date || null,
      end_date: formData.end_date || null,
    };
    try {
      if (editingId) {
        await updateProject.mutateAsync({ id: editingId, ...payload });
      } else {
        await createProject.mutateAsync(payload);
      }
      setShowModal(false);
      setFormData(emptyForm);
      setEditingId(null);
    } catch {
      /* toast handled in hook */
    }
  }

  async function handleDelete(project: Project) {
    if (!window.confirm(`Delete "${project.name}"? This cannot be undone.`))
      return;
    try {
      await deleteProject.mutateAsync(project.id);
    } catch {
      /* handled in hook */
    }
  }

  const isSaving = createProject.isPending || updateProject.isPending;

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage team projects with timeline tracking and Gantt views
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <Plus className="h-4 w-4" />
          New Project
        </button>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{stat.label}</p>
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

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
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
          <div className="ml-2 flex items-center rounded-lg border border-gray-200">
            <button
              onClick={() => setViewMode("gantt")}
              className={cn(
                "rounded-l-lg p-2 transition-colors",
                viewMode === "gantt"
                  ? "bg-blue-50 text-blue-600"
                  : "text-gray-400 hover:text-gray-600"
              )}
              title="Gantt view"
            >
              <GanttChart className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "rounded-r-lg p-2 transition-colors",
                viewMode === "list"
                  ? "bg-blue-50 text-blue-600"
                  : "text-gray-400 hover:text-gray-600"
              )}
              title="List view"
            >
              <LayoutList className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search projects..."
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
          <p className="text-sm text-gray-500">Loading projects…</p>
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 py-16 shadow-sm">
          <p className="text-lg font-medium text-red-700">
            Failed to load projects
          </p>
          <p className="mt-1 text-sm text-red-500">
            {(error as Error)?.message ?? "Please try again."}
          </p>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white py-16 shadow-sm">
          <FolderKanban className="mb-3 h-12 w-12 text-gray-300" />
          <p className="text-lg font-medium text-gray-500">No projects found</p>
          <p className="mt-1 text-sm text-gray-400">
            {projects.length === 0
              ? "Create your first project to get started"
              : "Try adjusting your filters or search query"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredProjects.map((project) => {
            const tasks = tasksByProject.get(project.id) ?? [];
            const range = projectRange(project, tasks);
            const progress = projectProgress(tasks);
            const isExpanded = expandedProject === project.id;
            const doneTasks = tasks.filter((t) => t.status === "DONE").length;

            return (
              <div
                key={project.id}
                className="rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-lg font-semibold text-gray-900">
                        {project.name}
                      </h3>
                      {project.description && (
                        <p className="mt-1 line-clamp-1 text-sm text-gray-500">
                          {project.description}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {project.start_date
                            ? formatDate(project.start_date)
                            : "—"}{" "}
                          —{" "}
                          {project.end_date ? formatDate(project.end_date) : "—"}
                        </span>
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {doneTasks}/{tasks.length} tasks
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                          getProjectStatusColor(project.status)
                        )}
                      >
                        {formatStatusLabel(project.status)}
                      </span>
                      <button
                        onClick={() => openEdit(project)}
                        className="rounded-lg border border-gray-300 bg-white p-1.5 text-gray-600 transition-colors hover:bg-gray-50"
                        aria-label={`Edit ${project.name}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(project)}
                        className="rounded-lg border border-red-200 bg-white p-1.5 text-red-600 transition-colors hover:bg-red-50"
                        aria-label={`Delete ${project.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-gray-500">Overall progress</span>
                      <span className="font-medium text-gray-700">
                        {progress}%
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          project.status === "COMPLETED"
                            ? "bg-green-500"
                            : "bg-blue-500"
                        )}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-100">
                  <button
                    onClick={() =>
                      setExpandedProject(isExpanded ? null : project.id)
                    }
                    className="flex w-full items-center justify-center gap-1.5 px-5 py-2.5 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
                  >
                    {isExpanded ? "Hide" : "Show"}{" "}
                    {viewMode === "gantt" ? "Gantt Chart" : "Tasks"}
                    {isExpanded ? (
                      <ChevronLeft className="h-4 w-4 rotate-90" />
                    ) : (
                      <ChevronRight className="h-4 w-4 rotate-90" />
                    )}
                  </button>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100 p-5">
                    {viewMode === "gantt" ? (
                      <GanttChartView tasks={tasks} range={range} />
                    ) : tasks.length === 0 ? (
                      <p className="py-6 text-center text-sm text-gray-400">
                        No tasks linked to this project yet.
                      </p>
                    ) : (
                      <div className="overflow-hidden rounded-lg border border-gray-200">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
                              <th className="px-4 py-2.5">Task</th>
                              <th className="px-4 py-2.5">Status</th>
                              <th className="px-4 py-2.5">Timeline</th>
                              <th className="px-4 py-2.5 text-right">Progress</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {tasks.map((task) => (
                              <tr key={task.id} className="hover:bg-gray-50">
                                <td className="px-4 py-2.5 font-medium text-gray-900">
                                  {task.title}
                                </td>
                                <td className="px-4 py-2.5">
                                  <span
                                    className={cn(
                                      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                                      task.status === "DONE"
                                        ? "bg-green-100 text-green-800"
                                        : task.status === "IN_PROGRESS"
                                        ? "bg-blue-100 text-blue-800"
                                        : task.status === "REVIEW"
                                        ? "bg-yellow-100 text-yellow-800"
                                        : "bg-gray-100 text-gray-800"
                                    )}
                                  >
                                    {formatStatusLabel(task.status)}
                                  </span>
                                </td>
                                <td className="px-4 py-2.5 text-gray-500">
                                  {formatDate(task.startDate)} —{" "}
                                  {formatDate(task.endDate)}
                                </td>
                                <td className="px-4 py-2.5 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-100">
                                      <div
                                        className={cn(
                                          "h-full rounded-full",
                                          getTaskBarColor(task.status)
                                        )}
                                        style={{ width: `${task.progress}%` }}
                                      />
                                    </div>
                                    <span className="text-xs font-medium text-gray-600">
                                      {task.progress}%
                                    </span>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* New/Edit Project Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingId ? "Edit Project" : "New Project"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="max-h-[65vh] space-y-4 overflow-y-auto px-6 py-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Project Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleFormChange}
                    placeholder="e.g. Fleet Tracker V3 Rollout"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    name="description"
                    rows={3}
                    value={formData.description ?? ""}
                    onChange={handleFormChange}
                    placeholder="Brief project description..."
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
                        "PLANNING",
                        "ACTIVE",
                        "ON_HOLD",
                        "COMPLETED",
                        "ARCHIVED",
                      ] as ProjectStatus[]
                    ).map((s) => (
                      <option key={s} value={s}>
                        {formatStatusLabel(s)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Start Date
                    </label>
                    <input
                      type="date"
                      name="start_date"
                      value={formData.start_date ?? ""}
                      onChange={handleFormChange}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      End Date
                    </label>
                    <input
                      type="date"
                      name="end_date"
                      value={formData.end_date ?? ""}
                      onChange={handleFormChange}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
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
                  {editingId ? "Save Changes" : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
