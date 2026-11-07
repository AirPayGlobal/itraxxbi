"use client";

import { Wrench, CheckSquare, Users, DollarSign, Clock, ArrowRight } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
} from "recharts";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { DashboardData } from "@/lib/dashboard";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { StatsChart } from "@/components/dashboard/stats-chart";

const priorityStyles: Record<string, string> = {
  urgent: "bg-red-100 text-red-800",
  high: "bg-red-50 text-red-700",
  medium: "bg-amber-50 text-amber-700",
  low: "bg-slate-100 text-slate-600",
};

const tooltipStyle = {
  borderRadius: "8px",
  border: "1px solid #e2e8f0",
  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
};

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

export function DashboardView({ data, userName }: { data: DashboardData; userName: string }) {
  const { kpis, jobCardsByStatus, revenueTrend, upcomingTasks, activity } = data;
  const showFinance = kpis.monthlyRevenue !== null && revenueTrend !== null;

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Welcome back, {userName}</h1>
        <p className="mt-1 text-sm text-slate-500" suppressHydrationWarning>
          {formatCurrentDate()}
        </p>
      </div>

      <div
        className={cn(
          "mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2",
          showFinance ? "lg:grid-cols-4" : "lg:grid-cols-3"
        )}
      >
        <KpiCard
          index={0}
          title="Active Job Cards"
          value={kpis.activeJobCards.toLocaleString()}
          change={kpis.newJobCardsChange}
          changeLabel="new vs this time last month"
          icon={<Wrench className="h-5 w-5 text-blue-600" />}
          color="bg-blue-100"
        />
        <KpiCard
          index={1}
          title="Open Tasks"
          value={kpis.openTasks.toLocaleString()}
          change={kpis.newTasksChange}
          changeLabel="new vs this time last month"
          icon={<CheckSquare className="h-5 w-5 text-purple-600" />}
          color="bg-purple-100"
        />
        <KpiCard
          index={2}
          title="Active Customers"
          value={kpis.activeCustomers.toLocaleString()}
          change={kpis.newCustomersChange}
          changeLabel="new vs this time last month"
          icon={<Users className="h-5 w-5 text-emerald-600" />}
          color="bg-emerald-100"
        />
        {showFinance && (
          <KpiCard
            index={3}
            title="Monthly Revenue"
            value={`$${Math.round(kpis.monthlyRevenue!).toLocaleString()}`}
            change={kpis.revenueChange}
            changeLabel="vs this time last month"
            icon={<DollarSign className="h-5 w-5 text-amber-600" />}
            color="bg-amber-100"
          />
        )}
      </div>

      <div className={cn("mb-8 grid grid-cols-1 gap-6", showFinance && "lg:grid-cols-2")}>
        <StatsChart title="Job Cards by Status" subtitle="All job cards" index={0}>
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
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} />
          </BarChart>
        </StatsChart>

        {showFinance && (
          <StatsChart title="Revenue Trend" subtitle="Payments received, last 6 months" index={1}>
            <LineChart data={revenueTrend!}>
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
                formatter={(value) => [`$${Number(value).toLocaleString()}`, "Revenue"]}
                contentStyle={tooltipStyle}
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
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ActivityFeed activities={activity} />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.48, ease: "easeOut" }}
          className="rounded-xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h3 className="text-base font-semibold text-slate-900">Upcoming Tasks</h3>
            <a
              href="/tasks"
              className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              View all <ArrowRight className="h-3 w-3" />
            </a>
          </div>
          <div className="divide-y divide-slate-100">
            {upcomingTasks.length === 0 && (
              <p className="px-6 py-8 text-center text-sm text-slate-400">No upcoming tasks</p>
            )}
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
                  <p className="truncate text-sm text-slate-700">{task.title}</p>
                  <p className="mt-0.5 text-xs text-slate-400">Due: {task.dueDate}</p>
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
