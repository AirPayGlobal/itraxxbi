"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Users,
  Briefcase,
  Clock,
  TrendingUp,
  TrendingDown,
  Star,
  Trophy,
  BarChart3,
  Search,
  Ticket,
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  Timer,
  Shield,
  RotateCcw,
  CircleDot,
  ChevronDown,
  ChevronRight,
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
  PieChart,
  Pie,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { cn, formatDate, formatDateTime } from "@/lib/utils";
import {
  getActivityLog,
  getActivityLogForEmployee,
  getAllEmployeeTicketMetrics,
  subscribeToActivities,
  type ActivityEntry,
  type EmployeeTicketMetrics,
} from "@/lib/activity-store";

// --- Mock data (extended with ticket metrics) ---

interface StaffMember {
  id: string;
  name: string;
  role: string;
  jobsCompleted: number;
  avgResponseTime: number;
  customerRating: number;
  tasksCompleted: number;
  overallScore: number;
  trend: "up" | "down";
}

const mockStaff: StaffMember[] = [
  {
    id: "1",
    name: "John Mutua",
    role: "Senior Technician",
    jobsCompleted: 28,
    avgResponseTime: 1.8,
    customerRating: 4.7,
    tasksCompleted: 34,
    overallScore: 92,
    trend: "up",
  },
  {
    id: "2",
    name: "David Amupolo",
    role: "Technician",
    jobsCompleted: 22,
    avgResponseTime: 2.2,
    customerRating: 4.5,
    tasksCompleted: 28,
    overallScore: 85,
    trend: "up",
  },
  {
    id: "3",
    name: "Peter Angula",
    role: "Technician",
    jobsCompleted: 18,
    avgResponseTime: 2.8,
    customerRating: 4.2,
    tasksCompleted: 22,
    overallScore: 74,
    trend: "down",
  },
  {
    id: "4",
    name: "Sarah Nekongo",
    role: "Account Manager",
    jobsCompleted: 5,
    avgResponseTime: 1.5,
    customerRating: 4.8,
    tasksCompleted: 42,
    overallScore: 88,
    trend: "up",
  },
  {
    id: "5",
    name: "Lisa Amupolo",
    role: "Operations Manager",
    jobsCompleted: 3,
    avgResponseTime: 1.2,
    customerRating: 4.9,
    tasksCompleted: 38,
    overallScore: 90,
    trend: "up",
  },
  {
    id: "6",
    name: "David Kapere",
    role: "Junior Technician",
    jobsCompleted: 12,
    avgResponseTime: 3.5,
    customerRating: 3.8,
    tasksCompleted: 18,
    overallScore: 65,
    trend: "down",
  },
];

// --- Helpers ---

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
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

function renderStars(rating: number): React.ReactNode {
  const stars = [];
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.3;

  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      stars.push(
        <Star
          key={i}
          className="h-3.5 w-3.5 fill-amber-400 text-amber-400"
        />
      );
    } else if (i === fullStars && hasHalf) {
      stars.push(
        <Star
          key={i}
          className="h-3.5 w-3.5 fill-amber-400/50 text-amber-400"
        />
      );
    } else {
      stars.push(
        <Star key={i} className="h-3.5 w-3.5 text-slate-200" />
      );
    }
  }
  return <div className="flex items-center gap-0.5">{stars}</div>;
}

const activityTypeLabels: Record<string, string> = {
  TICKET_CREATED: "Created ticket",
  TICKET_ASSIGNED: "Assigned to ticket",
  TICKET_REPLIED: "Replied to customer",
  TICKET_RESOLVED: "Resolved ticket",
  TICKET_CLOSED: "Closed ticket",
  TICKET_REOPENED: "Ticket reopened",
  TICKET_ESCALATED: "Escalated ticket",
  TICKET_NOTE_ADDED: "Added internal note",
};

const activityTypeIcons: Record<string, React.ReactNode> = {
  TICKET_CREATED: <CircleDot className="h-3.5 w-3.5 text-blue-500" />,
  TICKET_ASSIGNED: <ArrowUpRight className="h-3.5 w-3.5 text-purple-500" />,
  TICKET_REPLIED: <MessageSquare className="h-3.5 w-3.5 text-sky-500" />,
  TICKET_RESOLVED: <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />,
  TICKET_CLOSED: <X className="h-3.5 w-3.5 text-gray-400" />,
  TICKET_REOPENED: <RotateCcw className="h-3.5 w-3.5 text-orange-500" />,
  TICKET_ESCALATED: <AlertTriangle className="h-3.5 w-3.5 text-red-500" />,
  TICKET_NOTE_ADDED: <MessageSquare className="h-3.5 w-3.5 text-slate-400" />,
};

// ---------------------------------------------------------------------------
// Employee Detail Modal
// ---------------------------------------------------------------------------

function EmployeeDetailModal({
  staff,
  metrics,
  activities,
  onClose,
}: {
  staff: StaffMember;
  metrics: EmployeeTicketMetrics | null;
  activities: ActivityEntry[];
  onClose: () => void;
}) {
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
              {getInitials(staff.name)}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {staff.name}
              </h2>
              <p className="text-sm text-slate-500">{staff.role}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto">
          {/* Ticket Metrics */}
          {metrics && (
            <div className="border-b border-slate-200 px-6 py-5 dark:border-slate-700">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                <Ticket className="h-4 w-4 text-blue-500" />
                Ticket Performance Metrics
              </h3>
              <div className="grid grid-cols-4 gap-3">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                  <p className="text-xs text-slate-500">Tickets Resolved</p>
                  <p className="mt-1 text-xl font-bold text-green-600">
                    {metrics.ticketsResolved}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                  <p className="text-xs text-slate-500">Total Replies</p>
                  <p className="mt-1 text-xl font-bold text-blue-600">
                    {metrics.totalReplies}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                  <p className="text-xs text-slate-500">Avg Resolution</p>
                  <p className="mt-1 text-xl font-bold text-amber-600">
                    {metrics.avgResolutionTimeHours}h
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                  <p className="text-xs text-slate-500">SLA Compliance</p>
                  <p className="mt-1 text-xl font-bold text-purple-600">
                    {metrics.slaComplianceRate}%
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                  <p className="text-xs text-slate-500">1st Response</p>
                  <p className="mt-1 text-xl font-bold text-sky-600">
                    {metrics.firstResponseTimeHours}h
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                  <p className="text-xs text-slate-500">Active Tickets</p>
                  <p className="mt-1 text-xl font-bold text-slate-700 dark:text-white">
                    {metrics.activeTickets}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                  <p className="text-xs text-slate-500">Escalated</p>
                  <p className="mt-1 text-xl font-bold text-red-600">
                    {metrics.ticketsEscalated}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                  <p className="text-xs text-slate-500">Reopen Rate</p>
                  <p className="mt-1 text-xl font-bold text-orange-600">
                    {metrics.reopenRate}%
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Activity Timeline */}
          <div className="px-6 py-5">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
              <Clock className="h-4 w-4 text-slate-400" />
              Recent Ticket Activity
            </h3>
            {activities.length > 0 ? (
              <div className="space-y-0">
                {activities.slice(0, 15).map((activity, idx) => (
                  <div
                    key={activity.id}
                    className="relative flex gap-4 pb-4 pl-6"
                  >
                    {/* Timeline line */}
                    {idx < activities.length - 1 && idx < 14 && (
                      <div className="absolute bottom-0 left-[13px] top-6 w-px bg-slate-200 dark:bg-slate-700" />
                    )}
                    {/* Timeline dot */}
                    <div className="absolute left-0 top-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-slate-100 dark:border-slate-900 dark:bg-slate-800">
                      {activityTypeIcons[activity.type]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-900 dark:text-white">
                          {activityTypeLabels[activity.type]}
                        </span>
                        <span className="font-mono text-xs text-blue-600 dark:text-blue-400">
                          {activity.ticketNumber}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {activity.details}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-400">
                        <span>{activity.customerName}</span>
                        <span>·</span>
                        <span>{activity.company}</span>
                        <span>·</span>
                        <span>{formatDateTime(activity.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-slate-400">
                No ticket activity recorded yet
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
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [, forceUpdate] = useState(0);

  // Subscribe to activity store changes
  useEffect(() => {
    return subscribeToActivities(() => forceUpdate((n) => n + 1));
  }, []);

  const ticketMetrics = useMemo(() => getAllEmployeeTicketMetrics(), []);
  const activityLog = useMemo(() => getActivityLog(), []);

  const roles = ["ALL", ...Array.from(new Set(mockStaff.map((s) => s.role)))];

  // Merge staff data with ticket metrics
  const enrichedStaff = useMemo(() => {
    return mockStaff.map((staff) => {
      const metrics = ticketMetrics.find((m) => m.employeeId === staff.id);
      // Adjust overall score based on ticket performance
      let ticketBonus = 0;
      if (metrics) {
        // Resolved tickets add to score
        ticketBonus += Math.min(metrics.ticketsResolved * 1.5, 8);
        // Fast first response adds to score
        if (metrics.firstResponseTimeHours > 0 && metrics.firstResponseTimeHours < 6) {
          ticketBonus += 3;
        }
        // High SLA compliance adds to score
        if (metrics.slaComplianceRate >= 90) ticketBonus += 2;
        // Escalations and reopens reduce score
        ticketBonus -= metrics.ticketsEscalated * 2;
        ticketBonus -= metrics.reopenRate > 0 ? 3 : 0;
      }
      const adjustedScore = Math.min(
        100,
        Math.max(0, Math.round(staff.overallScore + ticketBonus))
      );
      return { ...staff, overallScore: adjustedScore, ticketMetrics: metrics };
    });
  }, [ticketMetrics]);

  const filteredStaff = enrichedStaff.filter((staff) => {
    const matchesSearch = staff.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "ALL" || staff.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const topPerformers = [...enrichedStaff]
    .sort((a, b) => b.overallScore - a.overallScore)
    .slice(0, 5);

  // Ticket metrics summary for overview cards
  const ticketSummary = useMemo(() => {
    const allMetrics = ticketMetrics;
    return {
      totalResolved: allMetrics.reduce((s, m) => s + m.ticketsResolved, 0),
      totalReplies: allMetrics.reduce((s, m) => s + m.totalReplies, 0),
      avgResolution:
        allMetrics.length > 0
          ? Math.round(
              (allMetrics.reduce((s, m) => s + m.avgResolutionTimeHours, 0) /
                allMetrics.filter((m) => m.avgResolutionTimeHours > 0).length) *
                10
            ) / 10
          : 0,
      avgSLA:
        allMetrics.length > 0
          ? Math.round(
              allMetrics.reduce((s, m) => s + m.slaComplianceRate, 0) /
                allMetrics.length
            )
          : 0,
    };
  }, [ticketMetrics]);

  // Chart data: tickets resolved per employee
  const ticketChartData = enrichedStaff
    .filter((s) => s.ticketMetrics)
    .map((s) => ({
      name: s.name.split(" ")[0] + " " + s.name.split(" ")[1]?.[0] + ".",
      resolved: s.ticketMetrics!.ticketsResolved,
      replies: s.ticketMetrics!.totalReplies,
      escalated: s.ticketMetrics!.ticketsEscalated,
    }))
    .sort((a, b) => b.resolved - a.resolved);

  const teamPerformanceData = enrichedStaff
    .map((s) => ({
      name: s.name.split(" ")[0] + " " + s.name.split(" ")[1]?.[0] + ".",
      score: s.overallScore,
      fill:
        s.overallScore >= 90
          ? "#22c55e"
          : s.overallScore >= 80
            ? "#3b82f6"
            : s.overallScore >= 70
              ? "#f59e0b"
              : "#ef4444",
    }))
    .sort((a, b) => b.score - a.score);

  const selectedMetrics = selectedStaff
    ? ticketMetrics.find((m) => m.employeeId === selectedStaff.id) || null
    : null;
  const selectedActivities = selectedStaff
    ? getActivityLogForEmployee(selectedStaff.id)
    : [];

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">
          Staff Performance
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Track team performance metrics including ticket activity and response
          times
        </p>
      </div>

      {/* Overview Stats Row */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-500">Total Staff</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {mockStaff.length}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-500">
                Tickets Resolved
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {ticketSummary.totalResolved}
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
              <p className="text-sm font-medium text-slate-500">
                Avg Resolution Time
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {ticketSummary.avgResolution}h
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-purple-100">
              <Shield className="h-5 w-5 text-purple-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-500">
                Avg SLA Compliance
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {ticketSummary.avgSLA}%
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

      {/* Staff Performance Table (with ticket columns) */}
      <div className="mb-8 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-900">
            Staff Performance Overview
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Click any row to view detailed ticket activity and performance breakdown
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
                  Jobs
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
                  <span className="flex items-center justify-center gap-1">
                    <Shield className="h-3 w-3" />
                    SLA %
                  </span>
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-slate-500">
                  Customer Rating
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-slate-500">
                  Overall Score
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-slate-500">
                  Trend
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStaff.map((staff) => {
                const metrics = staff.ticketMetrics;
                return (
                  <tr
                    key={staff.id}
                    className="cursor-pointer transition-colors hover:bg-blue-50/50"
                    onClick={() => setSelectedStaff(staff)}
                  >
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-700">
                          {getInitials(staff.name)}
                        </div>
                        <span className="text-sm font-medium text-slate-900">
                          {staff.name}
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">
                      {staff.role}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-center text-sm font-medium text-slate-900">
                      {staff.jobsCompleted}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-center">
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700">
                        <CheckCircle2 className="h-3 w-3" />
                        {metrics?.ticketsResolved ?? 0}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-center">
                      <span className="text-sm font-medium text-slate-700">
                        {metrics?.totalReplies ?? 0}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-center text-sm text-slate-600">
                      {metrics?.avgResolutionTimeHours
                        ? `${metrics.avgResolutionTimeHours}h`
                        : "—"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-center">
                      {metrics ? (
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
                            metrics.slaComplianceRate >= 90
                              ? "bg-green-50 text-green-700"
                              : metrics.slaComplianceRate >= 70
                                ? "bg-yellow-50 text-yellow-700"
                                : "bg-red-50 text-red-700"
                          )}
                        >
                          {metrics.slaComplianceRate}%
                        </span>
                      ) : (
                        <span className="text-sm text-slate-400">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        {renderStars(staff.customerRating)}
                        <span className="text-xs text-slate-500">
                          {staff.customerRating}
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center justify-center gap-3">
                        <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              getScoreColor(staff.overallScore)
                            )}
                            style={{ width: `${staff.overallScore}%` }}
                          />
                        </div>
                        <span
                          className={cn(
                            "text-sm font-semibold",
                            getScoreTextColor(staff.overallScore)
                          )}
                        >
                          {staff.overallScore}%
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-center">
                      {staff.trend === "up" ? (
                        <div className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                          <TrendingUp className="h-3 w-3" />
                          Up
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                          <TrendingDown className="h-3 w-3" />
                          Down
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredStaff.length === 0 && (
                <tr>
                  <td
                    colSpan={10}
                    className="px-6 py-12 text-center text-sm text-slate-500"
                  >
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
        {/* Team Performance Bar Chart */}
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h3 className="text-lg font-semibold text-slate-900">
              Overall Performance Score
            </h3>
            <p className="text-xs text-slate-500">
              Includes job, task, and ticket performance
            </p>
          </div>
          <div className="p-6">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={teamPerformanceData}>
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
                    [`${value ?? 0}%`, "Score"] as [string, string]
                  }
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  }}
                />
                <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                  {teamPerformanceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
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
              Resolved tickets, replies, and escalations
            </p>
          </div>
          <div className="p-6">
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
                <Bar
                  dataKey="resolved"
                  name="Resolved"
                  fill="#22c55e"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="replies"
                  name="Replies"
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="escalated"
                  name="Escalated"
                  fill="#ef4444"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
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
              <h3 className="text-lg font-semibold text-slate-900">
                Top 5 Performers
              </h3>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {topPerformers.map((staff, index) => {
              const metrics = ticketMetrics.find(
                (m) => m.employeeId === staff.id
              );
              return (
                <div
                  key={staff.id}
                  className="flex items-center gap-4 px-6 py-4"
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
                    {getInitials(staff.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      {staff.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {staff.role}
                      {metrics && metrics.ticketsResolved > 0 && (
                        <span className="ml-2 text-green-600">
                          · {metrics.ticketsResolved} tickets resolved
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-16 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          getScoreColor(staff.overallScore)
                        )}
                        style={{ width: `${staff.overallScore}%` }}
                      />
                    </div>
                    <span
                      className={cn(
                        "text-sm font-bold",
                        getScoreTextColor(staff.overallScore)
                      )}
                    >
                      {staff.overallScore}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-slate-400" />
              <h3 className="text-lg font-semibold text-slate-900">
                Recent Ticket Activity
              </h3>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {activityLog.slice(0, 8).map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-3 px-6 py-3"
              >
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100">
                  {activityTypeIcons[activity.type]}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-900">
                    <span className="font-medium">{activity.employeeName}</span>{" "}
                    <span className="text-slate-500">
                      {activityTypeLabels[activity.type].toLowerCase()}
                    </span>{" "}
                    <span className="font-mono text-xs text-blue-600">
                      {activity.ticketNumber}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {activity.customerName} · {formatDateTime(activity.timestamp)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Employee Detail Modal */}
      {selectedStaff && (
        <EmployeeDetailModal
          staff={selectedStaff}
          metrics={selectedMetrics}
          activities={selectedActivities}
          onClose={() => setSelectedStaff(null)}
        />
      )}
    </div>
  );
}
