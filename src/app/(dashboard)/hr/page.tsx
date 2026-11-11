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
  UserCircle,
  Loader2,
} from "lucide-react";
import { cn, getStatusColor, formatDate } from "@/lib/utils";
import {
  useProfiles,
  useEmployees,
  useCreateEmployee,
  useLeaveRequests,
  useCreateLeaveRequest,
  useSetLeaveStatus,
  type Employee,
  type LeaveRequest,
  type Profile,
} from "@/lib/hooks/use-hr";
import type {
  ContractType,
  LeaveType,
} from "@/lib/supabase/database.types";

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

function getLeaveTypeBadgeColor(type: string): string {
  const map: Record<string, string> = {
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

function getContractTypeBadgeColor(type: string): string {
  const map: Record<string, string> = {
    PERMANENT: "bg-green-100 text-green-800",
    FIXED_TERM: "bg-blue-100 text-blue-800",
    PART_TIME: "bg-amber-100 text-amber-800",
    CONTRACTOR: "bg-gray-100 text-gray-800",
  };
  return map[type] || "bg-gray-100 text-gray-800";
}

function dayCount(startISO: string, endISO: string): number {
  const start = new Date(startISO);
  const end = new Date(endISO);
  const diff = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
}

function balanceColor(value: number, mid: number, low: number): string {
  if (value > mid) return "bg-green-100 text-green-700";
  if (value > low) return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-700";
}

const LEAVE_STATUS_FILTERS = ["All", "PENDING", "APPROVED", "REJECTED", "CANCELLED"] as const;

const LEAVE_TYPES: LeaveType[] = [
  "ANNUAL",
  "SICK",
  "COMPASSIONATE",
  "MATERNITY",
  "PATERNITY",
  "UNPAID",
  "STUDY",
];

const CONTRACT_TYPES: ContractType[] = [
  "PERMANENT",
  "FIXED_TERM",
  "PART_TIME",
  "CONTRACTOR",
];

// Enriched view models -------------------------------------------------------

type EnrichedEmployee = Employee & {
  name: string;
  department: string | null;
  jobTitle: string | null;
};

type EnrichedLeave = LeaveRequest & { employeeName: string };

export default function HRPage() {
  const { data: profiles = [] } = useProfiles();
  const {
    data: employees = [],
    isLoading: empLoading,
  } = useEmployees();
  const {
    data: leaveRequests = [],
    isLoading: leaveLoading,
  } = useLeaveRequests();
  const createEmployee = useCreateEmployee();
  const createLeave = useCreateLeaveRequest();
  const setLeaveStatus = useSetLeaveStatus();

  const [activeTab, setActiveTab] = useState<"leave" | "directory">("leave");
  const [leaveStatusFilter, setLeaveStatusFilter] = useState<string>("All");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showEmpModal, setShowEmpModal] = useState(false);

  const [leaveForm, setLeaveForm] = useState({
    user_id: "",
    leave_type: "ANNUAL" as LeaveType,
    start_date: "",
    end_date: "",
    reason: "",
  });
  const [empForm, setEmpForm] = useState({
    user_id: "",
    employee_number: "",
    start_date: "",
    contract_type: "PERMANENT" as ContractType,
  });

  // Resolve names via profiles map.
  const profileMap = useMemo(() => {
    const m = new Map<string, Profile>();
    for (const p of profiles) m.set(p.id, p);
    return m;
  }, [profiles]);

  const enrichedEmployees: EnrichedEmployee[] = useMemo(
    () =>
      employees.map((e) => {
        const p = profileMap.get(e.user_id);
        return {
          ...e,
          name: p?.name ?? "Unknown",
          department: p?.department ?? null,
          jobTitle: p?.job_title ?? null,
        };
      }),
    [employees, profileMap]
  );

  const enrichedLeave: EnrichedLeave[] = useMemo(
    () =>
      leaveRequests.map((lr) => ({
        ...lr,
        employeeName: profileMap.get(lr.user_id)?.name ?? "Unknown",
      })),
    [leaveRequests, profileMap]
  );

  // Profiles without an employee record — candidates for "Add Employee".
  const unlinkedProfiles = useMemo(() => {
    const linked = new Set(employees.map((e) => e.user_id));
    return profiles.filter((p) => !linked.has(p.id));
  }, [profiles, employees]);

  // KPIs
  const totalEmployees = employees.length;
  const today = new Date();
  const onLeaveToday = leaveRequests.filter(
    (lr) =>
      lr.status === "APPROVED" &&
      new Date(lr.start_date) <= today &&
      new Date(lr.end_date) >= today
  ).length;
  const pendingRequests = leaveRequests.filter(
    (lr) => lr.status === "PENDING"
  ).length;
  const avgLeaveBalance =
    employees.length > 0
      ? employees.reduce((sum, e) => sum + e.annual_leave_balance, 0) /
        employees.length
      : 0;

  const filteredLeave = useMemo(
    () =>
      enrichedLeave.filter(
        (lr) => leaveStatusFilter === "All" || lr.status === leaveStatusFilter
      ),
    [enrichedLeave, leaveStatusFilter]
  );

  const filteredEmployees = useMemo(() => {
    if (!employeeSearch.trim()) return enrichedEmployees;
    const q = employeeSearch.toLowerCase();
    return enrichedEmployees.filter((emp) =>
      [emp.name, emp.employee_number, emp.department ?? "", emp.jobTitle ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [enrichedEmployees, employeeSearch]);

  async function handleLeaveSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (new Date(leaveForm.end_date) < new Date(leaveForm.start_date)) {
      const { toast } = await import("sonner");
      toast.error("End date cannot be before the start date.");
      return;
    }
    try {
      await createLeave.mutateAsync({
        user_id: leaveForm.user_id,
        leave_type: leaveForm.leave_type,
        start_date: leaveForm.start_date,
        end_date: leaveForm.end_date,
        days: dayCount(leaveForm.start_date, leaveForm.end_date),
        reason: leaveForm.reason || null,
      });
      setShowLeaveModal(false);
      setLeaveForm({
        user_id: "",
        leave_type: "ANNUAL",
        start_date: "",
        end_date: "",
        reason: "",
      });
    } catch {
      /* handled in hook */
    }
  }

  async function handleEmpSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createEmployee.mutateAsync({
        user_id: empForm.user_id,
        employee_number: empForm.employee_number,
        start_date: empForm.start_date,
        contract_type: empForm.contract_type,
      });
      setShowEmpModal(false);
      setEmpForm({
        user_id: "",
        employee_number: "",
        start_date: "",
        contract_type: "PERMANENT",
      });
    } catch {
      /* handled in hook */
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              HR &amp; Leave Management
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage employee leave requests, balances, and directory
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowEmpModal(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
            >
              <UserCircle className="h-4 w-4" />
              Add Employee
            </button>
            <button
              onClick={() => setShowLeaveModal(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <Plus className="h-4 w-4" />
              New Leave Request
            </button>
          </div>
        </div>

        {/* KPI Stats */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "Total Employees",
              value: empLoading ? "—" : String(totalEmployees),
              icon: Users,
              tint: "bg-blue-50 text-blue-600",
            },
            {
              label: "On Leave Today",
              value: leaveLoading ? "—" : String(onLeaveToday),
              icon: CalendarOff,
              tint: "bg-amber-50 text-amber-600",
            },
            {
              label: "Pending Requests",
              value: leaveLoading ? "—" : String(pendingRequests),
              icon: Clock,
              tint: "bg-orange-50 text-orange-600",
            },
            {
              label: "Avg Leave Balance",
              value: empLoading ? "—" : `${avgLeaveBalance.toFixed(1)} days`,
              icon: TreePalm,
              tint: "bg-green-50 text-green-600",
            },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-lg",
                    kpi.tint
                  )}
                >
                  <kpi.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    {kpi.label}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {kpi.value}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
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

        {/* Leave Requests Tab */}
        {activeTab === "leave" && (
          <>
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
                    {leaveLoading ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                          <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-blue-500" />
                          <p className="text-sm">Loading leave requests…</p>
                        </td>
                      </tr>
                    ) : filteredLeave.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
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
                      filteredLeave.map((lr) => (
                        <tr
                          key={lr.id}
                          className="transition-colors hover:bg-gray-50/70"
                        >
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
                          <td className="whitespace-nowrap px-4 py-3">
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                                getLeaveTypeBadgeColor(lr.leave_type)
                              )}
                            >
                              {formatLabel(lr.leave_type)}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                            {formatDate(lr.start_date)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                            {formatDate(lr.end_date)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-center font-medium text-gray-900">
                            {lr.days}
                          </td>
                          <td className="max-w-[200px] truncate px-4 py-3 text-gray-600">
                            {lr.reason ?? "—"}
                          </td>
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
                          <td className="whitespace-nowrap px-4 py-3">
                            <div className="flex items-center justify-center gap-1">
                              {lr.status === "PENDING" ? (
                                <>
                                  <button
                                    title="Approve"
                                    disabled={setLeaveStatus.isPending}
                                    onClick={() =>
                                      setLeaveStatus.mutate({
                                        id: lr.id,
                                        status: "APPROVED",
                                      })
                                    }
                                    className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-green-50 hover:text-green-600 disabled:opacity-50"
                                  >
                                    <Check className="h-4 w-4" />
                                  </button>
                                  <button
                                    title="Reject"
                                    disabled={setLeaveStatus.isPending}
                                    onClick={() =>
                                      setLeaveStatus.mutate({
                                        id: lr.id,
                                        status: "REJECTED",
                                      })
                                    }
                                    className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </button>
                                </>
                              ) : (
                                <span className="text-xs text-gray-400">--</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-gray-200 bg-gray-50 px-4 py-3">
                <p className="text-xs text-gray-500">
                  Showing{" "}
                  <span className="font-medium text-gray-700">
                    {filteredLeave.length}
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

        {/* Employee Directory Tab */}
        {activeTab === "directory" && (
          <>
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
                    {empLoading ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                          <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-blue-500" />
                          <p className="text-sm">Loading employees…</p>
                        </td>
                      </tr>
                    ) : filteredEmployees.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                          <UserCircle className="mx-auto mb-3 h-8 w-8 text-gray-300" />
                          <p className="text-sm font-medium">
                            No employees found
                          </p>
                          <p className="mt-1 text-xs">
                            {employees.length === 0
                              ? 'Use "Add Employee" to create an employee record.'
                              : "Try adjusting your search query."}
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredEmployees.map((emp) => (
                        <tr
                          key={emp.id}
                          className="transition-colors hover:bg-gray-50/70"
                        >
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
                          <td className="whitespace-nowrap px-4 py-3">
                            <span className="font-mono text-xs text-gray-600">
                              {emp.employee_number}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                            {emp.department ?? "—"}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                            {emp.jobTitle ?? "—"}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                                getContractTypeBadgeColor(emp.contract_type)
                              )}
                            >
                              {formatLabel(emp.contract_type)}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                            {formatDate(emp.start_date)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-center">
                            <span
                              className={cn(
                                "inline-flex min-w-[2rem] items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold",
                                balanceColor(emp.annual_leave_balance, 10, 5)
                              )}
                            >
                              {emp.annual_leave_balance}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-center">
                            <span
                              className={cn(
                                "inline-flex min-w-[2rem] items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold",
                                balanceColor(emp.sick_leave_balance, 5, 2)
                              )}
                            >
                              {emp.sick_leave_balance}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-center">
                            <span
                              className={cn(
                                "inline-flex min-w-[2rem] items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold",
                                balanceColor(emp.compassionate_leave_balance, 2, 0)
                              )}
                            >
                              {emp.compassionate_leave_balance}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-gray-200 bg-gray-50 px-4 py-3">
                <p className="text-xs text-gray-500">
                  Showing{" "}
                  <span className="font-medium text-gray-700">
                    {filteredEmployees.length}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium text-gray-700">
                    {employees.length}
                  </span>{" "}
                  employees
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* New Leave Request Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowLeaveModal(false)}
          />
          <div className="relative mx-4 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl">
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

            <form onSubmit={handleLeaveSubmit} className="px-6 py-5">
              <div className="space-y-5">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Employee <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      required
                      value={leaveForm.user_id}
                      onChange={(e) =>
                        setLeaveForm((p) => ({ ...p, user_id: e.target.value }))
                      }
                      className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2 pr-9 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">Select employee</option>
                      {enrichedEmployees.map((emp) => (
                        <option key={emp.id} value={emp.user_id}>
                          {emp.name} ({emp.employee_number})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  </div>
                  {enrichedEmployees.length === 0 && (
                    <p className="mt-1 text-xs text-amber-600">
                      No employees yet — add one first via &quot;Add Employee&quot;.
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Leave Type <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      required
                      value={leaveForm.leave_type}
                      onChange={(e) =>
                        setLeaveForm((p) => ({
                          ...p,
                          leave_type: e.target.value as LeaveType,
                        }))
                      }
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

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Start Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={leaveForm.start_date}
                      onChange={(e) =>
                        setLeaveForm((p) => ({
                          ...p,
                          start_date: e.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      End Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={leaveForm.end_date}
                      onChange={(e) =>
                        setLeaveForm((p) => ({ ...p, end_date: e.target.value }))
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Reason
                  </label>
                  <textarea
                    rows={3}
                    value={leaveForm.reason}
                    onChange={(e) =>
                      setLeaveForm((p) => ({ ...p, reason: e.target.value }))
                    }
                    placeholder="Provide a reason for the leave request..."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 border-t border-gray-200 pt-5">
                <button
                  type="button"
                  onClick={() => setShowLeaveModal(false)}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLeave.isPending}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50"
                >
                  {createLeave.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Employee Modal */}
      {showEmpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowEmpModal(false)}
          />
          <div className="relative mx-4 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Add Employee</h2>
                <p className="text-sm text-gray-500">
                  Create an employee record for an existing user account.
                </p>
              </div>
              <button
                onClick={() => setShowEmpModal(false)}
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEmpSubmit} className="px-6 py-5">
              <div className="space-y-5">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    User Account <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      required
                      value={empForm.user_id}
                      onChange={(e) =>
                        setEmpForm((p) => ({ ...p, user_id: e.target.value }))
                      }
                      className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2 pr-9 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">Select user</option>
                      {unlinkedProfiles.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                          {p.department ? ` — ${p.department}` : ""}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  </div>
                  {unlinkedProfiles.length === 0 && (
                    <p className="mt-1 text-xs text-amber-600">
                      Every user already has an employee record.
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Employee Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={empForm.employee_number}
                      onChange={(e) =>
                        setEmpForm((p) => ({
                          ...p,
                          employee_number: e.target.value,
                        }))
                      }
                      placeholder="EMP-001"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Start Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={empForm.start_date}
                      onChange={(e) =>
                        setEmpForm((p) => ({ ...p, start_date: e.target.value }))
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Contract Type <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      required
                      value={empForm.contract_type}
                      onChange={(e) =>
                        setEmpForm((p) => ({
                          ...p,
                          contract_type: e.target.value as ContractType,
                        }))
                      }
                      className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2 pr-9 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {CONTRACT_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {formatLabel(type)}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 border-t border-gray-200 pt-5">
                <button
                  type="button"
                  onClick={() => setShowEmpModal(false)}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createEmployee.isPending}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50"
                >
                  {createEmployee.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  Add Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
