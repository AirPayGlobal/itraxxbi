import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { toDay } from "@/lib/permissions";

export const JOB_STATUSES = ["OPEN", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "INVOICED", "CANCELLED"] as const;
export const JOB_TYPES = ["INSTALLATION", "MAINTENANCE", "REPAIR", "INSPECTION", "REMOVAL", "OTHER"] as const;

export interface JobCardRow {
  id: string;
  jobNumber: string;
  title: string;
  description: string;
  customerId: string;
  customer: string;
  technicianId: string;
  technician: string;
  vehicleId: string;
  vehicle: string;
  jobType: (typeof JOB_TYPES)[number];
  status: (typeof JOB_STATUSES)[number];
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  scheduledDate: string;
  estimatedHours: number | null;
  location: string;
  completedAt: string;
}

export interface VehicleOption {
  id: string;
  name: string;
  customerId: string;
}

export const jobCardInclude = {
  customer: { select: { name: true, company: true } },
  technician: { select: { name: true } },
  vehicle: { select: { make: true, model: true, registrationNumber: true } },
} satisfies Prisma.JobCardInclude;

type JobCardWithRelations = Prisma.JobCardGetPayload<{ include: typeof jobCardInclude }>;

export function vehicleLabel(v: { make: string; model: string; registrationNumber: string }) {
  return `${v.make} ${v.model} - ${v.registrationNumber}`;
}

export function toJobCardRow(j: JobCardWithRelations): JobCardRow {
  return {
    id: j.id,
    jobNumber: j.jobNumber,
    title: j.title,
    description: j.description ?? "",
    customerId: j.customerId ?? "",
    customer: j.customer ? j.customer.company ?? j.customer.name : "—",
    technicianId: j.technicianId ?? "",
    technician: j.technician?.name ?? "Unassigned",
    vehicleId: j.vehicleId ?? "",
    vehicle: j.vehicle ? vehicleLabel(j.vehicle) : "",
    jobType: j.jobType,
    status: j.status,
    priority: j.priority,
    scheduledDate: toDay(j.scheduledDate),
    estimatedHours: j.estimatedHours,
    location: j.location ?? "",
    completedAt: j.completedAt?.toISOString() ?? "",
  };
}

export async function getJobCardsPageData(includeRevenue: boolean) {
  const [jobCards, customers, technicians, vehicles, revenue] = await Promise.all([
    prisma.jobCard.findMany({ include: jobCardInclude, orderBy: { createdAt: "desc" } }),
    prisma.customer.findMany({
      where: { status: { not: "CHURNED" } },
      select: { id: true, name: true, company: true },
      orderBy: [{ company: "asc" }, { name: "asc" }],
    }),
    prisma.user.findMany({
      where: { role: "TECHNICIAN", isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.vehicle.findMany({
      select: { id: true, make: true, model: true, registrationNumber: true, customerId: true },
      orderBy: { registrationNumber: "asc" },
    }),
    includeRevenue
      ? prisma.invoice.aggregate({ _sum: { total: true }, where: { jobCardId: { not: null }, status: { not: "CANCELLED" } } })
      : null,
  ]);

  return {
    jobCards: jobCards.map(toJobCardRow),
    customers: customers.map((c) => ({ id: c.id, name: c.company ?? c.name })),
    technicians,
    vehicles: vehicles.map((v) => ({ id: v.id, name: vehicleLabel(v), customerId: v.customerId })),
    revenue: revenue ? revenue._sum.total ?? 0 : null,
  };
}
