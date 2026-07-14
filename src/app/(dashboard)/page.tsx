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
import { useMemo } from "react";
import { cn, formatDate } from "@/lib/utils";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { StatsChart } from "@/components/dashboard/stats-chart";
import { useJobCards } from "@/lib/hooks/use-job-cards";
import { useTasks } from "@/lib/hooks/use-tasks";
import { useCustomers } from "@/lib/hooks/use-customers";
import { useInvoices } from "@/lib/hooks/use-invoices";
import type { Priority } from "@/lib/supabase/database.types";

// --- Constants ---

const JOB_STATUS_CHART: { key: string; label: string; fill: string }[] = [
  { key: "OPEN", label: "Open", fill: "#64748b" },
  { key: "ASSIGNED", label: "Assigned", fill: "#8b5cf6" },
  { key: "IN_PROGRESS", label: "In Progress", fill: "#3b82f6" },
  { key: "COMPLETED", label: "Completed", fill: "#22c55e" },
  { key: "INVOICED", label: "Invoiced", fill: "#10b981" },
];

const priorityStyles: Record<Priority, string> = {
  URGENT: "bg-red-50 text-red-700",
  HIGH: "bg-red-50 text-red-700",
  MEDIUM: "bg-amber-50 text-amber-700",
  LOW: "bg-slate-100 text-slate-600",
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
  return `N$${(value / 1000).toFixed(0)}k`;
}

// --- Page ---

export default function DashboardPage() {
  const { data: jobCards = [] } = useJobCards();
  const { data: tasks = [] } = useTasks();
  const { data: customers = [] } = useCustomers();
  const { data: invoices = [] } = useInvoices();

  const activeJobCards = jobCards.filter(
    (j) => !["COMPLETED", "INVOICED", "CANCELLED"].includes(j.status)
  ).length;
  const openTasks = tasks.filter(
    (t) => !["DONE", "CANCELLED"].includes(t.status)
  ).length;
  const activeCustomers = customers.filter((c) => c.status === "ACTIVE").length;
  const paidRevenue = invoices
    .filter((i) => i.status === "PAID")
    .reduce((sum, i) => sum + i.total, 0);

  const jobCardsByStatus = useMemo(
    () =>
      JOB_STATUS_CHART.map((s) => ({
        status: s.label,
        count: jobCards.filter((j) => j.status === s.key).length,
        fill: s.fill,
      })),
    [jobCards]
  );

  // Revenue trend: paid invoices grouped into the last 6 months.
  const revenueTrend = useMemo(() => {
    const now = new Date();
    const months: { month: string; key: string; revenue: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        month: d.toLocaleDateString("en-US", { month: "short" }),
        key: `${d.getFullYear()}-${d.getMonth()}`,
        revenue: 0,
      });
    }
    const byKey = new Map(months.map((m) => [m.key, m]));
    for (const inv of invoices) {
      if (inv.status !== "PAID") continue;
      const when = inv.paid_date ?? inv.issued_date ?? inv.created_at;
      const d = new Date(when);
      const bucket = byKey.get(`${d.getFullYear()}-${d.getMonth()}`);
      if (bucket) bucket.revenue += inv.total;
    }
    return months;
  }, [invoices]);

  const upcomingTasks = useMemo(() => {
    const now = new Date();
    return tasks
      .filter(
        (t) =>
          t.due_date != null &&
          !["DONE", "CANCELLED"].includes(t.status) &&
          new Date(t.due_date) >= new Date(now.toDateString())
      )
      .sort((a, b) => (a.due_date! < b.due_date! ? -1 : 1))
      .slice(0, 6);
  }, [tasks]);

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
          value={String(activeJobCards)}
          changeLabel="Open, assigned or in progress"
          icon={<Wrench className="h-5 w-5 text-blue-600" />}
          color="bg-blue-100"
        />
        <KpiCard
          index={1}
          title="Open Tasks"
          value={String(openTasks)}
          changeLabel="Not yet completed"
          icon={<CheckSquare className="h-5 w-5 text-purple-600" />}
          color="bg-purple-100"
        />
        <KpiCard
          index={2}
          title="Active Customers"
          value={String(activeCustomers)}
          changeLabel="With status Active"
          icon={<Users className="h-5 w-5 text-emerald-600" />}
          color="bg-emerald-100"
        />
        <KpiCard
          index={3}
          title="Revenue (Paid)"
          value={new Intl.NumberFormat("en-NA", {
            style: "currency",
            currency: "NAD",
            currencyDisplay: "narrowSymbol",
            maximumFractionDigits: 0,
          }).format(paidRevenue)}
          changeLabel="Paid invoices to date"
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
            {upcomingTasks.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-slate-400">
                No upcoming tasks with due dates.
              </p>
            ) : (
              upcomingTasks.map((task, i) => (
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
                      Due: {task.due_date ? formatDate(task.due_date) : "—"}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold capitalize",
                      priorityStyles[task.priority]
                    )}
                  >
                    {task.priority.toLowerCase()}
                  </span>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
