"use client";

import {
  Wrench,
  CheckSquare,
  Users,
  DollarSign,
  Clock,
  ArrowRight,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  ResponsiveContainer,
} from "recharts";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { StatsChart } from "@/components/dashboard/stats-chart";

// --- Mock data ---

const jobCardsByStatus = [
  { status: "Open", count: 8, fill: "#64748b" },
  { status: "Assigned", count: 6, fill: "#8b5cf6" },
  { status: "In Progress", count: 5, fill: "#3b82f6" },
  { status: "Completed", count: 3, fill: "#22c55e" },
  { status: "Invoiced", count: 2, fill: "#10b981" },
];

const revenueTrend = [
  { month: "Aug", revenue: 32000 },
  { month: "Sep", revenue: 35000 },
  { month: "Oct", revenue: 38000 },
  { month: "Nov", revenue: 42000 },
  { month: "Dec", revenue: 45000 },
  { month: "Jan", revenue: 48250 },
];

const upcomingTasks = [
  {
    id: "1",
    title: "Complete brake inspection - JC-2601-0045",
    dueDate: "Feb 22, 2026",
    priority: "high" as const,
  },
  {
    id: "2",
    title: "Order replacement filters for Fleet B",
    dueDate: "Feb 23, 2026",
    priority: "medium" as const,
  },
  {
    id: "3",
    title: "Schedule quarterly maintenance review",
    dueDate: "Feb 24, 2026",
    priority: "low" as const,
  },
  {
    id: "4",
    title: "Submit monthly inventory report",
    dueDate: "Feb 25, 2026",
    priority: "medium" as const,
  },
  {
    id: "5",
    title: "Follow up with Apex Motors on invoice",
    dueDate: "Feb 26, 2026",
    priority: "high" as const,
  },
  {
    id: "6",
    title: "Calibrate diagnostic equipment",
    dueDate: "Feb 27, 2026",
    priority: "low" as const,
  },
];

const priorityStyles: Record<string, string> = {
  high: "bg-red-50 text-red-700",
  medium: "bg-amber-50 text-amber-700",
  low: "bg-slate-100 text-slate-600",
};

// --- Helpers ---

function formatCurrentDate(): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());
}

function formatRevenueTick(value: number): string {
  return `$${(value / 1000).toFixed(0)}k`;
}

// --- Page ---

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      {/* Welcome header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">
          Welcome back to ITRACKERX
        </h1>
        <p className="mt-1 text-sm text-slate-500">{formatCurrentDate()}</p>
      </div>

      {/* KPI Cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          index={0}
          title="Active Job Cards"
          value="24"
          change={12}
          changeLabel="from last month"
          icon={<Wrench className="h-5 w-5 text-blue-600" />}
          color="bg-blue-100"
        />
        <KpiCard
          index={1}
          title="Open Tasks"
          value="47"
          change={-5}
          changeLabel="from last month"
          icon={<CheckSquare className="h-5 w-5 text-purple-600" />}
          color="bg-purple-100"
        />
        <KpiCard
          index={2}
          title="Active Customers"
          value="156"
          change={8}
          changeLabel="from last month"
          icon={<Users className="h-5 w-5 text-emerald-600" />}
          color="bg-emerald-100"
        />
        <KpiCard
          index={3}
          title="Monthly Revenue"
          value="$48,250"
          change={15}
          changeLabel="from last month"
          icon={<DollarSign className="h-5 w-5 text-amber-600" />}
          color="bg-amber-100"
        />
      </div>

      {/* Charts row */}
      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <StatsChart title="Job Cards by Status" subtitle="Current period" index={0}>
          <BarChart data={jobCardsByStatus}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="status"
              tick={{ fontSize: 12, fill: "#64748b" }}
              axisLine={{ stroke: "#e2e8f0" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "#64748b" }}
              axisLine={{ stroke: "#e2e8f0" }}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} />
          </BarChart>
        </StatsChart>

        <StatsChart title="Revenue Trend" subtitle="Last 6 months" index={1}>
          <LineChart data={revenueTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12, fill: "#64748b" }}
              axisLine={{ stroke: "#e2e8f0" }}
              tickLine={false}
            />
            <YAxis
              tickFormatter={formatRevenueTick}
              tick={{ fontSize: 12, fill: "#64748b" }}
              axisLine={{ stroke: "#e2e8f0" }}
              tickLine={false}
            />
            <Tooltip
              formatter={(value) => [
                `$${Number(value).toLocaleString()}`,
                "Revenue",
              ]}
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              }}
            />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: "#3b82f6", r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </StatsChart>
      </div>

      {/* Activity feed + Upcoming tasks row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ActivityFeed />

        {/* Upcoming Tasks */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.48, ease: "easeOut" }}
          className="rounded-xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h3 className="text-base font-semibold text-slate-900">
              Upcoming Tasks
            </h3>
            <a
              href="/tasks"
              className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              View all <ArrowRight className="h-3 w-3" />
            </a>
          </div>
          <div className="divide-y divide-slate-100">
            {upcomingTasks.map((task, i) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: 0.52 + i * 0.04 }}
                className="flex items-center gap-3 px-6 py-3"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-slate-700">
                    {task.title}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Due: {task.dueDate}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold capitalize",
                    priorityStyles[task.priority]
                  )}
                >
                  {task.priority}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
