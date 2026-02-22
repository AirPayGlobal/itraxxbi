"use client";

import { useState } from "react";
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
} from "recharts";
import { cn, getStatusColor, formatDate } from "@/lib/utils";

// --- Mock data ---

const mockStaff = [
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
    name: "James Shilongo",
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
    name: "Sarah Peters",
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

const teamPerformanceData = [
  { name: "John M.", score: 92, fill: "#22c55e" },
  { name: "Lisa A.", score: 90, fill: "#3b82f6" },
  { name: "Sarah P.", score: 88, fill: "#8b5cf6" },
  { name: "James S.", score: 85, fill: "#f59e0b" },
  { name: "Peter A.", score: 74, fill: "#64748b" },
  { name: "David K.", score: 65, fill: "#ef4444" },
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

// --- Page ---

export default function StaffPerformancePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");

  const roles = ["ALL", ...Array.from(new Set(mockStaff.map((s) => s.role)))];

  const filteredStaff = mockStaff.filter((staff) => {
    const matchesSearch = staff.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "ALL" || staff.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const topPerformers = [...mockStaff]
    .sort((a, b) => b.overallScore - a.overallScore)
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">
          Staff Performance
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Track and monitor team performance metrics
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
              <p className="mt-1 text-2xl font-bold text-slate-900">24</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-500">
                Avg Performance Score
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900">78%</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-purple-100">
              <Briefcase className="h-5 w-5 text-purple-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-500">
                Jobs Completed (Month)
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900">86</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-100">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-500">
                Avg Response Time
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900">2.4h</p>
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
                  Jobs Completed
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-slate-500">
                  Avg Response Time
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-slate-500">
                  Customer Rating
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-slate-500">
                  Tasks Completed
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
              {filteredStaff.map((staff) => (
                <tr key={staff.id} className="hover:bg-slate-50">
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
                  <td className="whitespace-nowrap px-6 py-4 text-center text-sm text-slate-600">
                    {staff.avgResponseTime}h
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      {renderStars(staff.customerRating)}
                      <span className="text-xs text-slate-500">
                        {staff.customerRating}
                      </span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-center text-sm font-medium text-slate-900">
                    {staff.tasksCompleted}
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
              ))}
              {filteredStaff.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
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

      {/* Performance Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Team Performance Bar Chart */}
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h3 className="text-lg font-semibold text-slate-900">
              Team Performance
            </h3>
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
                  formatter={(value: number) => [`${value}%`, "Score"]}
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
            {topPerformers.map((staff, index) => (
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
                  <p className="text-xs text-slate-500">{staff.role}</p>
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
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
