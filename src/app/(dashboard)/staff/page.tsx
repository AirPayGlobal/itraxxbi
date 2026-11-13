"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Users,
  Briefcase,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  Star,
  Trophy,
  Search,
  Ticket,
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  Timer,
  CircleDot,
  ListChecks,
  GraduationCap,
  ClipboardCheck,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from "recharts";
import { cn, formatDate, formatDateTime } from "@/lib/utils";
import {
  useStaffPerformance,
  type StaffActivity,
  type StaffMetrics,
} from "@/lib/hooks/use-staff-performance";

// --- Helpers ---

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function shortName(name: string): string {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length < 2) return name;
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

function getScoreColor(score: number): string {
  if (score >= 85) return "bg-green-500";
  if (score >= 70) return "bg-yellow-500";
  return "bg-red-500";
}

function getScoreTextColor(score: number): string {
  if (score >= 85) return "text-green-700";
  if (score >= 70) return "text-yellow-700";
  return "text-red-700";
}

function getScoreFill(score: number): string {
  if (score >= 90) return "#22c55e";
  if (score >= 80) return "#1e8fe0";
  if (score >= 70) return "#f59e0b";
  return "#ef4444";
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function renderStars(rating: number): React.ReactNode {
  const stars = [];
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.3;

  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      stars.push(
        <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
      );
    } else if (i === fullStars && hasHalf) {
      stars.push(
        <Star key={i} className="h-3.5 w-3.5 fill-amber-400/50 text-amber-400" />
      );
    } else {
      stars.push(<Star key={i} className="h-3.5 w-3.5 text-slate-200" />);
    }
  }
  return <div className="flex items-center gap-0.5">{stars}</div>;
}

function ActivityIcon({ activity }: { activity: StaffActivity }) {
  if (activity.done) return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
  switch (activity.kind) {
    case "ticket":
      return <Ticket className="h-3.5 w-3.5 text-blue-500" />;
    case "job":
      return <Briefcase className="h-3.5 w-3.5 text-purple-500" />;
    case "task":
      return <ListChecks className="h-3.5 w-3.5 text-sky-500" />;
    default:
      return <CircleDot className="h-3.5 w-3.5 text-slate-400" />;
  }
}

function TrendBadge({ delta }: { delta: number | null }) {
  if (delta == null) return <span className="text-sm text-slate-400">—</span>;
  if (delta > 0)
    return (
      <div className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
        <TrendingUp className="h-3 w-3" />+{delta}
      </div>
    );
  if (delta < 0)
    return (
      <div className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
        <TrendingDown className="h-3 w-3" />
        {delta}
      </div>
    );
  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
      <Minus className="h-3 w-3" />
      Steady
    </div>
  );
}

function ScoreBar({ score, width = "w-20" }: { score: number | null; width?: string }) {
  if (score == null) return <span className="text-sm text-slate-400">—</span>;
  const value = Math.max(0, Math.min(100, Math.round(score)));
  return (
    <div className="flex items-center justify-center gap-3">
      <div className={cn("h-2 overflow-hidden rounded-full bg-slate-100", width)}>
        <div
          className={cn("h-full rounded-full transition-all", getScoreColor(value))}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className={cn("text-sm font-semibold", getScoreTextColor(value))}>
        {value}%
      </span>
    </div>
  );
}

function MetricTile({
  label,
  value,
  tone = "text-slate-700 dark:text-white",
}: {
  label: string;
  value: React.ReactNode;
  tone?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={cn("mt-1 text-xl font-bold", tone)}>{value}</p>
    </div>
  );
}

function ChartEmpty({ message }: { message: string }) {
  return (
    <div className="flex h-[300px] items-center justify-center text-sm text-slate-400">
      {message}
    </div>
  );
}

const pct = (n: number | null | undefined) => (n == null ? "—" : `${Math.round(n)}%`);

// ---------------------------------------------------------------------------
// Employee Detail Modal
// ---------------------------------------------------------------------------

function EmployeeDetailModal({
  staff,
  onClose,
}: {
  staff: StaffMetrics;
  onClose: () => void;
}) {
  const kpi = staff.latestKpi;
  const activities = staff.activities;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-[5vh] backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.97 }}
        className="w-full max-w-4xl rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-lg font-bold text-blue-700">
              {getInitials(staff.profile.name)}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {staff.profile.name}
              </h2>
              <p className="text-sm text-slate-500">
                {staff.roleLabel}
                {staff.profile.department ? ` · ${staff.profile.department}` : ""}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto">
          {/* Work metrics */}
          <div className="border-b border-slate-200 px-6 py-5 dark:border-slate-700">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
              <ListChecks className="h-4 w-4 text-sky-500" />
              Tasks &amp; Job Cards
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <MetricTile label="Tasks Assigned" value={staff.tasksAssigned} />
              <MetricTile
                label="Tasks Completed"
                value={staff.tasksCompleted}
                tone="text-green-600"
              />
              <MetricTile
                label="Overdue Tasks"
                value={staff.tasksOverdue}
                tone={staff.tasksOverdue > 0 ? "text-red-600" : "text-slate-700 dark:text-white"}
              />
              <MetricTile
                label="Jobs Completed"
                value={staff.jobsCompleted}
                tone="text-green-600"
              />
              <MetricTile
                label="Jobs In Progress"
                value={staff.jobsInProgress}
                tone="text-purple-600"
              />
            </div>
          </div>

          {/* Ticket metrics */}
          <div className="border-b border-slate-200 px-6 py-5 dark:border-slate-700">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
              <Ticket className="h-4 w-4 text-blue-500" />
              Ticket Performance
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <MetricTile label="Tickets Assigned" value={staff.ticketsAssigned} />
              <MetricTile
                label="Tickets Resolved"
                value={staff.ticketsResolved}
                tone="text-green-600"
              />
              <MetricTile
                label="Active Tickets"
                value={staff.ticketsActive}
                tone="text-slate-700 dark:text-white"
              />
              <MetricTile
                label="Avg Resolution"
                value={staff.avgResolutionHours != null ? `${staff.avgResolutionHours}h` : "—"}
                tone="text-amber-600"
              />
              <MetricTile label="Replies" value={staff.replies} tone="text-blue-600" />
            </div>
          </div>

          {/* Latest review */}
          <div className="border-b border-slate-200 px-6 py-5 dark:border-slate-700">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
              <ClipboardCheck className="h-4 w-4 text-purple-500" />
              Latest Performance Review
              {kpi && (
                <span className="font-mono text-xs font-normal text-slate-400">
                  {kpi.period}
                </span>
              )}
            </h3>
            {kpi ? (
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <MetricTile
                    label="Customer Rating"
                    value={
                      kpi.customer_rating != null ? (
                        <span className="flex items-center gap-2">
                          {round1(kpi.customer_rating)}
                          {renderStars(kpi.customer_rating)}
                        </span>
                      ) : (
                        "—"
                      )
                    }
                    tone="text-amber-600"
                  />
                  <MetricTile
                    label="Attendance"
                    value={pct(kpi.attendance_rate)}
                    tone="text-sky-600"
                  />
                  <MetricTile
                    label="Punctuality"
                    value={pct(kpi.punctuality_rate)}
                    tone="text-sky-600"
                  />
                  <MetricTile
                    label="Overall Score"
                    value={pct(kpi.overall_score)}
                    tone={
                      kpi.overall_score != null
                        ? getScoreTextColor(kpi.overall_score)
                        : "text-slate-400"
                    }
                  />
                </div>
                {(kpi.manager_notes || kpi.goals) && (
                  <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                    {kpi.manager_notes && (
                      <p>
                        <span className="font-medium text-slate-900 dark:text-white">
                          Notes:{" "}
                        </span>
                        {kpi.manager_notes}
                      </p>
                    )}
                    {kpi.goals && (
                      <p>
                        <span className="font-medium text-slate-900 dark:text-white">
                          Goals:{" "}
                        </span>
                        {kpi.goals}
                      </p>
                    )}
                  </div>
                )}
              </>
            ) : (
              <p className="py-2 text-sm text-slate-400">
                No performance review recorded yet
              </p>
            )}
          </div>

          {/* Trainings */}
          <div className="border-b border-slate-200 px-6 py-5 dark:border-slate-700">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
              <GraduationCap className="h-4 w-4 text-green-500" />
              Training &amp; Certifications
            </h3>
            {staff.trainings.length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {staff.trainings.map((t) => (
                  <div key={t.id} className="flex items-center justify-between gap-4 py-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        {t.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {[
                          t.provider,
                          t.completed_date ? `Completed ${formatDate(t.completed_date)}` : null,
                          t.expiry_date ? `Expires ${formatDate(t.expiry_date)}` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                        t.status === "COMPLETED"
                          ? "bg-green-50 text-green-700"
                          : t.status === "EXPIRED"
                            ? "bg-red-50 text-red-700"
                            : t.status === "IN_PROGRESS"
                              ? "bg-blue-50 text-blue-700"
                              : "bg-slate-100 text-slate-600"
                      )}
                    >
                      {t.status.replace(/_/g, " ").toLowerCase()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-2 text-sm text-slate-400">No training records yet</p>
            )}
          </div>

          {/* Activity Timeline */}
          <div className="px-6 py-5">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
              <Clock className="h-4 w-4 text-slate-400" />
              Recent Activity
            </h3>
            {activities.length > 0 ? (
              <div className="space-y-0">
                {activities.map((activity, idx) => (
                  <div key={activity.id} className="relative flex gap-4 pb-4 pl-6">
                    {idx < activities.length - 1 && (
                      <div className="absolute bottom-0 left-[13px] top-6 w-px bg-slate-200 dark:bg-slate-700" />
                    )}
                    <div className="absolute left-0 top-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-slate-100 dark:border-slate-900 dark:bg-slate-800">
                      <ActivityIcon activity={activity} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-900 dark:text-white">
                          {activity.label}
                        </span>
                        {activity.reference && (
                          <span className="font-mono text-xs text-blue-600 dark:text-blue-400">
                            {activity.reference}
                          </span>
                        )}
                      </div>
                      {activity.detail && (
                        <p className="mt-0.5 text-xs text-slate-500">{activity.detail}</p>
                      )}
                      <p className="mt-1 text-[11px] text-slate-400">
                        {formatDateTime(activity.at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-slate-400">
                No activity recorded yet
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// --- Page ---

export default function StaffPerformancePage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useStaffPerformance();
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const staff = useMemo(() => data?.staff ?? [], [data]);
  const activityLog = data?.activity ?? [];

  const roles = useMemo(
    () => ["ALL", ...Array.from(new Set(staff.map((s) => s.roleLabel))).sort()],
    [staff]
  );

  const filteredStaff = staff.filter((s) => {
    const matchesSearch = s.profile.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "ALL" || s.roleLabel === roleFilter;
    return matchesSearch && matchesRole;
  });

  const topPerformers = useMemo(
    () =>
      [...staff]
        .filter((s) => s.completedWork > 0)
        .sort(
          (a, b) =>
            b.completedWork - a.completedWork ||
            (b.completionRate ?? 0) - (a.completionRate ?? 0)
        )
        .slice(0, 5),
    [staff]
  );

  const summary = useMemo(() => {
    const samples = staff.reduce((s, m) => s + m.resolutionSamples, 0);
    const weighted = staff.reduce(
      (s, m) => s + (m.avgResolutionHours ?? 0) * m.resolutionSamples,
      0
    );
    return {
      totalResolved: staff.reduce((s, m) => s + m.ticketsResolved, 0),
      avgResolution: samples > 0 ? round1(weighted / samples) : null,
      overdueTasks: staff.reduce((s, m) => s + m.tasksOverdue, 0),
    };
  }, [staff]);

  const completionChartData = staff
    .filter((s) => s.completionRate != null)
    .map((s) => ({
      name: shortName(s.profile.name),
      score: s.completionRate as number,
      fill: getScoreFill(s.completionRate as number),
    }))
    .sort((a, b) => b.score - a.score);

  const ticketChartData = staff
    .filter((s) => s.ticketsAssigned > 0 || s.replies > 0)
    .map((s) => ({
      name: shortName(s.profile.name),
      resolved: s.ticketsResolved,
      replies: s.replies,
      active: s.ticketsActive,
    }))
    .sort((a, b) => b.resolved - a.resolved);

  const selectedStaff = selectedId
    ? staff.find((s) => s.profile.id === selectedId) ?? null
    : null;

  // --- Loading / error / empty ---

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading staff performance…
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md rounded-lg border border-red-200 bg-white p-6 text-center shadow-sm">
          <AlertTriangle className="mx-auto h-8 w-8 text-red-500" />
          <h2 className="mt-3 text-base font-semibold text-slate-900">
            Couldn&apos;t load staff performance
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {(error as Error)?.message || "Something went wrong."}
          </p>
          <button
            onClick={() => refetch()}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Staff Performance</h1>
        <p className="mt-1 text-sm text-slate-500">
          Task, job card and ticket output per team member, plus their latest review
        </p>
      </div>

      {staff.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <Users className="mx-auto h-10 w-10 text-slate-300" />
          <h2 className="mt-3 text-base font-semibold text-slate-900">
            No staff data yet
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Active staff profiles will appear here once they are added. Their
            performance is calculated from assigned tasks, job cards and tickets.
          </p>
        </div>
      ) : (
        <>
          {/* Overview Stats Row */}
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-500">Total Staff</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">{staff.length}</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-500">Tickets Resolved</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {summary.totalResolved}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-100">
                  <Timer className="h-5 w-5 text-amber-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-500">Avg Resolution Time</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {summary.avgResolution != null ? `${summary.avgResolution}h` : "—"}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-100">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-500">Overdue Tasks</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {summary.overdueTasks}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search staff..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {roles.map((role) => (
                <option key={role} value={role}>
                  {role === "ALL" ? "All Roles" : role}
                </option>
              ))}
            </select>
          </div>

          {/* Staff Performance Table */}
          <div className="mb-8 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-slate-900">
                Staff Performance Overview
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Click any row to view work breakdown, latest review, training and activity
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      Staff Member
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      Role
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-slate-500">
                      <span className="flex items-center justify-center gap-1">
                        <ListChecks className="h-3 w-3" />
                        Tasks
                      </span>
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-slate-500">
                      <span className="flex items-center justify-center gap-1">
                        <Briefcase className="h-3 w-3" />
                        Jobs
                      </span>
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-slate-500">
                      <span className="flex items-center justify-center gap-1">
                        <Ticket className="h-3 w-3" />
                        Resolved
                      </span>
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-slate-500">
                      <span className="flex items-center justify-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        Replies
                      </span>
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-slate-500">
                      <span className="flex items-center justify-center gap-1">
                        <Timer className="h-3 w-3" />
                        Avg Resolve
                      </span>
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-slate-500">
                      Customer Rating
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-slate-500">
                      Review Score
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-slate-500">
                      Trend
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStaff.map((s) => {
                    const rating = s.latestKpi?.customer_rating ?? null;
                    return (
                      <tr
                        key={s.profile.id}
                        className="cursor-pointer transition-colors hover:bg-blue-50/50"
                        onClick={() => setSelectedId(s.profile.id)}
                      >
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-700">
                              {getInitials(s.profile.name)}
                            </div>
                            <span className="text-sm font-medium text-slate-900">
                              {s.profile.name}
                            </span>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">
                          {s.roleLabel}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-center text-sm">
                          <span className="font-medium text-slate-900">
                            {s.tasksCompleted}/{s.tasksAssigned}
                          </span>
                          {s.tasksOverdue > 0 && (
                            <span className="ml-2 inline-flex items-center gap-0.5 rounded-full bg-red-50 px-1.5 py-0.5 text-[11px] font-semibold text-red-700">
                              <AlertTriangle className="h-3 w-3" />
                              {s.tasksOverdue}
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-center text-sm">
                          <span className="font-medium text-slate-900">{s.jobsCompleted}</span>
                          {s.jobsInProgress > 0 && (
                            <span className="ml-1 text-xs text-slate-500">
                              (+{s.jobsInProgress} active)
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-center">
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700">
                            <CheckCircle2 className="h-3 w-3" />
                            {s.ticketsResolved}/{s.ticketsAssigned}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-center">
                          <span className="text-sm font-medium text-slate-700">{s.replies}</span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-center text-sm text-slate-600">
                          {s.avgResolutionHours != null ? `${s.avgResolutionHours}h` : "—"}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          {rating != null ? (
                            <div className="flex items-center justify-center gap-2">
                              {renderStars(rating)}
                              <span className="text-xs text-slate-500">{round1(rating)}</span>
                            </div>
                          ) : (
                            <div className="text-center text-sm text-slate-400">—</div>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <ScoreBar score={s.latestKpi?.overall_score ?? null} />
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-center">
                          <TrendBadge delta={s.scoreDelta} />
                        </td>
                      </tr>
                    );
                  })}
                  {filteredStaff.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-6 py-12 text-center text-sm text-slate-500">
                        No staff members found matching your criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Charts Row */}
          <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Completion Rate Bar Chart */}
            <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-4">
                <h3 className="text-lg font-semibold text-slate-900">Completion Rate</h3>
                <p className="text-xs text-slate-500">
                  Completed tasks, job cards and resolved tickets as a share of everything
                  assigned
                </p>
              </div>
              <div className="p-6">
                {completionChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={completionChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 12, fill: "#64748b" }}
                        axisLine={{ stroke: "#e2e8f0" }}
                        tickLine={false}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tick={{ fontSize: 12, fill: "#64748b" }}
                        axisLine={{ stroke: "#e2e8f0" }}
                        tickLine={false}
                        tickFormatter={(value: number) => `${value}%`}
                      />
                      <Tooltip
                        formatter={(value) =>
                          [`${value ?? 0}%`, "Completion"] as [string, string]
                        }
                        contentStyle={{
                          borderRadius: "8px",
                          border: "1px solid #e2e8f0",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                        }}
                      />
                      <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                        {completionChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <ChartEmpty message="No assigned work yet" />
                )}
              </div>
            </div>

            {/* Ticket Activity Chart */}
            <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-4">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                  <Ticket className="h-5 w-5 text-blue-500" />
                  Ticket Performance by Staff
                </h3>
                <p className="text-xs text-slate-500">
                  Resolved tickets, customer replies, and tickets still open
                </p>
              </div>
              <div className="p-6">
                {ticketChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={ticketChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 12, fill: "#64748b" }}
                        axisLine={{ stroke: "#e2e8f0" }}
                        tickLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 12, fill: "#64748b" }}
                        axisLine={{ stroke: "#e2e8f0" }}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "8px",
                          border: "1px solid #e2e8f0",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                        }}
                      />
                      <Legend />
                      <Bar dataKey="resolved" name="Resolved" fill="#22c55e" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="replies" name="Replies" fill="#1e8fe0" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="active" name="Open" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <ChartEmpty message="No ticket data yet" />
                )}
              </div>
            </div>
          </div>

          {/* Bottom Row: Leaderboard + Recent Activity */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Leaderboard */}
            <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-4">
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-amber-500" />
                  <h3 className="text-lg font-semibold text-slate-900">Top 5 Performers</h3>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  Ranked by completed tasks, job cards and resolved tickets
                </p>
              </div>
              {topPerformers.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {topPerformers.map((s, index) => (
                    <div
                      key={s.profile.id}
                      className="flex cursor-pointer items-center gap-4 px-6 py-4 hover:bg-blue-50/50"
                      onClick={() => setSelectedId(s.profile.id)}
                    >
                      <div
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                          index === 0
                            ? "bg-amber-100 text-amber-700"
                            : index === 1
                              ? "bg-slate-200 text-slate-600"
                              : index === 2
                                ? "bg-orange-100 text-orange-700"
                                : "bg-slate-50 text-slate-500"
                        )}
                      >
                        {index + 1}
                      </div>
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-700">
                        {getInitials(s.profile.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-900">{s.profile.name}</p>
                        <p className="text-xs text-slate-500">
                          {s.roleLabel}
                          <span className="ml-2 text-green-600">
                            · {s.completedWork} completed
                          </span>
                        </p>
                      </div>
                      <ScoreBar score={s.completionRate} width="w-16" />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="px-6 py-12 text-center text-sm text-slate-400">
                  No completed work recorded yet
                </p>
              )}
            </div>

            {/* Recent Activity Feed */}
            <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-slate-400" />
                  <h3 className="text-lg font-semibold text-slate-900">Recent Activity</h3>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  {data?.activitySource === "activity_logs"
                    ? "From the activity log"
                    : "Latest task, job card and ticket updates"}
                </p>
              </div>
              {activityLog.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {activityLog.slice(0, 8).map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3 px-6 py-3">
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100">
                        <ActivityIcon activity={activity} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-slate-900">
                          <span className="font-medium">{activity.actorName}</span>{" "}
                          <span className="text-slate-500">{activity.label.toLowerCase()}</span>{" "}
                          {activity.reference && (
                            <span className="font-mono text-xs text-blue-600">
                              {activity.reference}
                            </span>
                          )}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-slate-400">
                          {activity.detail ? `${activity.detail} · ` : ""}
                          {formatDateTime(activity.at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="px-6 py-12 text-center text-sm text-slate-400">
                  No activity recorded yet
                </p>
              )}
            </div>
          </div>
        </>
      )}

      {/* Employee Detail Modal */}
      {selectedStaff && (
        <EmployeeDetailModal staff={selectedStaff} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}
