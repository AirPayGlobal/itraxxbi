"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { ActionResult, getWriter, oneOf, parseDay } from "@/lib/permissions";
import { JOB_STATUSES, JOB_TYPES, JobCardRow, jobCardInclude, toJobCardRow } from "@/lib/jobcards";
import { PRIORITIES } from "@/lib/tasks";

export interface JobCardInput {
  title: string;
  description: string;
  jobType: string;
  priority: string;
  status: string;
  customerId: string;
  vehicleId: string;
  technicianId: string;
  scheduledDate: string;
  estimatedHours: string;
  location: string;
}

async function nextJobNumber(now = new Date()) {
  const prefix = `JC-${String(now.getFullYear() % 100).padStart(2, "0")}${String(now.getMonth() + 1).padStart(2, "0")}-`;
  const last = await prisma.jobCard.findFirst({
    where: { jobNumber: { startsWith: prefix } },
    orderBy: { jobNumber: "desc" },
    select: { jobNumber: true },
  });
  const seq = last ? parseInt(last.jobNumber.slice(prefix.length), 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(4, "0")}`;
}

export async function saveJobCard(id: string | null, input: JobCardInput): Promise<ActionResult<JobCardRow>> {
  const user = await getWriter("/jobcards");
  if (!user) return { ok: false, error: "You don't have permission to change job cards." };

  const title = input.title?.trim();
  const jobType = oneOf(input.jobType, JOB_TYPES);
  const priority = oneOf(input.priority, PRIORITIES);
  const status = id ? oneOf(input.status, JOB_STATUSES) : "OPEN";
  const scheduledDate = parseDay(input.scheduledDate);
  const hours = input.estimatedHours === "" ? null : Number(input.estimatedHours);
  if (!title) return { ok: false, error: "Title is required." };
  if (!jobType || !priority || !status) return { ok: false, error: "Invalid job type, priority or status." };
  if (!scheduledDate) return { ok: false, error: "A valid scheduled date is required." };
  if (hours !== null && (!Number.isFinite(hours) || hours < 0 || hours > 1000)) {
    return { ok: false, error: "Estimated hours must be a positive number." };
  }

  const [customer, technician, vehicle] = await Promise.all([
    prisma.customer.findUnique({ where: { id: input.customerId || "" }, select: { id: true } }),
    input.technicianId
      ? prisma.user.findFirst({ where: { id: input.technicianId, role: "TECHNICIAN", isActive: true }, select: { id: true } })
      : null,
    input.vehicleId ? prisma.vehicle.findUnique({ where: { id: input.vehicleId }, select: { id: true, customerId: true } }) : null,
  ]);
  if (!customer) return { ok: false, error: "Please choose a valid customer." };
  if (input.technicianId && !technician) return { ok: false, error: "Selected technician is not available." };
  if (input.vehicleId && (!vehicle || vehicle.customerId !== customer.id)) {
    return { ok: false, error: "That vehicle doesn't belong to the selected customer." };
  }

  const data = {
    title,
    description: input.description?.trim() || null,
    jobType,
    priority,
    status,
    customerId: customer.id,
    technicianId: technician?.id ?? null,
    vehicleId: vehicle?.id ?? null,
    scheduledDate,
    estimatedHours: hours,
    location: input.location?.trim() || null,
  };

  try {
    let job;
    if (id) {
      const existing = await prisma.jobCard.findUnique({ where: { id }, select: { startedAt: true, completedAt: true } });
      if (!existing) return { ok: false, error: "This job card no longer exists." };
      const now = new Date();
      const started = status === "IN_PROGRESS" || status === "COMPLETED" || status === "INVOICED";
      const done = status === "COMPLETED" || status === "INVOICED";
      job = await prisma.jobCard.update({
        where: { id },
        data: {
          ...data,
          startedAt: started ? existing.startedAt ?? now : existing.startedAt,
          completedAt: done ? existing.completedAt ?? now : null,
        },
        include: jobCardInclude,
      });
    } else {
      for (let attempt = 0; ; attempt++) {
        try {
          job = await prisma.jobCard.create({
            data: { ...data, jobNumber: await nextJobNumber(), createdById: user.id },
            include: jobCardInclude,
          });
          break;
        } catch (err) {
          const clash = err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
          if (!clash || attempt >= 4) throw err;
        }
      }
    }
    revalidatePath("/");
    return { ok: true, data: toJobCardRow(job) };
  } catch (err) {
    console.error("saveJobCard failed", err);
    return { ok: false, error: "Could not save the job card. Please try again." };
  }
}
