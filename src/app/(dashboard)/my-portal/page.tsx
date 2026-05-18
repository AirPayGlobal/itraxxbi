"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  ListTodo,
  Ticket,
  FileText,
  CalendarDays,
  User,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Briefcase,
  TrendingUp,
  Sparkles,
  MessageSquare,
  CalendarClock,
  BarChart3,
  ChevronRight,
  Eye,
  X,
  Filter,
  Award,
  Shield,
  Zap,
  Heart,
  Star,
  MapPin,
  Phone,
  Mail,
  Building2,
  BadgeCheck,
  CalendarPlus,
  Download,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { cn, formatCurrency, formatDate, getStatusColor, getPriorityColor } from "@/lib/utils";
import { getActivityLogForEmployee } from "@/lib/activity-store";
import { getPayslipsForEmployee, type Payslip } from "@/lib/payslip-engine";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EMPLOYEE_ID = "1";
const EMPLOYEE_NAME = "John Mutua";

const tabs = [
  { id: "dashboard", label: "My Dashboard", icon: LayoutDashboard },
  { id: "tasks", label: "My Tasks", icon: ListTodo },
  { id: "tickets", label: "My Tickets", icon: Ticket },
  { id: "payslips", label: "My Payslips", icon: FileText },
  { id: "leave", label: "My Leave", icon: CalendarDays },
  { id: "profile", label: "My Profile", icon: User },
] as const;

type TabId = (typeof tabs)[number]["id"];

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: "easeOut" as const },
  }),
};

const fadeIn = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

// ---------------------------------------------------------------------------
// Mock Data — Tasks
// ---------------------------------------------------------------------------

type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";

interface MyTask {
  id: string;
  title: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  dueDate: string;
  status: TaskStatus;
  project: string;
}

const myTasks: MyTask[] = [
  {
    id: "TSK-041",
    title: "Complete GPS installation at Namibia Breweries (WK-4521)",
    priority: "HIGH",
    dueDate: "2026-03-02",
    status: "IN_PROGRESS",
    project: "Fleet Tracker Rollout",
  },
  {
    id: "TSK-042",
    title: "Inspect tamper alert on vehicle N-8832",
    priority: "URGENT",
    dueDate: "2026-03-02",
    status: "TODO",
    project: "Vehicle Diagnostics",
  },
  {
    id: "TSK-043",
    title: "Deploy firmware update for O&L fleet (18 devices)",
    priority: "HIGH",
    dueDate: "2026-03-03",
    status: "TODO",
    project: "Firmware Updates",
  },
  {
    id: "TSK-044",
    title: "Submit weekly installation report",
    priority: "MEDIUM",
    dueDate: "2026-03-02",
    status: "TODO",
    project: "Reporting",
  },
  {
    id: "TSK-045",
    title: "Calibrate SinoTrack devices for TransNamib fleet",
    priority: "MEDIUM",
    dueDate: "2026-03-05",
    status: "IN_PROGRESS",
    project: "Fleet Maintenance",
  },
  {
    id: "TSK-046",
    title: "Replace wiring harness on vehicle WK-3301",
    priority: "HIGH",
    dueDate: "2026-03-04",
    status: "DONE",
    project: "Vehicle Diagnostics",
  },
  {
    id: "TSK-047",
    title: "Update client documentation for API integration",
    priority: "LOW",
    dueDate: "2026-03-07",
    status: "DONE",
    project: "Documentation",
  },
  {
    id: "TSK-048",
    title: "Conduct safety audit on Windhoek warehouse GPS stock",
    priority: "MEDIUM",
    dueDate: "2026-02-28",
    status: "DONE",
    project: "Inventory",
  },
];

// ---------------------------------------------------------------------------
// Mock Data — Tickets
// ---------------------------------------------------------------------------

interface MyTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  customer: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status: string;
  lastUpdated: string;
}

const myTickets: MyTicket[] = [
  {
    id: "1",
    ticketNumber: "TKT-2602-0004",
    subject: "Dashboard showing incorrect vehicle locations",
    customer: "Ohlthaver & List",
    priority: "HIGH",
    status: "IN_PROGRESS",
    lastUpdated: "2026-02-27T17:00:00",
  },
  {
    id: "2",
    ticketNumber: "TKT-2602-0008",
    subject: "Tracker tamper alert on vehicle N-8832",
    customer: "Pupkewitz Motors",
    priority: "URGENT",
    status: "OPEN",
    lastUpdated: "2026-03-01T08:00:00",
  },
  {
    id: "3",
    ticketNumber: "TKT-2601-0015",
    subject: "GPS device power drain on vehicle WK-3301",
    customer: "Ohlthaver & List",
    priority: "MEDIUM",
    status: "RESOLVED",
    lastUpdated: "2026-02-20T14:30:00",
  },
  {
    id: "4",
    ticketNumber: "TKT-2601-0018",
    subject: "Intermittent signal loss on 2 fleet vehicles",
    customer: "Namibia Breweries Ltd",
    priority: "HIGH",
    status: "RESOLVED",
    lastUpdated: "2026-02-22T11:00:00",
  },
  {
    id: "5",
    ticketNumber: "TKT-2603-0001",
    subject: "New tracker provisioning for 3 vehicles",
    customer: "TransNamib Holdings",
    priority: "MEDIUM",
    status: "OPEN",
    lastUpdated: "2026-03-01T14:00:00",
  },
];

// ---------------------------------------------------------------------------
// Mock Data — Leave
// ---------------------------------------------------------------------------

interface LeaveRequest {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  days: number;
  status: "APPROVED" | "PENDING" | "REJECTED";
  reason: string;
}

const leaveHistory: LeaveRequest[] = [
  {
    id: "LV-001",
    type: "Annual",
    startDate: "2025-12-22",
    endDate: "2025-12-31",
    days: 7,
    status: "APPROVED",
    reason: "Year-end family holiday",
  },
  {
    id: "LV-002",
    type: "Sick",
    startDate: "2026-01-15",
    endDate: "2026-01-16",
    days: 2,
    status: "APPROVED",
    reason: "Flu / doctor's note submitted",
  },
  {
    id: "LV-003",
    type: "Annual",
    startDate: "2026-02-14",
    endDate: "2026-02-14",
    days: 1,
    status: "APPROVED",
    reason: "Personal day",
  },
  {
    id: "LV-004",
    type: "Annual",
    startDate: "2026-04-10",
    endDate: "2026-04-14",
    days: 3,
    status: "PENDING",
    reason: "Easter family visit to Oshakati",
  },
];

// ---------------------------------------------------------------------------
// Schedule data
// ---------------------------------------------------------------------------

const todaySchedule = [
  { time: "08:00", title: "Team standup meeting", type: "meeting" },
  { time: "09:30", title: "On-site installation at Namibia Breweries (WK-4521)", type: "fieldwork" },
  { time: "11:00", title: "GPS device inspection (N-8832 tamper alert)", type: "urgent" },
  { time: "14:00", title: "Firmware update deployment for O&L fleet", type: "technical" },
  { time: "16:00", title: "Submit daily report", type: "admin" },
];

// ---------------------------------------------------------------------------
// TRAXX AI Quick Actions
// ---------------------------------------------------------------------------

const traxxActions = [
  {
    prompt: "What are my priorities today?",
    description: "Get an AI summary of your most important tasks and deadlines",
    icon: Sparkles,
    color: "from-purple-500 to-indigo-600",
  },
  {
    prompt: "Schedule my tasks for the week",
    description: "Let AI optimise your weekly schedule based on priorities",
    icon: CalendarClock,
    color: "from-blue-500 to-cyan-600",
  },
  {
    prompt: "Show my performance summary",
    description: "View AI-generated insights on your recent performance metrics",
    icon: BarChart3,
    color: "from-emerald-500 to-teal-600",
  },
];

// ---------------------------------------------------------------------------
// Helper: greeting based on time of day
// ---------------------------------------------------------------------------

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const motivationalQuotes = [
  "Excellence is not a destination but a continuous journey.",
  "Every device installed is a fleet made safer.",
  "Precision today, reliability tomorrow.",
  "Your expertise keeps Namibia moving.",
];

// ---------------------------------------------------------------------------
// Component: KPI Card
// ---------------------------------------------------------------------------

function KpiCard({
  title,
  value,
  icon: Icon,
  color,
  index,
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  index: number;
}) {
  return (
    <motion.div
      custom={index}
      initial="hidden"
      animate="visible"
      variants={cardVariants}
      className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={cn("rounded-xl p-3", color)}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function MyPortalPage() {
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [taskFilter, setTaskFilter] = useState<"all" | "today" | "week" | "overdue">("all");
  const [tasks, setTasks] = useState<MyTask[]>(myTasks);
  const [payslipModal, setPayslipModal] = useState<Payslip | null>(null);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    leaveType: "Annual Leave",
    startDate: "",
    endDate: "",
    reason: "",
  });

  // Fetch live data
  const activityLog = useMemo(() => getActivityLogForEmployee(EMPLOYEE_ID), []);
  const payslips = useMemo(() => getPayslipsForEmployee(EMPLOYEE_ID), []);
  const openTicketsCount = useMemo(
    () => {
      const assignedTicketNums = new Set(
        activityLog
          .filter((a) => a.type === "TICKET_ASSIGNED")
          .map((a) => a.ticketNumber)
      );
      const resolvedTicketNums = new Set(
        activityLog
          .filter((a) => a.type === "TICKET_RESOLVED" || a.type === "TICKET_CLOSED")
          .map((a) => a.ticketNumber)
      );
      let count = 0;
      assignedTicketNums.forEach((t) => {
        if (!resolvedTicketNums.has(t)) count++;
      });
      return count;
    },
    [activityLog]
  );

  // Task filter logic
  const filteredTasks = useMemo(() => {
    const now = new Date("2026-03-02");
    return tasks.filter((t) => {
      if (taskFilter === "today") {
        return t.dueDate === "2026-03-02";
      }
      if (taskFilter === "week") {
        const due = new Date(t.dueDate);
        const weekEnd = new Date("2026-03-08");
        return due >= now && due <= weekEnd;
      }
      if (taskFilter === "overdue") {
        const due = new Date(t.dueDate);
        return due < now && t.status !== "DONE";
      }
      return true;
    });
  }, [tasks, taskFilter]);

  // Toggle task status
  function cycleStatus(taskId: string) {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const next: Record<TaskStatus, TaskStatus> = {
          TODO: "IN_PROGRESS",
          IN_PROGRESS: "DONE",
          DONE: "TODO",
        };
        return { ...t, status: next[t.status] };
      })
    );
  }

  // Today's date formatted
  const todayFormatted = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());

  const quote = motivationalQuotes[new Date().getDate() % motivationalQuotes.length];

  // ---------------------------------------------------------------------------
  // Tab: My Dashboard
  // ---------------------------------------------------------------------------

  function renderDashboard() {
    return (
      <motion.div initial="hidden" animate="visible" variants={fadeIn} className="space-y-6">
        {/* Welcome Banner */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="rounded-2xl bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 p-6 text-white shadow-lg"
        >
          <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold">
                {getGreeting()}, John
              </h2>
              <p className="mt-1 text-blue-100">{todayFormatted}</p>
              <p className="mt-2 text-sm italic text-blue-200">&ldquo;{quote}&rdquo;</p>
            </div>
            <div className="mt-4 flex items-center gap-2 md:mt-0">
              <div className="rounded-full bg-white/20 px-4 py-2 text-sm font-medium backdrop-blur-sm">
                Senior Technician &middot; Operations
              </div>
            </div>
          </div>
        </motion.div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            title="Tasks Due Today"
            value={3}
            icon={ListTodo}
            color="bg-blue-600"
            index={0}
          />
          <KpiCard
            title="Open Tickets"
            value={openTicketsCount}
            icon={Ticket}
            color="bg-orange-500"
            index={1}
          />
          <KpiCard
            title="Jobs This Month"
            value={28}
            icon={Briefcase}
            color="bg-emerald-600"
            index={2}
          />
          <KpiCard
            title="Performance Score"
            value="95%"
            icon={TrendingUp}
            color="bg-purple-600"
            index={3}
          />
        </div>

        {/* Bottom Row: Schedule + TRAXX AI */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Today's Schedule */}
          <motion.div
            custom={4}
            initial="hidden"
            animate="visible"
            variants={cardVariants}
            className="col-span-1 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2"
          >
            <div className="mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Today&apos;s Schedule</h3>
            </div>
            <div className="relative space-y-0">
              {todaySchedule.map((item, idx) => {
                const typeColors: Record<string, string> = {
                  meeting: "bg-blue-500",
                  fieldwork: "bg-emerald-500",
                  urgent: "bg-red-500",
                  technical: "bg-purple-500",
                  admin: "bg-gray-400",
                };
                const dotColor = typeColors[item.type] || "bg-gray-400";
                return (
                  <div key={idx} className="flex items-start gap-4 py-3">
                    {/* Timeline line + dot */}
                    <div className="flex flex-col items-center">
                      <div className={cn("h-3 w-3 rounded-full ring-4 ring-white", dotColor)} />
                      {idx < todaySchedule.length - 1 && (
                        <div className="h-full w-0.5 bg-gray-200" style={{ minHeight: "32px" }} />
                      )}
                    </div>
                    <div className="-mt-0.5 flex-1">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-gray-500 tabular-nums">{item.time}</span>
                        <span className="text-sm font-medium text-gray-900">{item.title}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* TRAXX AI Quick Actions */}
          <motion.div
            custom={5}
            initial="hidden"
            animate="visible"
            variants={cardVariants}
            className="col-span-1 space-y-3"
          >
            <div className="mb-1 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-900">TRAXX AI Quick Actions</h3>
            </div>
            {traxxActions.map((action, idx) => (
              <motion.a
                key={idx}
                href="/traxx"
                custom={idx + 6}
                initial="hidden"
                animate="visible"
                variants={cardVariants}
                className="group flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:shadow-md hover:border-blue-300"
              >
                <div className={cn("rounded-lg bg-gradient-to-br p-2.5 text-white", action.color)}>
                  <action.icon className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                    &ldquo;{action.prompt}&rdquo;
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">{action.description}</p>
                </div>
                <ChevronRight className="mt-1 h-4 w-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
              </motion.a>
            ))}
          </motion.div>
        </div>
      </motion.div>
    );
  }

  // ---------------------------------------------------------------------------
  // Tab: My Tasks
  // ---------------------------------------------------------------------------

  function renderTasks() {
    const filterPills: { key: typeof taskFilter; label: string }[] = [
      { key: "all", label: "All" },
      { key: "today", label: "Today" },
      { key: "week", label: "This Week" },
      { key: "overdue", label: "Overdue" },
    ];

    return (
      <motion.div initial="hidden" animate="visible" variants={fadeIn} className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          {filterPills.map((pill) => (
            <button
              key={pill.key}
              onClick={() => setTaskFilter(pill.key)}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                taskFilter === pill.key
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Task List */}
        <div className="space-y-3">
          {filteredTasks.map((task, idx) => (
            <motion.div
              key={task.id}
              custom={idx}
              initial="hidden"
              animate="visible"
              variants={cardVariants}
              className={cn(
                "flex items-center gap-4 rounded-xl border bg-white p-4 shadow-sm transition-all hover:shadow-md",
                task.status === "DONE" ? "border-green-200 bg-green-50/50" : "border-gray-200"
              )}
            >
              {/* Status toggle */}
              <button
                onClick={() => cycleStatus(task.id)}
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                  task.status === "DONE"
                    ? "border-green-500 bg-green-500 text-white"
                    : task.status === "IN_PROGRESS"
                    ? "border-blue-500 bg-blue-50 text-blue-600"
                    : "border-gray-300 bg-white text-gray-400 hover:border-gray-400"
                )}
              >
                {task.status === "DONE" ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : task.status === "IN_PROGRESS" ? (
                  <Clock className="h-4 w-4" />
                ) : (
                  <div className="h-2 w-2 rounded-full bg-gray-300" />
                )}
              </button>

              {/* Task details */}
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "text-sm font-medium",
                    task.status === "DONE" ? "text-gray-400 line-through" : "text-gray-900"
                  )}
                >
                  {task.title}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  <span className="font-mono">{task.id}</span>
                  <span>&middot;</span>
                  <span>{task.project}</span>
                  <span>&middot;</span>
                  <span>Due {formatDate(task.dueDate)}</span>
                </div>
              </div>

              {/* Priority badge */}
              <span
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                  getPriorityColor(task.priority)
                )}
              >
                {task.priority}
              </span>

              {/* Status badge */}
              <span
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                  getStatusColor(task.status)
                )}
              >
                {task.status.replace("_", " ")}
              </span>
            </motion.div>
          ))}

          {filteredTasks.length === 0 && (
            <div className="py-12 text-center text-sm text-gray-400">
              No tasks match the current filter.
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  // ---------------------------------------------------------------------------
  // Tab: My Tickets
  // ---------------------------------------------------------------------------

  function renderTickets() {
    return (
      <motion.div initial="hidden" animate="visible" variants={fadeIn}>
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/80 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  <th className="px-6 py-3">Ticket #</th>
                  <th className="px-6 py-3">Subject</th>
                  <th className="px-6 py-3">Customer</th>
                  <th className="px-6 py-3">Priority</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Last Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {myTickets.map((ticket, idx) => (
                  <motion.tr
                    key={ticket.id}
                    custom={idx}
                    initial="hidden"
                    animate="visible"
                    variants={cardVariants}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="whitespace-nowrap px-6 py-4 font-mono text-sm font-medium text-blue-600">
                      {ticket.ticketNumber}
                    </td>
                    <td className="px-6 py-4 text-gray-900 font-medium max-w-xs truncate">
                      {ticket.subject}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-gray-600">
                      {ticket.customer}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                          getPriorityColor(ticket.priority)
                        )}
                      >
                        {ticket.priority}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                          getStatusColor(ticket.status)
                        )}
                      >
                        {ticket.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-gray-500 text-xs">
                      {formatDate(ticket.lastUpdated)}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>
    );
  }

  // ---------------------------------------------------------------------------
  // Tab: My Payslips
  // ---------------------------------------------------------------------------

  function renderPayslips() {
    return (
      <motion.div initial="hidden" animate="visible" variants={fadeIn} className="space-y-4">
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/80 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  <th className="px-6 py-3">Period</th>
                  <th className="px-6 py-3">Pay Date</th>
                  <th className="px-6 py-3 text-right">Gross</th>
                  <th className="px-6 py-3 text-right">Deductions</th>
                  <th className="px-6 py-3 text-right">Net Pay</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payslips.map((ps, idx) => (
                  <motion.tr
                    key={ps.id}
                    custom={idx}
                    initial="hidden"
                    animate="visible"
                    variants={cardVariants}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="whitespace-nowrap px-6 py-4 font-medium text-gray-900">
                      {ps.payPeriod}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-gray-600">
                      {formatDate(ps.payDate)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right font-mono text-gray-900">
                      N${ps.grossPay.toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right font-mono text-red-600">
                      -N${ps.totalDeductions.toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right font-mono font-semibold text-emerald-700">
                      N${ps.netPay.toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                          getStatusColor(ps.status)
                        )}
                      >
                        {ps.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <button
                        onClick={() => setPayslipModal(ps)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View Payslip
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {payslips.length === 0 && (
            <div className="py-12 text-center text-sm text-gray-400">
              No payslips found.
            </div>
          )}
        </div>

        {/* Payslip Preview Modal */}
        {payslipModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
            >
              <button
                onClick={() => setPayslipModal(null)}
                className="absolute right-4 top-4 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="mb-6 border-b border-gray-100 pb-4">
                <h3 className="text-lg font-bold text-gray-900">Payslip Preview</h3>
                <p className="text-sm text-gray-500">
                  {payslipModal.payPeriod} &middot; {payslipModal.payslipNumber}
                </p>
              </div>

              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-4 rounded-xl bg-gray-50 p-4">
                  <div>
                    <p className="text-xs text-gray-400">Employee</p>
                    <p className="font-medium text-gray-900">{payslipModal.employee.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Employee #</p>
                    <p className="font-medium text-gray-900">{payslipModal.employee.employeeNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Department</p>
                    <p className="font-medium text-gray-900">{payslipModal.employee.department}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Job Title</p>
                    <p className="font-medium text-gray-900">{payslipModal.employee.jobTitle}</p>
                  </div>
                </div>

                {/* Earnings */}
                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Earnings</h4>
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Basic Salary</span>
                      <span className="font-mono text-gray-900">N${payslipModal.employee.basicSalary.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Housing Allowance</span>
                      <span className="font-mono text-gray-900">N${payslipModal.employee.allowances.housing.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Transport Allowance</span>
                      <span className="font-mono text-gray-900">N${payslipModal.employee.allowances.transport.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Medical Allowance</span>
                      <span className="font-mono text-gray-900">N${payslipModal.employee.allowances.medical.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Overtime</span>
                      <span className="font-mono text-gray-900">N${payslipModal.employee.allowances.overtime.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-t border-gray-200 pt-1.5 font-semibold">
                      <span className="text-gray-900">Gross Pay</span>
                      <span className="font-mono text-gray-900">N${payslipModal.grossPay.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Deductions */}
                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Deductions</h4>
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-gray-600">PAYE Tax</span>
                      <span className="font-mono text-red-600">-N${payslipModal.employee.deductions.paye.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Social Security</span>
                      <span className="font-mono text-red-600">-N${payslipModal.employee.deductions.socialSecurity.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Medical Aid</span>
                      <span className="font-mono text-red-600">-N${payslipModal.employee.deductions.medicalAid.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Pension Fund</span>
                      <span className="font-mono text-red-600">-N${payslipModal.employee.deductions.pension.toLocaleString()}</span>
                    </div>
                    {payslipModal.employee.deductions.unionFees > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Union Fees</span>
                        <span className="font-mono text-red-600">-N${payslipModal.employee.deductions.unionFees.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-gray-200 pt-1.5 font-semibold">
                      <span className="text-gray-900">Total Deductions</span>
                      <span className="font-mono text-red-600">-N${payslipModal.totalDeductions.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Net Pay */}
                <div className="rounded-xl bg-emerald-50 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-emerald-900">Net Pay</span>
                    <span className="text-xl font-bold font-mono text-emerald-700">
                      N${payslipModal.netPay.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setPayslipModal(null)}
                  className="flex-1 rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => toast.success("Downloading payslip PDF...")}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Download PDF
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </motion.div>
    );
  }

  // ---------------------------------------------------------------------------
  // Tab: My Leave
  // ---------------------------------------------------------------------------

  function renderLeave() {
    const leaveBalances = [
      { type: "Annual Leave", remaining: 12, total: 20, color: "bg-blue-500", bgLight: "bg-blue-50", textColor: "text-blue-700", icon: CalendarDays },
      { type: "Sick Leave", remaining: 8, total: 10, color: "bg-amber-500", bgLight: "bg-amber-50", textColor: "text-amber-700", icon: Heart },
      { type: "Compassionate", remaining: 3, total: 5, color: "bg-purple-500", bgLight: "bg-purple-50", textColor: "text-purple-700", icon: Shield },
    ];

    return (
      <motion.div initial="hidden" animate="visible" variants={fadeIn} className="space-y-6">
        {/* Leave Balance Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {leaveBalances.map((lb, idx) => (
            <motion.div
              key={lb.type}
              custom={idx}
              initial="hidden"
              animate="visible"
              variants={cardVariants}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className={cn("rounded-xl p-2.5", lb.bgLight)}>
                  <lb.icon className={cn("h-5 w-5", lb.textColor)} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">{lb.type}</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {lb.remaining}{" "}
                    <span className="text-sm font-normal text-gray-400">/ {lb.total} days</span>
                  </p>
                </div>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
                <div
                  className={cn("h-full rounded-full transition-all", lb.color)}
                  style={{ width: `${(lb.remaining / lb.total) * 100}%` }}
                />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Request Leave Button */}
        <div className="flex justify-end">
          <button
            onClick={() => setLeaveModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            <CalendarPlus className="h-4 w-4" />
            Request Leave
          </button>
        </div>

        {/* Leave History Table */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/80 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  <th className="px-6 py-3">ID</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Start</th>
                  <th className="px-6 py-3">End</th>
                  <th className="px-6 py-3">Days</th>
                  <th className="px-6 py-3">Reason</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {leaveHistory.map((lv, idx) => (
                  <motion.tr
                    key={lv.id}
                    custom={idx}
                    initial="hidden"
                    animate="visible"
                    variants={cardVariants}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="whitespace-nowrap px-6 py-4 font-mono text-sm font-medium text-gray-600">
                      {lv.id}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-gray-900 font-medium">
                      {lv.type}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-gray-600">
                      {formatDate(lv.startDate)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-gray-600">
                      {formatDate(lv.endDate)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-center text-gray-900 font-medium">
                      {lv.days}
                    </td>
                    <td className="px-6 py-4 text-gray-600 max-w-xs truncate">
                      {lv.reason}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                          getStatusColor(lv.status)
                        )}
                      >
                        {lv.status}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Request Leave Modal */}
        {leaveModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            >
              <button
                onClick={() => setLeaveModalOpen(false)}
                className="absolute right-4 top-4 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>

              <h3 className="text-lg font-bold text-gray-900 mb-5">Request Leave</h3>

              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  toast.success("Leave request submitted");
                  setLeaveModalOpen(false);
                  setLeaveForm({ leaveType: "Annual Leave", startDate: "", endDate: "", reason: "" });
                }}
              >
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Leave Type</label>
                  <select
                    value={leaveForm.leaveType}
                    onChange={(e) => setLeaveForm((prev) => ({ ...prev, leaveType: e.target.value }))}
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option>Annual Leave</option>
                    <option>Sick Leave</option>
                    <option>Compassionate Leave</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Start Date</label>
                    <input
                      type="date"
                      value={leaveForm.startDate}
                      onChange={(e) => setLeaveForm((prev) => ({ ...prev, startDate: e.target.value }))}
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">End Date</label>
                    <input
                      type="date"
                      value={leaveForm.endDate}
                      onChange={(e) => setLeaveForm((prev) => ({ ...prev, endDate: e.target.value }))}
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Reason</label>
                  <textarea
                    rows={3}
                    value={leaveForm.reason}
                    onChange={(e) => setLeaveForm((prev) => ({ ...prev, reason: e.target.value }))}
                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none"
                    placeholder="Brief description..."
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setLeaveModalOpen(false)}
                    className="flex-1 rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                  >
                    <Send className="h-4 w-4" />
                    Submit Request
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </motion.div>
    );
  }

  // ---------------------------------------------------------------------------
  // Tab: My Profile
  // ---------------------------------------------------------------------------

  function renderProfile() {
    const profileDetails = [
      { label: "Full Name", value: "John Mutua", icon: User },
      { label: "Employee Number", value: "EMP-001", icon: BadgeCheck },
      { label: "Department", value: "Operations", icon: Building2 },
      { label: "Job Title", value: "Senior Technician", icon: Briefcase },
      { label: "Email", value: "j.mutua@itrackerx.com", icon: Mail },
      { label: "Phone", value: "+264 81 234 5678", icon: Phone },
      { label: "Start Date", value: "15 Mar 2021", icon: CalendarDays },
    ];

    const skills = [
      "GPS Installation",
      "Vehicle Wiring",
      "SinoTrack Configuration",
      "First Aid",
    ];

    const badges = [
      {
        title: "Top Performer Feb 2026",
        description: "Highest resolution rate in Operations",
        icon: Award,
        color: "from-amber-400 to-orange-500",
        bgLight: "bg-amber-50",
      },
      {
        title: "Customer Favourite",
        description: "4.7 average satisfaction rating",
        icon: Star,
        color: "from-pink-400 to-rose-500",
        bgLight: "bg-pink-50",
      },
      {
        title: "Speed Demon",
        description: "Fastest average first-response time",
        icon: Zap,
        color: "from-blue-400 to-indigo-500",
        bgLight: "bg-blue-50",
      },
    ];

    return (
      <motion.div initial="hidden" animate="visible" variants={fadeIn} className="space-y-6">
        {/* Profile Header */}
        <motion.div
          custom={0}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
          className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
        >
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-2xl font-bold text-white shadow-lg">
                JM
              </div>
              <button
                onClick={() => toast.info("Photo upload — coming soon")}
                className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
              >
                Change Photo
              </button>
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h3 className="text-xl font-bold text-gray-900">John Mutua</h3>
              <p className="text-sm text-gray-500">Senior Technician &middot; Operations Department</p>
              <p className="mt-1 text-xs text-gray-400">Employee since March 2021 &middot; 5 years at ITRACKERX</p>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Employee Details */}
          <motion.div
            custom={1}
            initial="hidden"
            animate="visible"
            variants={cardVariants}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
          >
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">
              Employee Details
            </h4>
            <div className="space-y-3">
              {profileDetails.map((detail) => (
                <div key={detail.label} className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                    <detail.icon className="h-4 w-4 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">{detail.label}</p>
                    <p className="text-sm font-medium text-gray-900">{detail.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Skills & Certifications */}
          <div className="space-y-6">
            <motion.div
              custom={2}
              initial="hidden"
              animate="visible"
              variants={cardVariants}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
            >
              <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">
                Skills & Certifications
              </h4>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3.5 py-1.5 text-sm font-medium text-blue-700"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {skill}
                  </span>
                ))}
              </div>
            </motion.div>

            {/* Performance Badges */}
            <motion.div
              custom={3}
              initial="hidden"
              animate="visible"
              variants={cardVariants}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
            >
              <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">
                Performance Badges
              </h4>
              <div className="space-y-3">
                {badges.map((badge, idx) => (
                  <motion.div
                    key={badge.title}
                    custom={idx + 4}
                    initial="hidden"
                    animate="visible"
                    variants={cardVariants}
                    className="flex items-center gap-3 rounded-xl border border-gray-100 p-3 transition-all hover:shadow-sm"
                  >
                    <div className={cn("rounded-xl bg-gradient-to-br p-2.5 text-white", badge.color)}>
                      <badge.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{badge.title}</p>
                      <p className="text-xs text-gray-500">{badge.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render active tab
  // ---------------------------------------------------------------------------

  function renderActiveTab() {
    switch (activeTab) {
      case "dashboard":
        return renderDashboard();
      case "tasks":
        return renderTasks();
      case "tickets":
        return renderTickets();
      case "payslips":
        return renderPayslips();
      case "leave":
        return renderLeave();
      case "profile":
        return renderProfile();
      default:
        return null;
    }
  }

  // ---------------------------------------------------------------------------
  // Main Layout
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen space-y-6 p-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Portal</h1>
        <p className="text-sm text-gray-500">
          Employee Self-Service Portal &mdash; manage your tasks, tickets, payslips, leave, and profile
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-1 overflow-x-auto" aria-label="Portal tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap",
                  isActive
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div>{renderActiveTab()}</div>
    </div>
  );
}
