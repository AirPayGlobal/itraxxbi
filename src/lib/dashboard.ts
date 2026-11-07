import { JobStatus, TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type ActivityType = "job" | "task" | "customer" | "invoice";

export interface DashboardData {
  kpis: {
    activeJobCards: number;
    newJobCardsChange: number | null;
    openTasks: number;
    newTasksChange: number | null;
    activeCustomers: number;
    newCustomersChange: number | null;
    monthlyRevenue: number | null;
    revenueChange: number | null;
  };
  jobCardsByStatus: { status: string; count: number; fill: string }[];
  revenueTrend: { month: string; revenue: number }[] | null;
  upcomingTasks: { id: string; title: string; dueDate: string; priority: string }[];
  activity: { id: string; type: ActivityType; description: string; timestamp: string }[];
}

const STATUS_BARS: { status: JobStatus; label: string; fill: string }[] = [
  { status: "OPEN", label: "Open", fill: "#64748b" },
  { status: "ASSIGNED", label: "Assigned", fill: "#8b5cf6" },
  { status: "IN_PROGRESS", label: "In Progress", fill: "#3b82f6" },
  { status: "COMPLETED", label: "Completed", fill: "#22c55e" },
  { status: "INVOICED", label: "Invoiced", fill: "#10b981" },
];

const ACTIVE_JOB: JobStatus[] = ["OPEN", "ASSIGNED", "IN_PROGRESS"];
const OPEN_TASK: TaskStatus[] = ["TODO", "IN_PROGRESS", "REVIEW"];

function monthStart(offset: number, now = new Date()) {
  return new Date(now.getFullYear(), now.getMonth() + offset, 1);
}

function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

function relativeTime(date: Date, now: Date): string {
  const mins = Math.round((now.getTime() - date.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

const shortDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
const shortMonth = new Intl.DateTimeFormat("en-US", { month: "short" });
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

/** Counts records created in [from, to). */
function createdBetween(from: Date, to: Date) {
  return { createdAt: { gte: from, lt: to } };
}

export async function getDashboardData(includeFinance: boolean): Promise<DashboardData> {
  const now = new Date();
  const thisMonth = monthStart(0, now);
  const lastMonth = monthStart(-1, now);
  const nextMonth = monthStart(1, now);
  // Compare month-to-date against the same span of last month, not all of it.
  const lastMonthToDate = new Date(Math.min(lastMonth.getTime() + (now.getTime() - thisMonth.getTime()), thisMonth.getTime()));
  const trendStart = monthStart(-5, now);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [
    activeJobCards, jobsThisMonth, jobsLastMonth,
    openTasks, tasksThisMonth, tasksLastMonth,
    activeCustomers, customersThisMonth, customersLastMonth,
    statusGroups, upcoming,
    recentJobs, recentTasks, recentCustomers, recentPayments,
    payments,
  ] = await Promise.all([
    prisma.jobCard.count({ where: { status: { in: ACTIVE_JOB } } }),
    prisma.jobCard.count({ where: createdBetween(thisMonth, nextMonth) }),
    prisma.jobCard.count({ where: createdBetween(lastMonth, lastMonthToDate) }),
    prisma.task.count({ where: { status: { in: OPEN_TASK } } }),
    prisma.task.count({ where: createdBetween(thisMonth, nextMonth) }),
    prisma.task.count({ where: createdBetween(lastMonth, lastMonthToDate) }),
    prisma.customer.count({ where: { status: "ACTIVE" } }),
    prisma.customer.count({ where: createdBetween(thisMonth, nextMonth) }),
    prisma.customer.count({ where: createdBetween(lastMonth, lastMonthToDate) }),
    prisma.jobCard.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.task.findMany({
      where: { status: { in: OPEN_TASK }, dueDate: { gte: todayStart } },
      orderBy: { dueDate: "asc" },
      take: 6,
      select: { id: true, title: true, dueDate: true, priority: true },
    }),
    prisma.jobCard.findMany({
      orderBy: { updatedAt: "desc" },
      take: 8,
      select: { id: true, jobNumber: true, status: true, updatedAt: true, technician: { select: { name: true } } },
    }),
    prisma.task.findMany({
      orderBy: { updatedAt: "desc" },
      take: 8,
      select: { id: true, title: true, status: true, updatedAt: true, assignee: { select: { name: true } } },
    }),
    prisma.customer.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, name: true, company: true, createdAt: true },
    }),
    includeFinance
      ? prisma.payment.findMany({
          orderBy: { paidAt: "desc" },
          take: 8,
          select: { id: true, amount: true, paidAt: true, invoice: { select: { invoiceNumber: true, customer: { select: { name: true } } } } },
        })
      : Promise.resolve([]),
    includeFinance
      ? prisma.payment.findMany({ where: { paidAt: { gte: trendStart, lt: nextMonth } }, select: { amount: true, paidAt: true } })
      : Promise.resolve([]),
  ]);

  const statusCounts = new Map(statusGroups.map((g) => [g.status, g._count._all]));
  const jobCardsByStatus = STATUS_BARS.map((b) => ({ status: b.label, count: statusCounts.get(b.status) ?? 0, fill: b.fill }));

  let revenueTrend: DashboardData["revenueTrend"] = null;
  let monthlyRevenue: number | null = null;
  let revenueChange: number | null = null;
  if (includeFinance) {
    const buckets = Array.from({ length: 6 }, (_, i) => ({ start: monthStart(i - 5, now), revenue: 0 }));
    for (const p of payments) {
      const idx = (p.paidAt.getFullYear() - trendStart.getFullYear()) * 12 + p.paidAt.getMonth() - trendStart.getMonth();
      if (idx >= 0 && idx < 6) buckets[idx].revenue += p.amount;
    }
    revenueTrend = buckets.map((b) => ({ month: shortMonth.format(b.start), revenue: Math.round(b.revenue) }));
    monthlyRevenue = buckets[5].revenue;
    const lastMonthSoFar = payments
      .filter((p) => p.paidAt >= lastMonth && p.paidAt < lastMonthToDate)
      .reduce((sum, p) => sum + p.amount, 0);
    revenueChange = percentChange(monthlyRevenue, lastMonthSoFar);
  }

  const jobVerb: Partial<Record<JobStatus, string>> = {
    OPEN: "opened", ASSIGNED: "assigned", IN_PROGRESS: "started", COMPLETED: "completed", INVOICED: "invoiced", CANCELLED: "cancelled",
  };
  const events: { id: string; type: ActivityType; description: string; at: Date }[] = [
    ...recentJobs.map((j) => ({
      id: `job-${j.id}`,
      type: "job" as const,
      description: `Job card ${j.jobNumber} ${jobVerb[j.status]}${j.technician ? ` — ${j.technician.name}` : ""}`,
      at: j.updatedAt,
    })),
    ...recentTasks.map((t) => ({
      id: `task-${t.id}`,
      type: "task" as const,
      description:
        t.status === "DONE"
          ? `Task '${t.title}' marked as complete`
          : `Task '${t.title}'${t.assignee ? ` assigned to ${t.assignee.name}` : " updated"}`,
      at: t.updatedAt,
    })),
    ...recentCustomers.map((c) => ({
      id: `customer-${c.id}`,
      type: "customer" as const,
      description: `New customer ${c.company ?? c.name} added`,
      at: c.createdAt,
    })),
    ...recentPayments.map((p) => ({
      id: `payment-${p.id}`,
      type: "invoice" as const,
      description: `Payment of ${money.format(p.amount)} received for ${p.invoice.invoiceNumber} (${p.invoice.customer.name})`,
      at: p.paidAt,
    })),
  ];
  const activity = events
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 8)
    .map(({ at, ...e }) => ({ ...e, timestamp: relativeTime(at, now) }));

  return {
    kpis: {
      activeJobCards,
      newJobCardsChange: percentChange(jobsThisMonth, jobsLastMonth),
      openTasks,
      newTasksChange: percentChange(tasksThisMonth, tasksLastMonth),
      activeCustomers,
      newCustomersChange: percentChange(customersThisMonth, customersLastMonth),
      monthlyRevenue,
      revenueChange,
    },
    jobCardsByStatus,
    revenueTrend,
    upcomingTasks: upcoming.map((t) => ({
      id: t.id,
      title: t.title,
      dueDate: shortDate.format(t.dueDate!),
      priority: t.priority.toLowerCase(),
    })),
    activity,
  };
}
