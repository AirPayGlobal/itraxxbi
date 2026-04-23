"use client";

import { useState, useMemo, useRef } from "react";
import {
  FolderKanban,
  Plus,
  Search,
  X,
  Clock,
  CheckCircle2,
  AlertCircle,
  Users,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Eye,
  Building2,
  Flag,
  GanttChart,
  LayoutList,
} from "lucide-react";
import { cn, formatDate, getStatusColor } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ProjectStatus = "PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "ARCHIVED";
type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
type TaskStatus = "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";

interface ProjectTask {
  id: string;
  title: string;
  assignee: string;
  status: TaskStatus;
  startDate: string;
  endDate: string;
  progress: number;
  dependencies?: string[];
}

interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  priority: Priority;
  owner: string;
  team: string[];
  startDate: string;
  endDate: string;
  tasks: ProjectTask[];
}

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const TEAM_MEMBERS = [
  "John Mutua",
  "James Shilongo",
  "Peter Angula",
  "Sarah Peters",
  "Lisa Amupolo",
  "David Kapere",
];

const mockProjects: Project[] = [
  {
    id: "PRJ-001",
    name: "Fleet Tracker V3 Rollout",
    description: "Upgrade all Gen-2 tracker hardware to V3 units with LTE connectivity across the full client base.",
    status: "ACTIVE",
    priority: "HIGH",
    owner: "John Mutua",
    team: ["John Mutua", "James Shilongo", "David Kapere"],
    startDate: "2026-03-01",
    endDate: "2026-06-30",
    tasks: [
      { id: "T1", title: "Procure V3 hardware units", assignee: "John Mutua", status: "DONE", startDate: "2026-03-01", endDate: "2026-03-14", progress: 100 },
      { id: "T2", title: "Firmware development & QA", assignee: "David Kapere", status: "DONE", startDate: "2026-03-10", endDate: "2026-03-31", progress: 100 },
      { id: "T3", title: "Pilot deployment — NBL fleet", assignee: "James Shilongo", status: "IN_PROGRESS", startDate: "2026-04-01", endDate: "2026-04-18", progress: 65, dependencies: ["T2"] },
      { id: "T4", title: "Full rollout — Phase 1 clients", assignee: "John Mutua", status: "TODO", startDate: "2026-04-21", endDate: "2026-05-23", progress: 0, dependencies: ["T3"] },
      { id: "T5", title: "Full rollout — Phase 2 clients", assignee: "James Shilongo", status: "TODO", startDate: "2026-05-25", endDate: "2026-06-20", progress: 0, dependencies: ["T4"] },
      { id: "T6", title: "Post-rollout monitoring & report", assignee: "David Kapere", status: "TODO", startDate: "2026-06-21", endDate: "2026-06-30", progress: 0, dependencies: ["T5"] },
    ],
  },
  {
    id: "PRJ-002",
    name: "MeatCo Cold-Chain Monitoring",
    description: "Implement temperature monitoring and cold-chain compliance for MeatCo refrigerated fleet.",
    status: "ACTIVE",
    priority: "URGENT",
    owner: "Sarah Peters",
    team: ["Sarah Peters", "James Shilongo", "Lisa Amupolo"],
    startDate: "2026-03-15",
    endDate: "2026-05-31",
    tasks: [
      { id: "T1", title: "Requirements & sensor selection", assignee: "Sarah Peters", status: "DONE", startDate: "2026-03-15", endDate: "2026-03-25", progress: 100 },
      { id: "T2", title: "Dashboard integration design", assignee: "Lisa Amupolo", status: "DONE", startDate: "2026-03-20", endDate: "2026-04-05", progress: 100 },
      { id: "T3", title: "Sensor installation — 14 trucks", assignee: "James Shilongo", status: "IN_PROGRESS", startDate: "2026-04-01", endDate: "2026-04-25", progress: 50, dependencies: ["T1"] },
      { id: "T4", title: "Alert rules & compliance config", assignee: "Sarah Peters", status: "TODO", startDate: "2026-04-20", endDate: "2026-05-10", progress: 0, dependencies: ["T2"] },
      { id: "T5", title: "Staff training & handover", assignee: "Lisa Amupolo", status: "TODO", startDate: "2026-05-12", endDate: "2026-05-25", progress: 0, dependencies: ["T3", "T4"] },
      { id: "T6", title: "Go-live & 1-week monitoring", assignee: "Sarah Peters", status: "TODO", startDate: "2026-05-25", endDate: "2026-05-31", progress: 0, dependencies: ["T5"] },
    ],
  },
  {
    id: "PRJ-003",
    name: "BI Dashboard Redesign",
    description: "Modernize the internal BI dashboard with new KPIs, improved charting, and mobile responsiveness.",
    status: "PLANNING",
    priority: "MEDIUM",
    owner: "David Kapere",
    team: ["David Kapere", "Lisa Amupolo"],
    startDate: "2026-05-01",
    endDate: "2026-07-31",
    tasks: [
      { id: "T1", title: "Stakeholder interviews & wireframes", assignee: "Lisa Amupolo", status: "TODO", startDate: "2026-05-01", endDate: "2026-05-16", progress: 0 },
      { id: "T2", title: "UI/UX design & prototyping", assignee: "David Kapere", status: "TODO", startDate: "2026-05-12", endDate: "2026-06-06", progress: 0, dependencies: ["T1"] },
      { id: "T3", title: "Frontend development", assignee: "David Kapere", status: "TODO", startDate: "2026-06-09", endDate: "2026-07-04", progress: 0, dependencies: ["T2"] },
      { id: "T4", title: "Data pipeline integration", assignee: "Lisa Amupolo", status: "TODO", startDate: "2026-06-23", endDate: "2026-07-18", progress: 0, dependencies: ["T3"] },
      { id: "T5", title: "QA testing & launch", assignee: "David Kapere", status: "TODO", startDate: "2026-07-21", endDate: "2026-07-31", progress: 0, dependencies: ["T4"] },
    ],
  },
  {
    id: "PRJ-004",
    name: "TransNamib Annual Maintenance Audit",
    description: "Complete annual fleet maintenance audit for TransNamib — 45 vehicles across 3 depots.",
    status: "COMPLETED",
    priority: "HIGH",
    owner: "Peter Angula",
    team: ["Peter Angula", "John Mutua", "James Shilongo"],
    startDate: "2026-01-06",
    endDate: "2026-03-14",
    tasks: [
      { id: "T1", title: "Audit schedule & team allocation", assignee: "Peter Angula", status: "DONE", startDate: "2026-01-06", endDate: "2026-01-17", progress: 100 },
      { id: "T2", title: "Windhoek depot inspection", assignee: "John Mutua", status: "DONE", startDate: "2026-01-20", endDate: "2026-02-07", progress: 100, dependencies: ["T1"] },
      { id: "T3", title: "Walvis Bay depot inspection", assignee: "James Shilongo", status: "DONE", startDate: "2026-02-03", endDate: "2026-02-21", progress: 100, dependencies: ["T1"] },
      { id: "T4", title: "Oshakati depot inspection", assignee: "Peter Angula", status: "DONE", startDate: "2026-02-17", endDate: "2026-03-04", progress: 100, dependencies: ["T1"] },
      { id: "T5", title: "Compliance report & recommendations", assignee: "Peter Angula", status: "DONE", startDate: "2026-03-05", endDate: "2026-03-14", progress: 100, dependencies: ["T2", "T3", "T4"] },
    ],
  },
  {
    id: "PRJ-005",
    name: "Driver Behaviour Analytics Module",
    description: "Build a driver scoring and behaviour analytics module using GPS acceleration, braking, and speeding data.",
    status: "ON_HOLD",
    priority: "LOW",
    owner: "Lisa Amupolo",
    team: ["Lisa Amupolo", "David Kapere"],
    startDate: "2026-04-01",
    endDate: "2026-06-30",
    tasks: [
      { id: "T1", title: "Data model & scoring algorithm", assignee: "Lisa Amupolo", status: "IN_PROGRESS", startDate: "2026-04-01", endDate: "2026-04-18", progress: 40 },
      { id: "T2", title: "Backend API development", assignee: "David Kapere", status: "TODO", startDate: "2026-04-21", endDate: "2026-05-16", progress: 0, dependencies: ["T1"] },
      { id: "T3", title: "Dashboard UI components", assignee: "David Kapere", status: "TODO", startDate: "2026-05-11", endDate: "2026-06-06", progress: 0, dependencies: ["T2"] },
      { id: "T4", title: "Client pilot & feedback", assignee: "Lisa Amupolo", status: "TODO", startDate: "2026-06-09", endDate: "2026-06-27", progress: 0, dependencies: ["T3"] },
    ],
  },
];

const statusFilters = ["All", "Planning", "Active", "On Hold", "Completed", "Archived"] as const;

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

function getPriorityColor(priority: Priority): string {
  const map: Record<Priority, string> = {
    LOW: "text-gray-500",
    MEDIUM: "text-blue-500",
    HIGH: "text-orange-500",
    URGENT: "text-red-500",
  };
  return map[priority];
}

function getTaskBarColor(status: TaskStatus): string {
  const map: Record<TaskStatus, string> = {
    TODO: "bg-gray-300",
    IN_PROGRESS: "bg-blue-500",
    REVIEW: "bg-yellow-500",
    DONE: "bg-green-500",
  };
  return map[status];
}

function getProjectProgress(project: Project): number {
  if (project.tasks.length === 0) return 0;
  const total = project.tasks.reduce((sum, t) => sum + t.progress, 0);
  return Math.round(total / project.tasks.length);
}

function formatStatusLabel(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function getAvatarColor(name: string): string {
  const colors = [
    "bg-blue-500", "bg-purple-500", "bg-emerald-500",
    "bg-amber-500", "bg-rose-500", "bg-cyan-500",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function daysBetween(a: string, b: string): number {
  return Math.ceil((new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24));
}

function addDays(date: string, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// ---------------------------------------------------------------------------
// Gantt Chart Component
// ---------------------------------------------------------------------------

function GanttChartView({ project }: { project: Project }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const projectStart = new Date(project.startDate);
  const projectEnd = new Date(project.endDate);
  const totalDays = daysBetween(project.startDate, project.endDate) + 1;

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
    const offset = daysBetween(project.startDate, visibleStart.toISOString().split("T")[0]);
    const days = daysBetween(visibleStart.toISOString().split("T")[0], visibleEnd.toISOString().split("T")[0]) + 1;
    months.push({
      label: visibleStart.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      days,
      offset,
    });
    cursor.setMonth(cursor.getMonth() + 1);
    cursor.setDate(1);
  }

  const DAY_WIDTH = 8;
  const chartWidth = totalDays * DAY_WIDTH;

  const todayOffset = daysBetween(project.startDate, new Date().toISOString().split("T")[0]);
  const showToday = todayOffset >= 0 && todayOffset <= totalDays;

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      {/* Task labels + Chart */}
      <div className="flex">
        {/* Left: Task names */}
        <div className="w-56 flex-shrink-0 border-r border-gray-200 bg-gray-50">
          <div className="h-10 border-b border-gray-200 px-3 py-2">
            <span className="text-xs font-semibold text-gray-500 uppercase">Task</span>
          </div>
          {project.tasks.map((task) => (
            <div
              key={task.id}
              className="flex h-10 items-center border-b border-gray-100 px-3"
            >
              <span className="truncate text-xs text-gray-700">{task.title}</span>
            </div>
          ))}
        </div>

        {/* Right: Gantt bars */}
        <div className="flex-1 overflow-x-auto" ref={scrollRef}>
          <div style={{ width: chartWidth, minWidth: "100%" }}>
            {/* Month headers */}
            <div className="flex h-10 border-b border-gray-200">
              {months.map((m, i) => (
                <div
                  key={i}
                  className="flex items-center justify-center border-r border-gray-100 text-xs font-medium text-gray-500"
                  style={{ width: m.days * DAY_WIDTH, marginLeft: i === 0 ? 0 : 0 }}
                >
                  {m.days * DAY_WIDTH > 40 ? m.label : ""}
                </div>
              ))}
            </div>

            {/* Task bars */}
            <div className="relative">
              {/* Today marker */}
              {showToday && (
                <div
                  className="absolute top-0 bottom-0 z-10 w-0.5 bg-red-400"
                  style={{ left: todayOffset * DAY_WIDTH }}
                />
              )}

              {project.tasks.map((task) => {
                const taskStart = daysBetween(project.startDate, task.startDate);
                const taskDuration = daysBetween(task.startDate, task.endDate) + 1;
                const barLeft = Math.max(0, taskStart) * DAY_WIDTH;
                const barWidth = Math.max(taskDuration * DAY_WIDTH, 12);

                return (
                  <div key={task.id} className="relative flex h-10 items-center border-b border-gray-50">
                    {/* Background bar */}
                    <div
                      className="absolute h-5 rounded-full bg-gray-100"
                      style={{ left: barLeft, width: barWidth }}
                    />
                    {/* Progress bar */}
                    <div
                      className={cn("absolute h-5 rounded-full transition-all", getTaskBarColor(task.status))}
                      style={{ left: barLeft, width: barWidth * (task.progress / 100) }}
                    />
                    {/* Label */}
                    {barWidth > 60 && (
                      <span
                        className="absolute text-[10px] font-medium text-white mix-blend-difference"
                        style={{ left: barLeft + 6, lineHeight: "40px" }}
                      >
                        {task.assignee.split(" ")[0]} — {task.progress}%
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
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
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "gantt">("gantt");
  const [expandedProject, setExpandedProject] = useState<string | null>(mockProjects[0].id);
  const [showNewModal, setShowNewModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    priority: "MEDIUM",
    owner: "",
    startDate: "",
    endDate: "",
  });

  const filteredProjects = useMemo(() => {
    return mockProjects.filter((p) => {
      const filterMap: Record<string, string> = {
        All: "All", Planning: "PLANNING", Active: "ACTIVE",
        "On Hold": "ON_HOLD", Completed: "COMPLETED", Archived: "ARCHIVED",
      };
      const matchesStatus = statusFilter === "All" || p.status === filterMap[statusFilter];
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        query === "" ||
        p.name.toLowerCase().includes(query) ||
        p.id.toLowerCase().includes(query) ||
        p.owner.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query);
      return matchesStatus && matchesSearch;
    });
  }, [statusFilter, searchQuery]);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowNewModal(false);
    setFormData({ name: "", description: "", priority: "MEDIUM", owner: "", startDate: "", endDate: "" });
  };

  const stats = [
    {
      label: "Total Projects",
      value: mockProjects.length.toString(),
      icon: FolderKanban,
      color: "text-blue-600 bg-blue-50",
    },
    {
      label: "Active",
      value: mockProjects.filter((p) => p.status === "ACTIVE").length.toString(),
      icon: Clock,
      color: "text-emerald-600 bg-emerald-50",
    },
    {
      label: "Completed",
      value: mockProjects.filter((p) => p.status === "COMPLETED").length.toString(),
      icon: CheckCircle2,
      color: "text-green-600 bg-green-50",
    },
    {
      label: "Team Members",
      value: TEAM_MEMBERS.length.toString(),
      icon: Users,
      color: "text-purple-600 bg-purple-50",
    },
  ];

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
          onClick={() => setShowNewModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <Plus className="h-4 w-4" />
          New Project
        </button>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">{stat.value}</p>
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
              className={cn("rounded-l-lg p-2 transition-colors", viewMode === "gantt" ? "bg-blue-50 text-blue-600" : "text-gray-400 hover:text-gray-600")}
              title="Gantt view"
            >
              <GanttChart className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn("rounded-r-lg p-2 transition-colors", viewMode === "list" ? "bg-blue-50 text-blue-600" : "text-gray-400 hover:text-gray-600")}
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

      {/* Empty State */}
      {filteredProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white py-16 shadow-sm">
          <FolderKanban className="mb-3 h-12 w-12 text-gray-300" />
          <p className="text-lg font-medium text-gray-500">No projects found</p>
          <p className="mt-1 text-sm text-gray-400">Try adjusting your filters or search query</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredProjects.map((project) => {
            const progress = getProjectProgress(project);
            const isExpanded = expandedProject === project.id;
            const doneTasks = project.tasks.filter((t) => t.status === "DONE").length;

            return (
              <div
                key={project.id}
                className="rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
              >
                {/* Project Header */}
                <div className="p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">{project.name}</h3>
                        <span className="text-xs font-mono text-gray-400">{project.id}</span>
                      </div>
                      <p className="mt-1 text-sm text-gray-500 line-clamp-1">{project.description}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Flag className={cn("h-3.5 w-3.5", getPriorityColor(project.priority))} />
                          {project.priority}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDate(project.startDate)} — {formatDate(project.endDate)}
                        </span>
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {doneTasks}/{project.tasks.length} tasks
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Team avatars */}
                      <div className="flex -space-x-2">
                        {project.team.slice(0, 4).map((member) => (
                          <div
                            key={member}
                            className={cn("flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white ring-2 ring-white", getAvatarColor(member))}
                            title={member}
                          >
                            {getInitials(member)}
                          </div>
                        ))}
                        {project.team.length > 4 && (
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-200 text-[10px] font-bold text-gray-600 ring-2 ring-white">
                            +{project.team.length - 4}
                          </div>
                        )}
                      </div>
                      <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", getProjectStatusColor(project.status))}>
                        {formatStatusLabel(project.status)}
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-4">
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-gray-500">Overall progress</span>
                      <span className="font-medium text-gray-700">{progress}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={cn("h-full rounded-full transition-all", project.status === "COMPLETED" ? "bg-green-500" : "bg-blue-500")}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Expand/Collapse */}
                <div className="border-t border-gray-100">
                  <button
                    onClick={() => setExpandedProject(isExpanded ? null : project.id)}
                    className="flex w-full items-center justify-center gap-1.5 px-5 py-2.5 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
                  >
                    {isExpanded ? (
                      <>Hide {viewMode === "gantt" ? "Gantt Chart" : "Tasks"}</>
                    ) : (
                      <>Show {viewMode === "gantt" ? "Gantt Chart" : "Tasks"}</>
                    )}
                    {isExpanded ? <ChevronLeft className="h-4 w-4 rotate-90" /> : <ChevronRight className="h-4 w-4 rotate-90" />}
                  </button>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-gray-100 p-5">
                    {viewMode === "gantt" ? (
                      <GanttChartView project={project} />
                    ) : (
                      <div className="overflow-hidden rounded-lg border border-gray-200">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
                              <th className="px-4 py-2.5">Task</th>
                              <th className="px-4 py-2.5">Assignee</th>
                              <th className="px-4 py-2.5">Status</th>
                              <th className="px-4 py-2.5">Timeline</th>
                              <th className="px-4 py-2.5 text-right">Progress</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {project.tasks.map((task) => (
                              <tr key={task.id} className="hover:bg-gray-50">
                                <td className="px-4 py-2.5 font-medium text-gray-900">{task.title}</td>
                                <td className="px-4 py-2.5">
                                  <div className="flex items-center gap-2">
                                    <div className={cn("flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-bold text-white", getAvatarColor(task.assignee))}>
                                      {getInitials(task.assignee)}
                                    </div>
                                    <span className="text-gray-600">{task.assignee}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-2.5">
                                  <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", getTaskBarColor(task.status).replace("bg-", "bg-").replace("500", "100"), task.status === "DONE" ? "text-green-800 bg-green-100" : task.status === "IN_PROGRESS" ? "text-blue-800 bg-blue-100" : task.status === "REVIEW" ? "text-yellow-800 bg-yellow-100" : "text-gray-800 bg-gray-100")}>
                                    {formatStatusLabel(task.status)}
                                  </span>
                                </td>
                                <td className="px-4 py-2.5 text-gray-500">
                                  {formatDate(task.startDate)} — {formatDate(task.endDate)}
                                </td>
                                <td className="px-4 py-2.5 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-100">
                                      <div className={cn("h-full rounded-full", getTaskBarColor(task.status))} style={{ width: `${task.progress}%` }} />
                                    </div>
                                    <span className="text-xs font-medium text-gray-600">{task.progress}%</span>
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

      {/* New Project Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">New Project</h2>
              <button onClick={() => setShowNewModal(false)} className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="max-h-[65vh] space-y-4 overflow-y-auto px-6 py-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Project Name <span className="text-red-500">*</span>
                  </label>
                  <input type="text" name="name" required value={formData.name} onChange={handleFormChange} placeholder="e.g. Fleet Tracker V3 Rollout" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
                  <textarea name="description" rows={3} value={formData.description} onChange={handleFormChange} placeholder="Brief project description..." className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Priority</label>
                    <select name="priority" value={formData.priority} onChange={handleFormChange} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Project Owner <span className="text-red-500">*</span>
                    </label>
                    <select name="owner" required value={formData.owner} onChange={handleFormChange} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                      <option value="">Select owner</option>
                      {TEAM_MEMBERS.map((m) => (<option key={m} value={m}>{m}</option>))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Start Date <span className="text-red-500">*</span>
                    </label>
                    <input type="date" name="startDate" required value={formData.startDate} onChange={handleFormChange} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      End Date <span className="text-red-500">*</span>
                    </label>
                    <input type="date" name="endDate" required value={formData.endDate} onChange={handleFormChange} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
                <button type="button" onClick={() => setShowNewModal(false)} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">Cancel</button>
                <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">Create Project</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
