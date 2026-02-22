"use client";

import { useState, useMemo } from "react";
import {
  Users,
  CalendarOff,
  Clock,
  TreePalm,
  Plus,
  Search,
  X,
  Check,
  XCircle,
  ChevronDown,
  Briefcase,
  UserCircle,
} from "lucide-react";
import { cn, getStatusColor, formatDate } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type LeaveType =
  | "ANNUAL"
  | "SICK"
  | "COMPASSIONATE"
  | "MATERNITY"
  | "PATERNITY"
  | "UNPAID"
  | "STUDY";

type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED";

type ContractType = "PERMANENT" | "FIXED_TERM" | "PART_TIME" | "CONTRACTOR";

interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: LeaveStatus;
  submittedAt: string;
}

interface Employee {
  id: string;
  name: string;
  employeeNumber: string;
  department: string;
  jobTitle: string;
  contractType: ContractType;
  startDate: string;
  leaveBalances: {
    annual: number;
    sick: number;
    compassionate: number;
  };
}

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const mockEmployees: Employee[] = [
  {
    id: "1",
    name: "Johannes Shikongo",
    employeeNumber: "EMP-001",
    department: "Operations",
    jobTitle: "Senior Technician",
    contractType: "PERMANENT",
    startDate: "2021-03-15",
    leaveBalances: { annual: 12, sick: 8, compassionate: 3 },
  },
  {
    id: "2",
    name: "Maria Nekongo",
    employeeNumber: "EMP-002",
    department: "Finance",
    jobTitle: "Financial Controller",
    contractType: "PERMANENT",
    startDate: "2020-07-01",
    leaveBalances: { annual: 15, sick: 10, compassionate: 3 },
  },
  {
    id: "3",
    name: "Petrus Amupanda",
    employeeNumber: "EMP-003",
    department: "Operations",
    jobTitle: "Technician",
    contractType: "PERMANENT",
    startDate: "2022-01-10",
    leaveBalances: { annual: 8, sick: 6, compassionate: 3 },
  },
  {
    id: "4",
    name: "Selma Iipumbu",
    employeeNumber: "EMP-004",
    department: "Human Resources",
    jobTitle: "HR Manager",
    contractType: "PERMANENT",
    startDate: "2019-11-01",
    leaveBalances: { annual: 18, sick: 10, compassionate: 3 },
  },
  {
    id: "5",
    name: "Fillipus Hamutenya",
    employeeNumber: "EMP-005",
    department: "Operations",
    jobTitle: "Junior Technician",
    contractType: "FIXED_TERM",
    startDate: "2024-06-01",
    leaveBalances: { annual: 5, sick: 4, compassionate: 2 },
  },
  {
    id: "6",
    name: "Ndapewa Kashela",
    employeeNumber: "EMP-006",
    department: "Sales",
    jobTitle: "Account Manager",
    contractType: "PERMANENT",
    startDate: "2021-09-15",
    leaveBalances: { annual: 10, sick: 7, compassionate: 3 },
  },
  {
    id: "7",
    name: "Tomas Nghidinwa",
    employeeNumber: "EMP-007",
    department: "IT",
    jobTitle: "Systems Administrator",
    contractType: "PART_TIME",
    startDate: "2023-04-01",
    leaveBalances: { annual: 6, sick: 4, compassionate: 2 },
  },
  {
    id: "8",
    name: "Loini Kapinga",
    employeeNumber: "EMP-008",
    department: "Operations",
    jobTitle: "Fleet Coordinator",
    contractType: "CONTRACTOR",
    startDate: "2025-01-15",
    leaveBalances: { annual: 0, sick: 0, compassionate: 0 },
  },
];

const mockLeaveRequests: LeaveRequest[] = [
  {
    id: "LR-001",
    employeeId: "1",
    employeeName: "Johannes Shikongo",
    leaveType: "ANNUAL",
    startDate: "2026-03-02",
    endDate: "2026-03-06",
    days: 5,
    reason: "Family vacation to Cape Town",
    status: "PENDING",
    submittedAt: "2026-02-18",
  },
  {
    id: "LR-002",
    employeeId: "2",
    employeeName: "Maria Nekongo",
    leaveType: "SICK",
    startDate: "2026-02-20",
    endDate: "2026-02-21",
    days: 2,
    reason: "Flu and doctor appointment",
    status: "APPROVED",
    submittedAt: "2026-02-19",
  },
  {
    id: "LR-003",
    employeeId: "3",
    employeeName: "Petrus Amupanda",
    leaveType: "COMPASSIONATE",
    startDate: "2026-02-24",
    endDate: "2026-02-26",
    days: 3,
    reason: "Family bereavement",
    status: "APPROVED",
    submittedAt: "2026-02-20",
  },
  {
    id: "LR-004",
    employeeId: "4",
    employeeName: "Selma Iipumbu",
    leaveType: "MATERNITY",
    startDate: "2026-04-01",
    endDate: "2026-06-30",
    days: 65,
    reason: "Maternity leave",
    status: "APPROVED",
    submittedAt: "2026-02-10",
  },
  {
    id: "LR-005",
    employeeId: "5",
    employeeName: "Fillipus Hamutenya",
    leaveType: "ANNUAL",
    startDate: "2026-03-10",
    endDate: "2026-03-12",
    days: 3,
    reason: "Personal matters in Oshakati",
    status: "PENDING",
    submittedAt: "2026-02-21",
  },
  {
    id: "LR-006",
    employeeId: "6",
    employeeName: "Ndapewa Kashela",
    leaveType: "STUDY",
    startDate: "2026-03-15",
    endDate: "2026-03-19",
    days: 5,
    reason: "UNAM exam preparation and exams",
    status: "PENDING",
    submittedAt: "2026-02-22",
  },
  {
    id: "LR-007",
    employeeId: "7",
    employeeName: "Tomas Nghidinwa",
    leaveType: "UNPAID",
    startDate: "2026-03-01",
    endDate: "2026-03-05",
    days: 5,
    reason: "Extended personal travel",
    status: "REJECTED",
    submittedAt: "2026-02-15",
  },
  {
    id: "LR-008",
    employeeId: "1",
    employeeName: "Johannes Shikongo",
    leaveType: "SICK",
    startDate: "2026-02-10",
    endDate: "2026-02-10",
    days: 1,
    reason: "Migraine",
    status: "APPROVED",
    submittedAt: "2026-02-10",
  },
  {
    id: "LR-009",
    employeeId: "3",
    employeeName: "Petrus Amupanda",
    leaveType: "PATERNITY",
    startDate: "2026-04-15",
    endDate: "2026-04-25",
    days: 9,
    reason: "Birth of child",
    status: "PENDING",
    submittedAt: "2026-02-22",
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatLabel(value: string): string {
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getLeaveTypeBadgeColor(type: LeaveType): string {
  const map: Record<LeaveType, string> = {
    ANNUAL: "bg-blue-100 text-blue-800",
    SICK: "bg-red-100 text-red-800",
    COMPASSIONATE: "bg-purple-100 text-purple-800",
    MATERNITY: "bg-pink-100 text-pink-800",
    PATERNITY: "bg-indigo-100 text-indigo-800",
    UNPAID: "bg-gray-100 text-gray-800",
    STUDY: "bg-amber-100 text-amber-800",
  };
  return map[type] || "bg-gray-100 text-gray-800";
}

function getContractTypeBadgeColor(type: ContractType): string {
  const map: Record<ContractType, string> = {
    PERMANENT: "bg-green-100 text-green-800",
    FIXED_TERM: "bg-blue-100 text-blue-800",
    PART_TIME: "bg-amber-100 text-amber-800",
    CONTRACTOR: "bg-gray-100 text-gray-800",
  };
  return map[type] || "bg-gray-100 text-gray-800";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const LEAVE_STATUS_FILTERS = ["All", "PENDING", "APPROVED", "REJECTED"] as const;

const LEAVE_TYPES: LeaveType[] = [
  "ANNUAL",
  "SICK",
  "COMPASSIONATE",
  "MATERNITY",
  "PATERNITY",
  "UNPAID",
  "STUDY",
];

export default function HRPage() {
  // Tab state
  const [activeTab, setActiveTab] = useState<"leave" | "directory">("leave");

  // Leave requests state
  const [leaveStatusFilter, setLeaveStatusFilter] = useState("All");
  const [leaveRequests, setLeaveRequests] = useState(mockLeaveRequests);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    employeeId: "",
    leaveType: "ANNUAL" as LeaveType,
    startDate: "",
    endDate: "",
    reason: "",
  });

  // Employee directory state
  const [employeeSearch, setEmployeeSearch] = useState("");

  // Computed values
  const totalEmployees = mockEmployees.length;
  const onLeaveToday = leaveRequests.filter(
    (lr) =>
      lr.status === "APPROVED" &&
      new Date(lr.startDate) <= new Date() &&
      new Date(lr.endDate) >= new Date()
  ).length;
  const pendingRequests = leaveRequests.filter(
    (lr) => lr.status === "PENDING"
  ).length;
  const avgLeaveBalance =
    mockEmployees.reduce((sum, emp) => sum + emp.leaveBalances.annual, 0) /
    mockEmployees.length;

  // Filtered leave requests
  const filteredLeaveRequests = useMemo(() => {
    return leaveRequests.filter((lr) => {
      if (leaveStatusFilter !== "All" && lr.status !== leaveStatusFilter)
        return false;
      return true;
    });
  }, [leaveStatusFilter, leaveRequests]);

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    if (!employeeSearch.trim()) return mockEmployees;
    const q = employeeSearch.toLowerCase();
    return mockEmployees.filter((emp) => {
      const searchable = [
        emp.name,
        emp.employeeNumber,
        emp.department,
        emp.jobTitle,
      ]
        .join(" ")
        .toLowerCase();
      return searchable.includes(q);
    });
  }, [employeeSearch]);

  // Handlers
  function handleLeaveFormChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) {
    setLeaveForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleLeaveSubmit(e: React.FormEvent) {
    e.preventDefault();
    const employee = mockEmployees.find(
      (emp) => emp.id === leaveForm.employeeId
    );
    if (!employee) return;

    const start = new Date(leaveForm.startDate);
    const end = new Date(leaveForm.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const newRequest: LeaveRequest = {
      id: `LR-${String(leaveRequests.length + 1).padStart(3, "0")}`,
      employeeId: leaveForm.employeeId,
      employeeName: employee.name,
      leaveType: leaveForm.leaveType,
      startDate: leaveForm.startDate,
      endDate: leaveForm.endDate,
      days,
      reason: leaveForm.reason,
      status: "PENDING",
      submittedAt: new Date().toISOString().split("T")[0],
    };

    setLeaveRequests((prev) => [newRequest, ...prev]);
    setShowLeaveModal(false);
    setLeaveForm({
      employeeId: "",
      leaveType: "ANNUAL",
      startDate: "",
      endDate: "",
      reason: "",
    });
  }

  function handleApprove(id: string) {
    setLeaveRequests((prev) =>
      prev.map((lr) => (lr.id === id ? { ...lr, status: "APPROVED" as LeaveStatus } : lr))
    );
  }

  function handleReject(id: string) {
    setLeaveRequests((prev) =>
      prev.map((lr) => (lr.id === id ? { ...lr, status: "REJECTED" as LeaveStatus } : lr))
    );
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
              HR & Leave Management
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage employee leave requests, balances, and directory
            </p>
          </div>
          <button
            onClick={() => setShowLeaveModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <Plus className="h-4 w-4" />
            New Leave Request
          </button>
        </div>

        {/* ---- KPI Stats Row ---- */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Total Employees */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Total Employees
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {totalEmployees}
                </p>
              </div>
            </div>
          </div>

          {/* On Leave Today */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
                <CalendarOff className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">
                  On Leave Today
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {onLeaveToday}
                </p>
              </div>
            </div>
          </div>

          {/* Pending Requests */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Pending Requests
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {pendingRequests}
                </p>
              </div>
            </div>
          </div>

          {/* Avg Leave Balance */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
                <TreePalm className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Avg Leave Balance
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {avgLeaveBalance.toFixed(1)} days
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ---- Tabs ---- */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex gap-6">
            <button
              onClick={() => setActiveTab("leave")}
              className={cn(
                "whitespace-nowrap border-b-2 pb-3 text-sm font-medium transition-colors",
                activeTab === "leave"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              )}
            >
              Leave Requests
            </button>
            <button
              onClick={() => setActiveTab("directory")}
              className={cn(
                "whitespace-nowrap border-b-2 pb-3 text-sm font-medium transition-colors",
                activeTab === "directory"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              )}
            >
              Employee Directory
            </button>
          </nav>
        </div>

        {/* ---- Leave Requests Tab ---- */}
        {activeTab === "leave" && (
          <>
            {/* Status Filter Pills */}
            <div className="mb-6 flex flex-wrap gap-2">
              {LEAVE_STATUS_FILTERS.map((filter) => (
                <button
                  key={filter}
                  onClick={() => setLeaveStatusFilter(filter)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                    leaveStatusFilter === filter
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  )}
                >
                  {filter === "All" ? "All" : formatLabel(filter)}
                </button>
              ))}
            </div>

            {/* Leave Requests Table */}
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="whitespace-nowrap px-4 py-3 font-semibold text-gray-600">
                        Employee
                      </th>
                      <th className="whitespace-nowrap px-4 py-3 font-semibold text-gray-600">
                        Leave Type
                      </th>
                      <th className="whitespace-nowrap px-4 py-3 font-semibold text-gray-600">
                        Start Date
                      </th>
                      <th className="whitespace-nowrap px-4 py-3 font-semibold text-gray-600">
                        End Date
                      </th>
                      <th className="whitespace-nowrap px-4 py-3 text-center font-semibold text-gray-600">
                        Days
                      </th>
                      <th className="whitespace-nowrap px-4 py-3 font-semibold text-gray-600">
                        Reason
                      </th>
                      <th className="whitespace-nowrap px-4 py-3 font-semibold text-gray-600">
                        Status
                      </th>
                      <th className="whitespace-nowrap px-4 py-3 text-center font-semibold text-gray-600">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredLeaveRequests.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-4 py-12 text-center text-gray-400"
                        >
                          <CalendarOff className="mx-auto mb-3 h-8 w-8 text-gray-300" />
                          <p className="text-sm font-medium">
                            No leave requests found
                          </p>
                          <p className="mt-1 text-xs">
                            Try adjusting your filter or create a new request.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredLeaveRequests.map((lr) => (
                        <tr
                          key={lr.id}
                          className="transition-colors hover:bg-gray-50/70"
                        >
                          {/* Employee */}
                          <td className="whitespace-nowrap px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
                                {getInitials(lr.employeeName)}
                              </span>
                              <span className="font-medium text-gray-900">
                                {lr.employeeName}
                              </span>
                            </div>
                          </td>

                          {/* Leave Type */}
                          <td className="whitespace-nowrap px-4 py-3">
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                                getLeaveTypeBadgeColor(lr.leaveType)
                              )}
                            >
                              {formatLabel(lr.leaveType)}
                            </span>
                          </td>

                          {/* Start Date */}
                          <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                            {formatDate(lr.startDate)}
                          </td>

                          {/* End Date */}
                          <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                            {formatDate(lr.endDate)}
                          </td>

                          {/* Days */}
                          <td className="whitespace-nowrap px-4 py-3 text-center font-medium text-gray-900">
                            {lr.days}
                          </td>

                          {/* Reason */}
                          <td className="max-w-[200px] truncate px-4 py-3 text-gray-600">
                            {lr.reason}
                          </td>

                          {/* Status */}
                          <td className="whitespace-nowrap px-4 py-3">
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                                getStatusColor(lr.status)
                              )}
                            >
                              {formatLabel(lr.status)}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="whitespace-nowrap px-4 py-3">
                            <div className="flex items-center justify-center gap-1">
                              {lr.status === "PENDING" ? (
                                <>
                                  <button
                                    title="Approve"
                                    onClick={() => handleApprove(lr.id)}
                                    className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-green-50 hover:text-green-600"
                                  >
                                    <Check className="h-4 w-4" />
                                  </button>
                                  <button
                                    title="Reject"
                                    onClick={() => handleReject(lr.id)}
                                    className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </button>
                                </>
                              ) : (
                                <span className="text-xs text-gray-400">
                                  --
                                </span>
                              )}
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
                    {filteredLeaveRequests.length}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium text-gray-700">
                    {leaveRequests.length}
                  </span>{" "}
                  leave requests
                </p>
              </div>
            </div>
          </>
        )}

        {/* ---- Employee Directory Tab ---- */}
        {activeTab === "directory" && (
          <>
            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search employees..."
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Employee Table */}
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="whitespace-nowrap px-4 py-3 font-semibold text-gray-600">
                        Employee
                      </th>
                      <th className="whitespace-nowrap px-4 py-3 font-semibold text-gray-600">
                        Emp. No
                      </th>
                      <th className="whitespace-nowrap px-4 py-3 font-semibold text-gray-600">
                        Department
                      </th>
                      <th className="whitespace-nowrap px-4 py-3 font-semibold text-gray-600">
                        Job Title
                      </th>
                      <th className="whitespace-nowrap px-4 py-3 font-semibold text-gray-600">
                        Contract
                      </th>
                      <th className="whitespace-nowrap px-4 py-3 font-semibold text-gray-600">
                        Start Date
                      </th>
                      <th className="whitespace-nowrap px-4 py-3 text-center font-semibold text-gray-600">
                        Annual
                      </th>
                      <th className="whitespace-nowrap px-4 py-3 text-center font-semibold text-gray-600">
                        Sick
                      </th>
                      <th className="whitespace-nowrap px-4 py-3 text-center font-semibold text-gray-600">
                        Compassionate
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredEmployees.length === 0 ? (
                      <tr>
                        <td
                          colSpan={9}
                          className="px-4 py-12 text-center text-gray-400"
                        >
                          <UserCircle className="mx-auto mb-3 h-8 w-8 text-gray-300" />
                          <p className="text-sm font-medium">
                            No employees found
                          </p>
                          <p className="mt-1 text-xs">
                            Try adjusting your search query.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredEmployees.map((emp) => (
                        <tr
                          key={emp.id}
                          className="transition-colors hover:bg-gray-50/70"
                        >
                          {/* Employee Name */}
                          <td className="whitespace-nowrap px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
                                {getInitials(emp.name)}
                              </span>
                              <span className="font-medium text-gray-900">
                                {emp.name}
                              </span>
                            </div>
                          </td>

                          {/* Employee Number */}
                          <td className="whitespace-nowrap px-4 py-3">
                            <span className="font-mono text-xs text-gray-600">
                              {emp.employeeNumber}
                            </span>
                          </td>

                          {/* Department */}
                          <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                            {emp.department}
                          </td>

                          {/* Job Title */}
                          <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                            {emp.jobTitle}
                          </td>

                          {/* Contract Type */}
                          <td className="whitespace-nowrap px-4 py-3">
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                                getContractTypeBadgeColor(emp.contractType)
                              )}
                            >
                              {formatLabel(emp.contractType)}
                            </span>
                          </td>

                          {/* Start Date */}
                          <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                            {formatDate(emp.startDate)}
                          </td>

                          {/* Annual Leave Balance */}
                          <td className="whitespace-nowrap px-4 py-3 text-center">
                            <span
                              className={cn(
                                "inline-flex min-w-[2rem] items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold",
                                emp.leaveBalances.annual > 10
                                  ? "bg-green-100 text-green-700"
                                  : emp.leaveBalances.annual > 5
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-red-100 text-red-700"
                              )}
                            >
                              {emp.leaveBalances.annual}
                            </span>
                          </td>

                          {/* Sick Leave Balance */}
                          <td className="whitespace-nowrap px-4 py-3 text-center">
                            <span
                              className={cn(
                                "inline-flex min-w-[2rem] items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold",
                                emp.leaveBalances.sick > 5
                                  ? "bg-green-100 text-green-700"
                                  : emp.leaveBalances.sick > 2
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-red-100 text-red-700"
                              )}
                            >
                              {emp.leaveBalances.sick}
                            </span>
                          </td>

                          {/* Compassionate Leave Balance */}
                          <td className="whitespace-nowrap px-4 py-3 text-center">
                            <span
                              className={cn(
                                "inline-flex min-w-[2rem] items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold",
                                emp.leaveBalances.compassionate > 2
                                  ? "bg-green-100 text-green-700"
                                  : emp.leaveBalances.compassionate > 0
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-red-100 text-red-700"
                              )}
                            >
                              {emp.leaveBalances.compassionate}
                            </span>
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
                    {filteredEmployees.length}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium text-gray-700">
                    {mockEmployees.length}
                  </span>{" "}
                  employees
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ---- New Leave Request Modal ---- */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowLeaveModal(false)}
          />

          {/* Modal content */}
          <div className="relative mx-4 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl">
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  New Leave Request
                </h2>
                <p className="text-sm text-gray-500">
                  Submit a new leave request for an employee.
                </p>
              </div>
              <button
                onClick={() => setShowLeaveModal(false)}
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleLeaveSubmit} className="px-6 py-5">
              <div className="space-y-5">
                {/* Employee Select */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Employee <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      name="employeeId"
                      required
                      value={leaveForm.employeeId}
                      onChange={handleLeaveFormChange}
                      className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2 pr-9 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">Select employee</option>
                      {mockEmployees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} ({emp.employeeNumber})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>

                {/* Leave Type */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Leave Type <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      name="leaveType"
                      required
                      value={leaveForm.leaveType}
                      onChange={handleLeaveFormChange}
                      className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2 pr-9 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {LEAVE_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {formatLabel(type)}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>

                {/* Date Range */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Start Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="startDate"
                      required
                      value={leaveForm.startDate}
                      onChange={handleLeaveFormChange}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      End Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="endDate"
                      required
                      value={leaveForm.endDate}
                      onChange={handleLeaveFormChange}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Reason */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Reason <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="reason"
                    rows={3}
                    required
                    value={leaveForm.reason}
                    onChange={handleLeaveFormChange}
                    placeholder="Provide a reason for the leave request..."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Form Actions */}
              <div className="mt-6 flex items-center justify-end gap-3 border-t border-gray-200 pt-5">
                <button
                  type="button"
                  onClick={() => setShowLeaveModal(false)}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
