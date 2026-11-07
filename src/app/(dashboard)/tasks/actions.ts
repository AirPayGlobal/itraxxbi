"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { ActionResult, getWriter, oneOf, parseDay } from "@/lib/permissions";
import { PRIORITIES, TASK_STATUSES, TaskRow, taskInclude, toTaskRow } from "@/lib/tasks";

export interface TaskInput {
  title: string;
  description: string;
  status: string;
  priority: string;
  assigneeId: string;
  projectId: string;
  dueDate: string;
}

export async function saveTask(id: string | null, input: TaskInput): Promise<ActionResult<TaskRow>> {
  const user = await getWriter("/tasks");
  if (!user) return { ok: false, error: "You don't have permission to change tasks." };

  const title = input.title?.trim();
  const status = oneOf(input.status, TASK_STATUSES);
  const priority = oneOf(input.priority, PRIORITIES);
  const dueDate = parseDay(input.dueDate);
  if (!title) return { ok: false, error: "Title is required." };
  if (!status || !priority) return { ok: false, error: "Invalid status or priority." };
  if (!dueDate) return { ok: false, error: "A valid due date is required." };

  const [assignee, project] = await Promise.all([
    input.assigneeId ? prisma.user.findFirst({ where: { id: input.assigneeId, isActive: true }, select: { id: true } }) : null,
    input.projectId ? prisma.project.findUnique({ where: { id: input.projectId }, select: { id: true } }) : null,
  ]);
  if (input.assigneeId && !assignee) return { ok: false, error: "Selected assignee no longer exists." };
  if (input.projectId && !project) return { ok: false, error: "Selected project no longer exists." };

  const data = {
    title,
    description: input.description?.trim() || null,
    status,
    priority,
    dueDate,
    assigneeId: assignee?.id ?? null,
    projectId: project?.id ?? null,
  };

  try {
    let task;
    if (id) {
      const existing = await prisma.task.findUnique({ where: { id }, select: { status: true, completedAt: true } });
      if (!existing) return { ok: false, error: "This task no longer exists." };
      const completedAt = status === "DONE" ? existing.completedAt ?? new Date() : null;
      task = await prisma.task.update({ where: { id }, data: { ...data, completedAt }, include: taskInclude });
    } else {
      task = await prisma.task.create({
        data: { ...data, createdById: user.id, completedAt: status === "DONE" ? new Date() : null },
        include: taskInclude,
      });
    }
    revalidatePath("/");
    return { ok: true, data: toTaskRow(task) };
  } catch (err) {
    console.error("saveTask failed", err);
    return { ok: false, error: "Could not save the task. Please try again." };
  }
}
