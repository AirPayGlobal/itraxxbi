import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { vehicleLabel } from "@/lib/jobcards";

export const TICKET_STATUSES = ["OPEN", "IN_PROGRESS", "WAITING", "RESOLVED", "CLOSED"] as const;
export const TICKET_CATEGORIES = ["GPS_DEVICE", "CONNECTIVITY", "INSTALLATION", "BILLING", "SOFTWARE", "GENERAL"] as const;

export interface TicketComment {
  id: string;
  author: string;
  role: "customer" | "agent";
  message: string;
  createdAt: string;
}

export interface TicketRow {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  status: (typeof TICKET_STATUSES)[number];
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  category: (typeof TICKET_CATEGORIES)[number];
  customerId: string;
  customer: string;
  company: string;
  email: string;
  phone: string;
  assignedToId: string;
  assignedTo: string | null;
  vehicleReg: string | null;
  comments: TicketComment[];
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

export interface TicketCustomerOption {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
}

export const ticketInclude = {
  customer: { select: { name: true, company: true } },
  assignedTo: { select: { name: true } },
  vehicle: { select: { registrationNumber: true } },
  replies: { orderBy: { createdAt: "asc" } },
} satisfies Prisma.TicketInclude;

type TicketWithRelations = Prisma.TicketGetPayload<{ include: typeof ticketInclude }>;

export function toTicketRow(t: TicketWithRelations): TicketRow {
  return {
    id: t.id,
    ticketNumber: t.ticketNumber,
    subject: t.subject,
    description: t.description,
    status: t.status,
    priority: t.priority,
    category: t.category,
    customerId: t.customerId,
    customer: t.contactName,
    company: t.customer.company ?? t.customer.name,
    email: t.contactEmail ?? "",
    phone: t.contactPhone ?? "",
    assignedToId: t.assignedToId ?? "",
    assignedTo: t.assignedTo?.name ?? null,
    vehicleReg: t.vehicle?.registrationNumber ?? null,
    comments: t.replies.map((r) => ({
      id: r.id,
      author: r.authorName,
      role: r.fromCustomer ? "customer" : "agent",
      message: r.message,
      createdAt: r.createdAt.toISOString(),
    })),
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    resolvedAt: t.resolvedAt?.toISOString() ?? null,
  };
}

export const AGENT_ROLES = ["ADMIN", "MANAGER", "TECHNICIAN", "STAFF"] as const;

export async function getTicketsPageData() {
  const [tickets, customers, vehicles, agents] = await Promise.all([
    prisma.ticket.findMany({ include: ticketInclude, orderBy: { updatedAt: "desc" } }),
    prisma.customer.findMany({
      where: { status: { not: "CHURNED" } },
      select: { id: true, name: true, company: true, email: true, phone: true },
      orderBy: [{ company: "asc" }, { name: "asc" }],
    }),
    prisma.vehicle.findMany({
      select: { id: true, make: true, model: true, registrationNumber: true, customerId: true },
      orderBy: { registrationNumber: "asc" },
    }),
    prisma.user.findMany({
      where: { isActive: true, role: { in: [...AGENT_ROLES] } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  return {
    tickets: tickets.map(toTicketRow),
    customers: customers.map<TicketCustomerOption>((c) => ({
      id: c.id,
      name: c.company ?? c.name,
      contactName: c.name,
      email: c.email ?? "",
      phone: c.phone ?? "",
    })),
    vehicles: vehicles.map((v) => ({ id: v.id, name: vehicleLabel(v), customerId: v.customerId })),
    agents,
  };
}
