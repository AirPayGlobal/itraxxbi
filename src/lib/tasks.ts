import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { toDay } from "@/lib/permissions";

export const TASK_STATUSES = ["TODO", "IN_PROGRESS", "REVIEW", "DONE", "CANCELLED"] as const;
export const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

export interface TaskRow {
  id: string;
  ref: string;
  title: string;
  description: string;
  status: (typeof TASK_STATUSES)[number];
  priority: (typeof PRIORITIES)[number];
  assigneeId: string;
  assignee: string;
  projectId: string;
  project: string;
  dueDate: string;
  createdAt: string;
}

export interface Option {
  id: string;
  name: string;
}

export const taskInclude = {
  assignee: { select: { name: true } },
  project: { select: { name: true } },
} satisfies Prisma.TaskInclude;

type TaskWithRelations = Prisma.TaskGetPayload<{ include: typeof taskInclude }>;

export function toTaskRow(t: TaskWithRelations): TaskRow {
  return {
    id: t.id,
    ref: `TSK-${String(t.number).padStart(3, "0")}`,
    title: t.title,
    description: t.description ?? "",
    status: t.status,
    priority: t.priority,
    assigneeId: t.assigneeId ?? "",
    assignee: t.assignee?.name ?? "Unassigned",
    projectId: t.projectId ?? "",
    project: t.project?.name ?? "No project",
    dueDate: toDay(t.dueDate),
    createdAt: t.createdAt.toISOString(),
  };
}

export async function getTasksPageData() {
  const [tasks, projects, assignees] = await Promise.all([
    prisma.task.findMany({ include: taskInclude, orderBy: { createdAt: "desc" } }),
    prisma.project.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.user.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  return { tasks: tasks.map(toTaskRow), projects, assignees };
}
