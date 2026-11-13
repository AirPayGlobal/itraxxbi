"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type {
  ActivityLogRow,
  EmployeeRow,
  JobCardRow,
  PerformanceKpiRow,
  ProfileRow,
  TaskRow,
  TicketCommentRow,
  TicketRow,
  TrainingRow,
} from "@/lib/supabase/database.types";

const supabase = createClient();
const KEY = ["staff-performance"] as const;

// ---------------------------------------------------------------------------
// Row slices (only the columns this page reads)
// ---------------------------------------------------------------------------

type StaffProfile = Pick<
  ProfileRow,
  "id" | "name" | "email" | "role" | "job_title" | "department" | "avatar"
>;
type TaskSlice = Pick<
  TaskRow,
  "id" | "title" | "status" | "due_date" | "completed_at" | "assignee_id" | "updated_at"
>;
type JobSlice = Pick<
  JobCardRow,
  | "id"
  | "job_number"
  | "title"
  | "status"
  | "started_at"
  | "completed_at"
  | "technician_id"
  | "updated_at"
>;
type TicketSlice = Pick<
  TicketRow,
  | "id"
  | "ticket_number"
  | "subject"
  | "status"
  | "customer_name"
  | "company"
  | "assigned_to_id"
  | "resolved_at"
  | "created_at"
  | "updated_at"
>;
type CommentSlice = Pick<TicketCommentRow, "author_id" | "is_internal">;
type EmployeeSlice = Pick<EmployeeRow, "id" | "user_id">;

// ---------------------------------------------------------------------------
// Public shapes
// ---------------------------------------------------------------------------

export type ActivityKind = "task" | "job" | "ticket" | "log";

export type StaffActivity = {
  id: string;
  at: string;
  actorId: string | null;
  actorName: string;
  kind: ActivityKind;
  /** Short verb phrase, e.g. "Completed task". */
  label: string;
  /** Reference such as a job / ticket number, if any. */
  reference: string | null;
  detail: string | null;
  /** True when the action means something was finished. */
  done: boolean;
};

export type StaffMetrics = {
  profile: StaffProfile;
  /** job_title, falling back to the app role. */
  roleLabel: string;

  tasksAssigned: number;
  tasksCompleted: number;
  tasksOverdue: number;

  jobsCompleted: number;
  jobsInProgress: number;
  jobsAssigned: number;

  ticketsAssigned: number;
  ticketsResolved: number;
  ticketsActive: number;
  ticketsReopened: number;
  /** Mean hours from created_at to resolved_at; null when nothing resolved. */
  avgResolutionHours: number | null;
  /** Number of resolved tickets with a usable resolution time. */
  resolutionSamples: number;
  /** Customer-visible ticket comments authored by this person. */
  replies: number;

  /** Finished items (tasks + jobs + tickets). */
  completedWork: number;
  /** completedWork / all assigned items, 0-100; null when nothing assigned. */
  completionRate: number | null;

  latestKpi: PerformanceKpiRow | null;
  previousKpi: PerformanceKpiRow | null;
  /** Change in overall_score vs previous review; null if not comparable. */
  scoreDelta: number | null;

  trainings: TrainingRow[];
  activities: StaffActivity[];
};

export type StaffPerformanceData = {
  staff: StaffMetrics[];
  activity: StaffActivity[];
  activitySource: "activity_logs" | "derived";
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TASK_OPEN = new Set(["TODO", "IN_PROGRESS", "REVIEW"]);
const JOB_DONE = new Set(["COMPLETED", "INVOICED"]);
const JOB_ACTIVE = new Set(["ASSIGNED", "IN_PROGRESS"]);
const TICKET_DONE = new Set(["RESOLVED", "CLOSED"]);
const TICKET_ACTIVE = new Set(["OPEN", "IN_PROGRESS", "REOPENED"]);

function humanize(value: string): string {
  return value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());
}

function groupBy<T>(rows: T[], key: (row: T) => string | null): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const k = key(row);
    if (!k) continue;
    const list = map.get(k);
    if (list) list.push(row);
    else map.set(k, [row]);
  }
  return map;
}

function deriveActivities(
  tasks: TaskSlice[],
  jobs: JobSlice[],
  tickets: TicketSlice[],
  names: Map<string, string>
): StaffActivity[] {
  const out: StaffActivity[] = [];
  const nameOf = (id: string | null) => (id ? names.get(id) ?? "Unknown" : "Unassigned");

  for (const t of tasks) {
    const completed = t.status === "DONE" && !!t.completed_at;
    out.push({
      id: `task-${t.id}`,
      at: completed ? t.completed_at! : t.updated_at,
      actorId: t.assignee_id,
      actorName: nameOf(t.assignee_id),
      kind: "task",
      label: completed ? "Completed task" : `Task ${humanize(t.status).toLowerCase()}`,
      reference: null,
      detail: t.title,
      done: completed,
    });
  }
  for (const j of jobs) {
    const completed = JOB_DONE.has(j.status) && !!j.completed_at;
    out.push({
      id: `job-${j.id}`,
      at: completed ? j.completed_at! : j.updated_at,
      actorId: j.technician_id,
      actorName: nameOf(j.technician_id),
      kind: "job",
      label: completed ? "Completed job" : `Job ${humanize(j.status).toLowerCase()}`,
      reference: j.job_number,
      detail: j.title,
      done: completed,
    });
  }
  for (const tk of tickets) {
    const resolved = TICKET_DONE.has(tk.status) && !!tk.resolved_at;
    out.push({
      id: `ticket-${tk.id}`,
      at: resolved ? tk.resolved_at! : tk.updated_at,
      actorId: tk.assigned_to_id,
      actorName: nameOf(tk.assigned_to_id),
      kind: "ticket",
      label: resolved ? "Resolved ticket" : `Ticket ${humanize(tk.status).toLowerCase()}`,
      reference: tk.ticket_number,
      detail: [tk.subject, tk.company ?? tk.customer_name].filter(Boolean).join(" · "),
      done: resolved,
    });
  }
  return out.sort((a, b) => b.at.localeCompare(a.at));
}

function logActivities(
  logs: ActivityLogRow[],
  names: Map<string, string>
): StaffActivity[] {
  return logs.map((l) => {
    const action = humanize(l.action);
    const entity = l.entity.toLowerCase();
    const kind: ActivityKind = entity.includes("ticket")
      ? "ticket"
      : entity.includes("job")
        ? "job"
        : entity.includes("task")
          ? "task"
          : "log";
    return {
      id: `log-${l.id}`,
      at: l.created_at,
      actorId: l.user_id,
      actorName: l.user_id ? names.get(l.user_id) ?? "Unknown" : "System",
      kind,
      label: `${action} ${humanize(l.entity).toLowerCase()}`,
      reference: null,
      detail: l.details,
      done: /complet|resolv|clos|done/i.test(l.action),
    };
  });
}

// ---------------------------------------------------------------------------
// Query
// ---------------------------------------------------------------------------

async function fetchStaffPerformance(): Promise<StaffPerformanceData> {
  const [
    profilesRes,
    tasksRes,
    jobsRes,
    ticketsRes,
    commentsRes,
    kpisRes,
    employeesRes,
    trainingsRes,
    logsRes,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, name, email, role, job_title, department, avatar")
      .neq("role", "CLIENT")
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("tasks")
      .select("id, title, status, due_date, completed_at, assignee_id, updated_at")
      .not("assignee_id", "is", null),
    supabase
      .from("job_cards")
      .select(
        "id, job_number, title, status, started_at, completed_at, technician_id, updated_at"
      )
      .not("technician_id", "is", null),
    supabase
      .from("tickets")
      .select(
        "id, ticket_number, subject, status, customer_name, company, assigned_to_id, resolved_at, created_at, updated_at"
      )
      .not("assigned_to_id", "is", null),
    supabase
      .from("ticket_comments")
      .select("author_id, is_internal")
      .eq("is_internal", false)
      .not("author_id", "is", null),
    supabase
      .from("performance_kpis")
      .select("*")
      .order("period", { ascending: false }),
    supabase.from("employees").select("id, user_id"),
    supabase.from("trainings").select("*").order("created_at", { ascending: false }),
    supabase
      .from("activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  // Core tables must load; supplementary ones degrade to empty.
  for (const res of [profilesRes, tasksRes, jobsRes, ticketsRes]) {
    if (res.error) throw res.error;
  }

  const profiles = (profilesRes.data ?? []) as StaffProfile[];
  const tasks = (tasksRes.data ?? []) as TaskSlice[];
  const jobs = (jobsRes.data ?? []) as JobSlice[];
  const tickets = (ticketsRes.data ?? []) as TicketSlice[];
  const comments = (commentsRes.error ? [] : commentsRes.data ?? []) as CommentSlice[];
  const kpis = (kpisRes.error ? [] : kpisRes.data ?? []) as PerformanceKpiRow[];
  const employees = (employeesRes.error ? [] : employeesRes.data ?? []) as EmployeeSlice[];
  const trainings = (trainingsRes.error ? [] : trainingsRes.data ?? []) as TrainingRow[];
  const logs = (logsRes.error ? [] : logsRes.data ?? []) as ActivityLogRow[];

  const names = new Map(profiles.map((p) => [p.id, p.name]));

  const tasksBy = groupBy(tasks, (t) => t.assignee_id);
  const jobsBy = groupBy(jobs, (j) => j.technician_id);
  const ticketsBy = groupBy(tickets, (t) => t.assigned_to_id);
  const repliesBy = groupBy(comments, (c) => c.author_id);
  const kpisBy = groupBy(kpis, (k) => k.user_id); // already period-desc
  const employeeToProfile = new Map(employees.map((e) => [e.id, e.user_id]));
  const trainingsBy = groupBy(trainings, (t) => employeeToProfile.get(t.employee_id) ?? null);

  const derived = deriveActivities(tasks, jobs, tickets, names);
  const logged = logActivities(logs, names);
  const activitySource: StaffPerformanceData["activitySource"] =
    logged.length > 0 ? "activity_logs" : "derived";
  const activity = (activitySource === "activity_logs" ? logged : derived).slice(0, 50);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const staff: StaffMetrics[] = profiles.map((profile) => {
    const myTasks = (tasksBy.get(profile.id) ?? []).filter((t) => t.status !== "CANCELLED");
    const myJobs = (jobsBy.get(profile.id) ?? []).filter((j) => j.status !== "CANCELLED");
    const myTickets = ticketsBy.get(profile.id) ?? [];
    const myKpis = kpisBy.get(profile.id) ?? [];

    const tasksCompleted = myTasks.filter((t) => t.status === "DONE").length;
    const tasksOverdue = myTasks.filter(
      (t) => TASK_OPEN.has(t.status) && t.due_date && new Date(t.due_date) < startOfToday
    ).length;

    const jobsCompleted = myJobs.filter((j) => JOB_DONE.has(j.status)).length;
    const jobsInProgress = myJobs.filter((j) => JOB_ACTIVE.has(j.status)).length;

    const resolved = myTickets.filter((t) => TICKET_DONE.has(t.status));
    const resolutionHours = resolved
      .filter((t) => t.resolved_at)
      .map(
        (t) =>
          (new Date(t.resolved_at!).getTime() - new Date(t.created_at).getTime()) / 3_600_000
      )
      .filter((h) => Number.isFinite(h) && h >= 0);
    const avgResolutionHours =
      resolutionHours.length > 0
        ? Math.round((resolutionHours.reduce((s, h) => s + h, 0) / resolutionHours.length) * 10) /
          10
        : null;

    const assignedTotal = myTasks.length + myJobs.length + myTickets.length;
    const completedWork = tasksCompleted + jobsCompleted + resolved.length;

    const latestKpi = myKpis[0] ?? null;
    const previousKpi = myKpis[1] ?? null;
    const scoreDelta =
      latestKpi?.overall_score != null && previousKpi?.overall_score != null
        ? Math.round((latestKpi.overall_score - previousKpi.overall_score) * 10) / 10
        : null;

    // Prefer this person's logged actions; fall back to derived updates.
    const fromLogs = logged.filter((a) => a.actorId === profile.id);
    const activities =
      fromLogs.length > 0 ? fromLogs : derived.filter((a) => a.actorId === profile.id);

    return {
      profile,
      roleLabel: profile.job_title || humanize(profile.role),
      tasksAssigned: myTasks.length,
      tasksCompleted,
      tasksOverdue,
      jobsCompleted,
      jobsInProgress,
      jobsAssigned: myJobs.length,
      ticketsAssigned: myTickets.length,
      ticketsResolved: resolved.length,
      ticketsActive: myTickets.filter((t) => TICKET_ACTIVE.has(t.status)).length,
      ticketsReopened: myTickets.filter((t) => t.status === "REOPENED").length,
      avgResolutionHours,
      resolutionSamples: resolutionHours.length,
      replies: repliesBy.get(profile.id)?.length ?? 0,
      completedWork,
      completionRate:
        assignedTotal > 0 ? Math.round((completedWork / assignedTotal) * 100) : null,
      latestKpi,
      previousKpi,
      scoreDelta,
      trainings: trainingsBy.get(profile.id) ?? [],
      activities: activities.slice(0, 15),
    };
  });

  return { staff, activity, activitySource };
}

export function useStaffPerformance() {
  return useQuery({
    queryKey: KEY,
    queryFn: fetchStaffPerformance,
  });
}
