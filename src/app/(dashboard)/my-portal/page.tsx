"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  ListTodo,
  Ticket,
  FileText,
  CalendarDays,
  User,
  Clock,
  CheckCircle2,
  Briefcase,
  Sparkles,
  CalendarClock,
  BarChart3,
  ChevronRight,
  Eye,
  X,
  Filter,
  Shield,
  Heart,
  Phone,
  Mail,
  Building2,
  BadgeCheck,
  CalendarPlus,
  Send,
  Wrench,
  MapPin,
  Loader2,
  AlertCircle,
  Inbox,
  Palmtree,
  UserCircle,
  FileSignature,
} from "lucide-react";
import { toast } from "sonner";
import { cn, formatCurrency, formatDate, getStatusColor, getPriorityColor } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/providers/session-provider";
import { canAccessRoute } from "@/lib/role-access";
import { useUpdateTask, useProjectsLite } from "@/lib/hooks/use-tasks";
import { useCreateLeaveRequest } from "@/lib/hooks/use-hr";
import { useCompanySettings } from "@/lib/hooks/use-company-settings";
import { useMyPayslips, useMarkPayslipViewed, type Payslip } from "@/lib/hooks/use-payslips";
import { amountLabel, formatPeriod } from "@/lib/payroll";
import type {
  EmployeeRow,
  JobCardRow,
  LeaveRequestRow,
  LeaveType,
  TaskRow,
  TaskStatus,
  TicketRow,
} from "@/lib/supabase/database.types";

const supabase = createClient();

// ---------------------------------------------------------------------------
// Data: everything here is scoped to the signed-in profile
// ---------------------------------------------------------------------------

function useMyTasks(userId: string | undefined) {
  return useQuery({
    queryKey: ["tasks", "mine", userId],
    enabled: !!userId,
    queryFn: async (): Promise<TaskRow[]> => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("assignee_id", userId!)
        .order("due_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

function useMyJobCards(userId: string | undefined) {
  return useQuery({
    queryKey: ["job_cards", "mine", userId],
    enabled: !!userId,
    queryFn: async (): Promise<JobCardRow[]> => {
      const { data, error } = await supabase
        .from("job_cards")
        .select("*")
        .eq("technician_id", userId!)
        .order("scheduled_date", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

function useMyTickets(userId: string | undefined) {
  return useQuery({
    queryKey: ["tickets", "mine", userId],
    enabled: !!userId,
    queryFn: async (): Promise<TicketRow[]> => {
      const { data, error } = await supabase
        .from("tickets")
        .select("*")
        .eq("assigned_to_id", userId!)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

function useMyLeave(userId: string | undefined) {
  return useQuery({
    queryKey: ["leave_requests", "mine", userId],
    enabled: !!userId,
    queryFn: async (): Promise<LeaveRequestRow[]> => {
      const { data, error } = await supabase
        .from("leave_requests")
        .select("*")
        .eq("user_id", userId!)
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

function useMyEmployee(userId: string | undefined) {
  return useQuery({
    queryKey: ["employees", "mine", userId],
    enabled: !!userId,
    queryFn: async (): Promise<EmployeeRow | null> => {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

// ---------------------------------------------------------------------------
// Constants & helpers
// ---------------------------------------------------------------------------

const tabs = [
  { id: "dashboard", label: "My Dashboard", icon: LayoutDashboard },
  { id: "tasks", label: "My Tasks", icon: ListTodo },
  { id: "jobs", label: "My Job Cards", icon: Wrench },
  { id: "tickets", label: "My Tickets", icon: Ticket },
  { id: "payslips", label: "My Payslips", icon: FileText },
  { id: "leave", label: "My Leave", icon: CalendarDays },
  { id: "profile", label: "My Profile", icon: User },
] as const;

type TabId = (typeof tabs)[number]["id"];

const LEAVE_TYPES: LeaveType[] = [
  "ANNUAL",
  "SICK",
  "COMPASSIONATE",
  "MATERNITY",
  "PATERNITY",
  "STUDY",
  "UNPAID",
];

const OPEN_TICKET = new Set(["OPEN", "IN_PROGRESS", "REOPENED"]);
const CLOSED_JOB = new Set(["COMPLETED", "INVOICED", "CANCELLED"]);
const CLOSED_TASK = new Set<TaskStatus>(["DONE", "CANCELLED"]);

const NEXT_TASK_STATUS: Partial<Record<TaskStatus, TaskStatus>> = {
  TODO: "IN_PROGRESS",
  IN_PROGRESS: "DONE",
  REVIEW: "DONE",
  DONE: "TODO",
};

/** "YYYY-MM-DD" in local time. */
function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function titleCase(s: string): string {
  return s.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Weekdays between two "YYYY-MM-DD" dates, inclusive. */
function workingDays(start: string, end: string): number {
  if (!start || !end) return 0;
  const s = new Date(`${start}T00:00:00`);
  const e = new Date(`${end}T00:00:00`);
  if (e < s) return 0;
  let n = 0;
  for (const d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) n++;
  }
  return n;
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const subscribeNoop = () => () => {};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

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

const traxxActions = [
  {
    prompt: "What are my priorities today?",
    description: "Ask TRAXX AI to summarise your tasks and deadlines",
    icon: Sparkles,
    color: "from-purple-500 to-indigo-600",
  },
  {
    prompt: "Schedule my tasks for the week",
    description: "Let TRAXX AI help plan your week",
    icon: CalendarClock,
    color: "from-blue-500 to-cyan-600",
  },
  {
    prompt: "Summarise my open work",
    description: "Get an overview of your open tasks, jobs and tickets",
    icon: BarChart3,
    color: "from-emerald-500 to-teal-600",
  },
];

// ---------------------------------------------------------------------------
// Small components
// ---------------------------------------------------------------------------

function KpiCard({
  title,
  value,
  icon: Icon,
  color,
  index,
  loading,
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  index: number;
  loading?: boolean;
}) {
  return (
    <motion.div
      custom={index}
      initial="hidden"
      animate="visible"
      variants={cardVariants}
      className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          {loading ? (
            <div className="mt-2 h-7 w-12 animate-pulse rounded bg-gray-100" />
          ) : (
            <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
          )}
        </div>
        <div className={cn("rounded-xl p-3", color)}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
    </motion.div>
  );
}

/** Loading / error / empty states shared by every section. */
function SectionState({
  loading,
  error,
  empty,
  emptyText,
  children,
}: {
  loading: boolean;
  error: Error | null;
  empty: boolean;
  emptyText: string;
  children: React.ReactNode;
}) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white py-12 text-sm text-gray-500">
        <Loader2 className="mb-3 h-7 w-7 animate-spin text-blue-500" />
        Loading…
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50 py-12 text-sm text-red-700">
        <AlertCircle className="mb-3 h-7 w-7" />
        Could not load this section: {error.message}
      </div>
    );
  }
  if (empty) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-12 text-sm text-gray-400">
        <Inbox className="mb-3 h-7 w-7" />
        {emptyText}
      </div>
    );
  }
  return <>{children}</>;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function MyPortalPage() {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }
  if (!profile) {
    return (
      <div className="p-6">
        <div className="mx-auto max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <UserCircle className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm text-gray-600">
            Your account isn&apos;t linked to a staff profile yet. Ask an administrator to set it up.
          </p>
        </div>
      </div>
    );
  }
  return <Portal profile={profile} />;
}

type SignedInProfile = NonNullable<ReturnType<typeof useAuth>["profile"]>;

function Portal({ profile }: { profile: SignedInProfile }) {
  const uid = profile.id;
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [taskFilter, setTaskFilter] = useState<"all" | "today" | "week" | "overdue">("all");
  const [payslipId, setPayslipId] = useState<string | null>(null);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [leaveForm, setLeaveForm] = useState<{
    leaveType: LeaveType;
    startDate: string;
    endDate: string;
    reason: string;
  }>({ leaveType: "ANNUAL", startDate: "", endDate: "", reason: "" });

  const tasksQ = useMyTasks(uid);
  const jobsQ = useMyJobCards(uid);
  const ticketsQ = useMyTickets(uid);
  const leaveQ = useMyLeave(uid);
  const employeeQ = useMyEmployee(uid);
  const payslipsQ = useMyPayslips(uid);
  const projectsQ = useProjectsLite();
  const { data: company } = useCompanySettings();

  const updateTask = useUpdateTask();
  const createLeave = useCreateLeaveRequest();
  const markViewed = useMarkPayslipViewed();

  const canEditTasks = profile.role !== "VIEWER";
  const canUseTraxx = canAccessRoute(profile.role, "/traxx");
  const employee = employeeQ.data ?? null;
  const firstName = profile.name.split(" ")[0] || profile.name;
  const roleLine = [profile.job_title, profile.department].filter(Boolean).join(" · ");

  const [today] = useState(() => isoDay(new Date()));
  const [weekEnd] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return isoDay(d);
  });

  const tasks = useMemo(() => tasksQ.data ?? [], [tasksQ.data]);
  const jobs = useMemo(() => jobsQ.data ?? [], [jobsQ.data]);
  const tickets = useMemo(() => ticketsQ.data ?? [], [ticketsQ.data]);
  // Employees only see payslips once they've been released.
  const payslips = useMemo(
    () => (payslipsQ.data ?? []).filter((p) => p.status === "SENT" || p.status === "VIEWED"),
    [payslipsQ.data]
  );
  const payslipModal = payslips.find((p) => p.id === payslipId) ?? null;

  const projectName = useMemo(
    () => new Map((projectsQ.data ?? []).map((p) => [p.id, p.name] as const)),
    [projectsQ.data]
  );

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (taskFilter === "today") return t.due_date === today;
      if (taskFilter === "week") return !!t.due_date && t.due_date >= today && t.due_date <= weekEnd;
      if (taskFilter === "overdue") return !!t.due_date && t.due_date < today && !CLOSED_TASK.has(t.status);
      return true;
    });
  }, [tasks, taskFilter, today, weekEnd]);

  const stats = useMemo(
    () => ({
      tasksDueToday: tasks.filter((t) => t.due_date === today && !CLOSED_TASK.has(t.status)).length,
      openTickets: tickets.filter((t) => OPEN_TICKET.has(t.status)).length,
      openJobs: jobs.filter((j) => !CLOSED_JOB.has(j.status)).length,
    }),
    [tasks, tickets, jobs, today]
  );

  const agenda = useMemo(() => {
    const items: { key: string; title: string; meta: string; kind: "task" | "overdue" | "job" }[] = [];
    for (const j of jobs) {
      if (j.scheduled_date?.slice(0, 10) === today && !CLOSED_JOB.has(j.status)) {
        items.push({
          key: `j-${j.id}`,
          title: `${j.job_number} · ${j.title}`,
          meta: j.location ? `Job card · ${j.location}` : "Job card",
          kind: "job",
        });
      }
    }
    for (const t of tasks) {
      if (!t.due_date || CLOSED_TASK.has(t.status)) continue;
      if (t.due_date === today) items.push({ key: `t-${t.id}`, title: t.title, meta: "Task due today", kind: "task" });
      else if (t.due_date < today)
        items.push({ key: `t-${t.id}`, title: t.title, meta: `Overdue since ${formatDate(t.due_date)}`, kind: "overdue" });
    }
    return items;
  }, [jobs, tasks, today]);

  function cycleStatus(task: TaskRow) {
    const next = NEXT_TASK_STATUS[task.status];
    if (!next || !canEditTasks) return;
    updateTask.mutate({
      id: task.id,
      status: next,
      completed_at: next === "DONE" ? new Date().toISOString() : null,
    });
  }

  function openPayslip(ps: Payslip) {
    setPayslipId(ps.id);
    if (ps.status === "SENT") markViewed.mutate(ps.id);
  }

  const leaveDays = workingDays(leaveForm.startDate, leaveForm.endDate);

  function submitLeave(e: React.FormEvent) {
    e.preventDefault();
    if (!leaveForm.startDate || !leaveForm.endDate) {
      toast.error("Choose a start and end date");
      return;
    }
    if (leaveForm.endDate < leaveForm.startDate) {
      toast.error("End date must be on or after the start date");
      return;
    }
    if (leaveDays <= 0) {
      toast.error("The selected dates contain no working days");
      return;
    }
    createLeave.mutate(
      {
        user_id: uid,
        leave_type: leaveForm.leaveType,
        start_date: leaveForm.startDate,
        end_date: leaveForm.endDate,
        days: leaveDays,
        reason: leaveForm.reason.trim() || null,
      },
      {
        onSuccess: () => {
          setLeaveModalOpen(false);
          setLeaveForm({ leaveType: "ANNUAL", startDate: "", endDate: "", reason: "" });
        },
      }
    );
  }

  // Greeting and date follow the viewer's clock; the server renders in UTC.
  const inBrowser = useSyncExternalStore(subscribeNoop, () => true, () => false);
  const todayFormatted = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(`${today}T00:00:00`));

  // -------------------------------------------------------------------------
  // Tab: My Dashboard
  // -------------------------------------------------------------------------

  function renderDashboard() {
    const agendaLoading = tasksQ.isLoading || jobsQ.isLoading;
    const agendaError = tasksQ.error ?? jobsQ.error;
    return (
      <motion.div initial="hidden" animate="visible" variants={fadeIn} className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="rounded-2xl bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 p-6 text-white shadow-lg"
        >
          <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold">
                {inBrowser ? `${getGreeting()}, ` : "Welcome, "}{firstName}
              </h2>
              <p className="mt-1 text-blue-100">{inBrowser ? todayFormatted : "\u00a0"}</p>
            </div>
            {roleLine && (
              <div className="mt-4 flex items-center gap-2 md:mt-0">
                <div className="rounded-full bg-white/20 px-4 py-2 text-sm font-medium backdrop-blur-sm">
                  {roleLine}
                </div>
              </div>
            )}
          </div>
        </motion.div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard title="Tasks Due Today" value={stats.tasksDueToday} icon={ListTodo} color="bg-blue-600" index={0} loading={tasksQ.isLoading} />
          <KpiCard title="Open Tickets" value={stats.openTickets} icon={Ticket} color="bg-orange-500" index={1} loading={ticketsQ.isLoading} />
          <KpiCard title="Open Job Cards" value={stats.openJobs} icon={Briefcase} color="bg-emerald-600" index={2} loading={jobsQ.isLoading} />
          <KpiCard
            title="Annual Leave Left"
            value={employee ? `${employee.annual_leave_balance} days` : "—"}
            icon={Palmtree}
            color="bg-purple-600"
            index={3}
            loading={employeeQ.isLoading}
          />
        </div>

        <div className={cn("grid grid-cols-1 gap-6", canUseTraxx && "lg:grid-cols-3")}>
          <motion.div
            custom={4}
            initial="hidden"
            animate="visible"
            variants={cardVariants}
            className={cn("col-span-1 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm", canUseTraxx && "lg:col-span-2")}
          >
            <div className="mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Today &amp; Overdue</h3>
            </div>
            {agendaLoading ? (
              <div className="flex items-center gap-2 py-6 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : agendaError ? (
              <p className="py-6 text-sm text-red-600">Could not load your schedule: {agendaError.message}</p>
            ) : agenda.length === 0 ? (
              <p className="py-6 text-sm text-gray-400">
                Nothing due today and nothing overdue. Tasks due today and job cards scheduled for today will appear here.
              </p>
            ) : (
              <div className="space-y-0">
                {agenda.map((item, idx) => {
                  const dot = item.kind === "job" ? "bg-emerald-500" : item.kind === "overdue" ? "bg-red-500" : "bg-blue-500";
                  return (
                    <div key={item.key} className="flex items-start gap-4 py-3">
                      <div className="flex flex-col items-center">
                        <div className={cn("h-3 w-3 rounded-full ring-4 ring-white", dot)} />
                        {idx < agenda.length - 1 && <div className="h-full w-0.5 bg-gray-200" style={{ minHeight: "32px" }} />}
                      </div>
                      <div className="-mt-0.5 flex-1">
                        <p className="text-sm font-medium text-gray-900">{item.title}</p>
                        <p className="text-xs text-gray-500">{item.meta}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>

          {canUseTraxx && (
            <motion.div custom={5} initial="hidden" animate="visible" variants={cardVariants} className="col-span-1 space-y-3">
              <div className="mb-1 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-600" />
                <h3 className="text-lg font-semibold text-gray-900">TRAXX AI Quick Actions</h3>
              </div>
              {traxxActions.map((action, idx) => (
                <motion.a
                  key={action.prompt}
                  href="/traxx"
                  custom={idx + 6}
                  initial="hidden"
                  animate="visible"
                  variants={cardVariants}
                  className="group flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
                >
                  <div className={cn("rounded-lg bg-gradient-to-br p-2.5 text-white", action.color)}>
                    <action.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900 transition-colors group-hover:text-blue-700">
                      &ldquo;{action.prompt}&rdquo;
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">{action.description}</p>
                  </div>
                  <ChevronRight className="mt-1 h-4 w-4 text-gray-300 transition-colors group-hover:text-blue-500" />
                </motion.a>
              ))}
            </motion.div>
          )}
        </div>
      </motion.div>
    );
  }

  // -------------------------------------------------------------------------
  // Tab: My Tasks
  // -------------------------------------------------------------------------

  function renderTasks() {
    const filterPills: { key: typeof taskFilter; label: string }[] = [
      { key: "all", label: "All" },
      { key: "today", label: "Today" },
      { key: "week", label: "Next 7 Days" },
      { key: "overdue", label: "Overdue" },
    ];

    return (
      <motion.div initial="hidden" animate="visible" variants={fadeIn} className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          {filterPills.map((pill) => (
            <button
              key={pill.key}
              onClick={() => setTaskFilter(pill.key)}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                taskFilter === pill.key ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              {pill.label}
            </button>
          ))}
        </div>

        <SectionState
          loading={tasksQ.isLoading}
          error={tasksQ.error}
          empty={filteredTasks.length === 0}
          emptyText={tasks.length === 0 ? "No tasks are assigned to you." : "No tasks match the current filter."}
        >
          <div className="space-y-3">
            {filteredTasks.map((task, idx) => {
              const canCycle = canEditTasks && !!NEXT_TASK_STATUS[task.status];
              const project = task.project_id ? projectName.get(task.project_id) : null;
              return (
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
                  <button
                    onClick={() => cycleStatus(task)}
                    disabled={!canCycle || updateTask.isPending}
                    title={canCycle ? `Mark as ${titleCase(NEXT_TASK_STATUS[task.status]!)}` : undefined}
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors disabled:cursor-not-allowed",
                      task.status === "DONE"
                        ? "border-green-500 bg-green-500 text-white"
                        : task.status === "IN_PROGRESS" || task.status === "REVIEW"
                        ? "border-blue-500 bg-blue-50 text-blue-600"
                        : "border-gray-300 bg-white text-gray-400 hover:border-gray-400"
                    )}
                  >
                    {task.status === "DONE" ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : task.status === "IN_PROGRESS" || task.status === "REVIEW" ? (
                      <Clock className="h-4 w-4" />
                    ) : (
                      <div className="h-2 w-2 rounded-full bg-gray-300" />
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <p className={cn("text-sm font-medium", task.status === "DONE" ? "text-gray-400 line-through" : "text-gray-900")}>
                      {task.title}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      {project && (
                        <>
                          <span>{project}</span>
                          <span>&middot;</span>
                        </>
                      )}
                      <span>{task.due_date ? `Due ${formatDate(task.due_date)}` : "No due date"}</span>
                    </div>
                  </div>

                  <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold", getPriorityColor(task.priority))}>
                    {task.priority}
                  </span>
                  <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold", getStatusColor(task.status))}>
                    {task.status.replace("_", " ")}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </SectionState>
      </motion.div>
    );
  }

  // -------------------------------------------------------------------------
  // Tab: My Job Cards
  // -------------------------------------------------------------------------

  function renderJobs() {
    return (
      <motion.div initial="hidden" animate="visible" variants={fadeIn}>
        <SectionState loading={jobsQ.isLoading} error={jobsQ.error} empty={jobs.length === 0} emptyText="No job cards are assigned to you.">
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/80 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    <th className="px-6 py-3">Job #</th>
                    <th className="px-6 py-3">Title</th>
                    <th className="px-6 py-3">Type</th>
                    <th className="px-6 py-3">Location</th>
                    <th className="px-6 py-3">Scheduled</th>
                    <th className="px-6 py-3">Priority</th>
                    <th className="px-6 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {jobs.map((job, idx) => (
                    <motion.tr key={job.id} custom={idx} initial="hidden" animate="visible" variants={cardVariants} className="transition-colors hover:bg-gray-50">
                      <td className="whitespace-nowrap px-6 py-4 font-mono text-sm font-medium text-blue-600">{job.job_number}</td>
                      <td className="max-w-xs truncate px-6 py-4 font-medium text-gray-900">{job.title}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-gray-600">{titleCase(job.job_type)}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-gray-600">
                        {job.location ? (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 text-gray-400" />
                            {job.location}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-gray-600">{job.scheduled_date ? formatDate(job.scheduled_date) : "—"}</td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", getPriorityColor(job.priority))}>{job.priority}</span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", getStatusColor(job.status))}>
                          {job.status.replace("_", " ")}
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </SectionState>
      </motion.div>
    );
  }

  // -------------------------------------------------------------------------
  // Tab: My Tickets
  // -------------------------------------------------------------------------

  function renderTickets() {
    return (
      <motion.div initial="hidden" animate="visible" variants={fadeIn}>
        <SectionState loading={ticketsQ.isLoading} error={ticketsQ.error} empty={tickets.length === 0} emptyText="No tickets are assigned to you.">
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
                  {tickets.map((ticket, idx) => (
                    <motion.tr key={ticket.id} custom={idx} initial="hidden" animate="visible" variants={cardVariants} className="transition-colors hover:bg-gray-50">
                      <td className="whitespace-nowrap px-6 py-4 font-mono text-sm font-medium text-blue-600">{ticket.ticket_number}</td>
                      <td className="max-w-xs truncate px-6 py-4 font-medium text-gray-900">{ticket.subject}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-gray-600">{ticket.company || ticket.customer_name}</td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", getPriorityColor(ticket.priority))}>{ticket.priority}</span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", getStatusColor(ticket.status))}>
                          {ticket.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-xs text-gray-500">{formatDate(ticket.updated_at)}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </SectionState>
      </motion.div>
    );
  }

  // -------------------------------------------------------------------------
  // Tab: My Payslips
  // -------------------------------------------------------------------------

  function renderPayslips() {
    return (
      <motion.div initial="hidden" animate="visible" variants={fadeIn} className="space-y-4">
        <SectionState
          loading={payslipsQ.isLoading}
          error={payslipsQ.error}
          empty={payslips.length === 0}
          emptyText="No payslips have been released to you yet."
        >
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
                    <motion.tr key={ps.id} custom={idx} initial="hidden" animate="visible" variants={cardVariants} className="transition-colors hover:bg-gray-50">
                      <td className="whitespace-nowrap px-6 py-4 font-medium text-gray-900">{formatPeriod(ps.period)}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-gray-600">{ps.pay_date ? formatDate(ps.pay_date) : "—"}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-right font-mono text-gray-900">{formatCurrency(ps.gross_pay)}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-right font-mono text-red-600">-{formatCurrency(ps.total_deductions)}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-right font-mono font-semibold text-emerald-700">{formatCurrency(ps.net_pay)}</td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                            ps.status === "SENT" ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"
                          )}
                        >
                          {ps.status === "SENT" ? "NEW" : "VIEWED"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        <button
                          onClick={() => openPayslip(ps)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100"
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
          </div>
        </SectionState>

        {payslipModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
            >
              <button
                onClick={() => setPayslipId(null)}
                className="absolute right-4 top-4 rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="mb-6 border-b border-gray-100 pb-4">
                <h3 className="text-lg font-bold text-gray-900">Payslip</h3>
                <p className="text-sm text-gray-500">
                  {company?.company_name ? `${company.company_name} · ` : ""}
                  {formatPeriod(payslipModal.period)} &middot; {payslipModal.payslip_number}
                </p>
              </div>

              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-4 rounded-xl bg-gray-50 p-4">
                  <div>
                    <p className="text-xs text-gray-400">Employee</p>
                    <p className="font-medium text-gray-900">{profile.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Employee #</p>
                    <p className="font-medium text-gray-900">{employee?.employee_number ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Department</p>
                    <p className="font-medium text-gray-900">{profile.department ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Pay Date</p>
                    <p className="font-medium text-gray-900">{payslipModal.pay_date ? formatDate(payslipModal.pay_date) : "—"}</p>
                  </div>
                </div>

                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Earnings</h4>
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Basic Salary</span>
                      <span className="font-mono text-gray-900">{formatCurrency(payslipModal.basic_salary)}</span>
                    </div>
                    {Object.entries(payslipModal.allowances).map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <span className="text-gray-600">{amountLabel(k)}</span>
                        <span className="font-mono text-gray-900">{formatCurrency(Number(v))}</span>
                      </div>
                    ))}
                    <div className="flex justify-between border-t border-gray-200 pt-1.5 font-semibold">
                      <span className="text-gray-900">Gross Pay</span>
                      <span className="font-mono text-gray-900">{formatCurrency(payslipModal.gross_pay)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Deductions</h4>
                  <div className="space-y-1.5">
                    {Object.entries(payslipModal.deductions).map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <span className="text-gray-600">{amountLabel(k)}</span>
                        <span className="font-mono text-red-600">-{formatCurrency(Number(v))}</span>
                      </div>
                    ))}
                    <div className="flex justify-between border-t border-gray-200 pt-1.5 font-semibold">
                      <span className="text-gray-900">Total Deductions</span>
                      <span className="font-mono text-red-600">-{formatCurrency(payslipModal.total_deductions)}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl bg-emerald-50 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-emerald-900">Net Pay</span>
                    <span className="font-mono text-xl font-bold text-emerald-700">{formatCurrency(payslipModal.net_pay)}</span>
                  </div>
                </div>

                {(employee?.bank_name || employee?.bank_account) && (
                  <p className="text-xs text-gray-500">
                    Paid to {[employee.bank_name, employee.bank_account].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>

              <div className="mt-6">
                <button
                  onClick={() => setPayslipId(null)}
                  className="w-full rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </motion.div>
    );
  }

  // -------------------------------------------------------------------------
  // Tab: My Leave
  // -------------------------------------------------------------------------

  function renderLeave() {
    const leaveBalances = employee
      ? [
          { type: "Annual Leave", remaining: employee.annual_leave_balance, bgLight: "bg-blue-50", textColor: "text-blue-700", icon: CalendarDays },
          { type: "Sick Leave", remaining: employee.sick_leave_balance, bgLight: "bg-amber-50", textColor: "text-amber-700", icon: Heart },
          { type: "Compassionate", remaining: employee.compassionate_leave_balance, bgLight: "bg-purple-50", textColor: "text-purple-700", icon: Shield },
        ]
      : [];
    const history = leaveQ.data ?? [];

    return (
      <motion.div initial="hidden" animate="visible" variants={fadeIn} className="space-y-6">
        {employeeQ.isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl border border-gray-200 bg-white" />
            ))}
          </div>
        ) : employeeQ.error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Could not load your leave balances: {employeeQ.error.message}
          </div>
        ) : !employee ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-4 text-sm text-gray-500">
            You don&apos;t have an employee record yet, so no leave balances are available. Ask HR to add one.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {leaveBalances.map((lb, idx) => (
              <motion.div key={lb.type} custom={idx} initial="hidden" animate="visible" variants={cardVariants} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className={cn("rounded-xl p-2.5", lb.bgLight)}>
                    <lb.icon className={cn("h-5 w-5", lb.textColor)} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{lb.type}</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {lb.remaining} <span className="text-sm font-normal text-gray-400">days left</span>
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        <div className="flex justify-end">
          <button
            onClick={() => setLeaveModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            <CalendarPlus className="h-4 w-4" />
            Request Leave
          </button>
        </div>

        <SectionState loading={leaveQ.isLoading} error={leaveQ.error} empty={history.length === 0} emptyText="You haven't requested any leave yet.">
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/80 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    <th className="px-6 py-3">Type</th>
                    <th className="px-6 py-3">Start</th>
                    <th className="px-6 py-3">End</th>
                    <th className="px-6 py-3">Days</th>
                    <th className="px-6 py-3">Reason</th>
                    <th className="px-6 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {history.map((lv, idx) => (
                    <motion.tr key={lv.id} custom={idx} initial="hidden" animate="visible" variants={cardVariants} className="transition-colors hover:bg-gray-50">
                      <td className="whitespace-nowrap px-6 py-4 font-medium text-gray-900">{titleCase(lv.leave_type)}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-gray-600">{formatDate(lv.start_date)}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-gray-600">{formatDate(lv.end_date)}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-center font-medium text-gray-900">{lv.days}</td>
                      <td className="max-w-xs truncate px-6 py-4 text-gray-600">{lv.reason ?? "—"}</td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", getStatusColor(lv.status))}>{lv.status}</span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </SectionState>

        {leaveModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
              <button
                onClick={() => setLeaveModalOpen(false)}
                className="absolute right-4 top-4 rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>

              <h3 className="mb-5 text-lg font-bold text-gray-900">Request Leave</h3>

              <form className="space-y-4" onSubmit={submitLeave}>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Leave Type</label>
                  <select
                    value={leaveForm.leaveType}
                    onChange={(e) => setLeaveForm((prev) => ({ ...prev, leaveType: e.target.value as LeaveType }))}
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  >
                    {LEAVE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {titleCase(t)} Leave
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Start Date</label>
                    <input
                      type="date"
                      required
                      value={leaveForm.startDate}
                      onChange={(e) => setLeaveForm((prev) => ({ ...prev, startDate: e.target.value }))}
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">End Date</label>
                    <input
                      type="date"
                      required
                      min={leaveForm.startDate || undefined}
                      value={leaveForm.endDate}
                      onChange={(e) => setLeaveForm((prev) => ({ ...prev, endDate: e.target.value }))}
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>
                {leaveForm.startDate && leaveForm.endDate && (
                  <p className="text-xs text-gray-500">
                    {leaveDays} working day{leaveDays === 1 ? "" : "s"} (weekends excluded)
                  </p>
                )}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Reason</label>
                  <textarea
                    rows={3}
                    value={leaveForm.reason}
                    onChange={(e) => setLeaveForm((prev) => ({ ...prev, reason: e.target.value }))}
                    className="w-full resize-none rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Brief description..."
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setLeaveModalOpen(false)}
                    className="flex-1 rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createLeave.isPending}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
                  >
                    {createLeave.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
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

  // -------------------------------------------------------------------------
  // Tab: My Profile
  // -------------------------------------------------------------------------

  function renderProfile() {
    const details: { label: string; value: string; icon: React.ComponentType<{ className?: string }> }[] = [
      { label: "Full Name", value: profile.name, icon: User },
      { label: "Email", value: profile.email, icon: Mail },
      { label: "Phone", value: profile.phone ?? "—", icon: Phone },
      { label: "Department", value: profile.department ?? "—", icon: Building2 },
      { label: "Job Title", value: profile.job_title ?? "—", icon: Briefcase },
      { label: "Role", value: titleCase(profile.role), icon: Shield },
    ];
    const employment: { label: string; value: string; icon: React.ComponentType<{ className?: string }> }[] = employee
      ? [
          { label: "Employee Number", value: employee.employee_number, icon: BadgeCheck },
          { label: "Start Date", value: formatDate(employee.start_date), icon: CalendarDays },
          { label: "Contract Type", value: titleCase(employee.contract_type), icon: FileSignature },
          {
            label: "Emergency Contact",
            value: [employee.emergency_contact, employee.emergency_phone].filter(Boolean).join(" · ") || "—",
            icon: Phone,
          },
        ]
      : [];

    return (
      <motion.div initial="hidden" animate="visible" variants={fadeIn} className="space-y-6">
        <motion.div custom={0} initial="hidden" animate="visible" variants={cardVariants} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-2xl font-bold text-white shadow-lg">
              {initials(profile.name)}
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h3 className="text-xl font-bold text-gray-900">{profile.name}</h3>
              {roleLine && <p className="text-sm text-gray-500">{roleLine}</p>}
              {employee && (
                <p className="mt-1 text-xs text-gray-400">Employee since {formatDate(employee.start_date)}</p>
              )}
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <motion.div custom={1} initial="hidden" animate="visible" variants={cardVariants} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Contact &amp; Role</h4>
            <div className="space-y-3">
              {details.map((d) => (
                <div key={d.label} className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                    <d.icon className="h-4 w-4 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">{d.label}</p>
                    <p className="text-sm font-medium text-gray-900">{d.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div custom={2} initial="hidden" animate="visible" variants={cardVariants} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Employment</h4>
            {employeeQ.isLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : employeeQ.error ? (
              <p className="text-sm text-red-600">Could not load your employee record: {employeeQ.error.message}</p>
            ) : !employee ? (
              <p className="text-sm text-gray-400">No employee record on file. HR can add one from the HR page.</p>
            ) : (
              <div className="space-y-3">
                {employment.map((d) => (
                  <div key={d.label} className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                      <d.icon className="h-4 w-4 text-gray-500" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">{d.label}</p>
                      <p className="text-sm font-medium text-gray-900">{d.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </motion.div>
    );
  }

  function renderActiveTab() {
    switch (activeTab) {
      case "dashboard":
        return renderDashboard();
      case "tasks":
        return renderTasks();
      case "jobs":
        return renderJobs();
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

  return (
    <div className="min-h-screen space-y-6 p-6">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-base font-bold text-white">
          {initials(profile.name)}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{profile.name}</h1>
          <p className="text-sm text-gray-500">
            {roleLine || "My Portal"} &mdash; your tasks, jobs, tickets, payslips, leave and profile
          </p>
        </div>
      </div>

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
                  "inline-flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors",
                  isActive ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div>{renderActiveTab()}</div>
    </div>
  );
}
