"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ActionResult, getWriter, oneOf } from "@/lib/permissions";
import { PRIORITIES } from "@/lib/tasks";
import { AGENT_ROLES, TICKET_CATEGORIES, TICKET_STATUSES, TicketRow, ticketInclude, toTicketRow } from "@/lib/tickets";

export interface NewTicketInput {
  customerId: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  subject: string;
  description: string;
  priority: string;
  category: string;
  vehicleId: string;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DENIED = { ok: false as const, error: "You don't have permission to change tickets." };

async function nextTicketNumber(now = new Date()) {
  const prefix = `TKT-${String(now.getFullYear() % 100).padStart(2, "0")}${String(now.getMonth() + 1).padStart(2, "0")}-`;
  const last = await prisma.ticket.findFirst({
    where: { ticketNumber: { startsWith: prefix } },
    orderBy: { ticketNumber: "desc" },
    select: { ticketNumber: true },
  });
  const seq = last ? parseInt(last.ticketNumber.slice(prefix.length), 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(4, "0")}`;
}

export async function createTicket(input: NewTicketInput): Promise<ActionResult<TicketRow>> {
  const user = await getWriter("/tickets");
  if (!user) return DENIED;

  const subject = input.subject?.trim();
  const description = input.description?.trim();
  const contactName = input.contactName?.trim();
  const contactEmail = input.contactEmail?.trim().toLowerCase() || null;
  const priority = oneOf(input.priority, PRIORITIES);
  const category = oneOf(input.category, TICKET_CATEGORIES);
  if (!subject || !description) return { ok: false, error: "Subject and description are required." };
  if (!contactName) return { ok: false, error: "Contact name is required." };
  if (contactEmail && !EMAIL.test(contactEmail)) return { ok: false, error: "Please enter a valid email address." };
  if (!priority || !category) return { ok: false, error: "Invalid priority or category." };

  const [customer, vehicle] = await Promise.all([
    prisma.customer.findUnique({ where: { id: input.customerId || "" }, select: { id: true } }),
    input.vehicleId ? prisma.vehicle.findUnique({ where: { id: input.vehicleId }, select: { id: true, customerId: true } }) : null,
  ]);
  if (!customer) return { ok: false, error: "Please choose a valid customer." };
  if (input.vehicleId && (!vehicle || vehicle.customerId !== customer.id)) {
    return { ok: false, error: "That vehicle doesn't belong to the selected customer." };
  }

  try {
    for (let attempt = 0; ; attempt++) {
      try {
        const ticket = await prisma.ticket.create({
          data: {
            ticketNumber: await nextTicketNumber(),
            subject,
            description,
            priority,
            category,
            contactName,
            contactEmail,
            contactPhone: input.contactPhone?.trim() || null,
            customerId: customer.id,
            vehicleId: vehicle?.id ?? null,
            createdById: user.id,
          },
          include: ticketInclude,
        });
        return { ok: true, data: toTicketRow(ticket) };
      } catch (err) {
        const clash = err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
        if (!clash || attempt >= 4) throw err;
      }
    }
  } catch (err) {
    console.error("createTicket failed", err);
    return { ok: false, error: "Could not create the ticket. Please try again." };
  }
}

export async function updateTicket(
  id: string,
  changes: { status?: string; assignedToId?: string }
): Promise<ActionResult<TicketRow>> {
  const user = await getWriter("/tickets");
  if (!user) return DENIED;

  const existing = await prisma.ticket.findUnique({ where: { id }, select: { resolvedAt: true } });
  if (!existing) return { ok: false, error: "This ticket no longer exists." };

  const data: Prisma.TicketUncheckedUpdateInput = {};
  if (changes.status !== undefined) {
    const status = oneOf(changes.status, TICKET_STATUSES);
    if (!status) return { ok: false, error: "Invalid status." };
    const closed = status === "RESOLVED" || status === "CLOSED";
    data.status = status;
    data.resolvedAt = closed ? existing.resolvedAt ?? new Date() : null;
  }
  if (changes.assignedToId !== undefined) {
    if (changes.assignedToId) {
      const agent = await prisma.user.findFirst({
        where: { id: changes.assignedToId, isActive: true, role: { in: [...AGENT_ROLES] } },
        select: { id: true },
      });
      if (!agent) return { ok: false, error: "That person can't be assigned tickets." };
    }
    data.assignedToId = changes.assignedToId || null;
  }

  try {
    const ticket = await prisma.ticket.update({ where: { id }, data, include: ticketInclude });
    return { ok: true, data: toTicketRow(ticket) };
  } catch (err) {
    console.error("updateTicket failed", err);
    return { ok: false, error: "Could not update the ticket. Please try again." };
  }
}

export async function addTicketReply(id: string, message: string): Promise<ActionResult<TicketRow>> {
  const user = await getWriter("/tickets");
  if (!user) return DENIED;

  const text = message?.trim();
  if (!text) return { ok: false, error: "Reply can't be empty." };
  if (text.length > 5000) return { ok: false, error: "Reply is too long (5000 characters max)." };

  const existing = await prisma.ticket.findUnique({ where: { id }, select: { status: true } });
  if (!existing) return { ok: false, error: "This ticket no longer exists." };
  if (existing.status === "CLOSED") return { ok: false, error: "Closed tickets can't receive replies." };

  try {
    const ticket = await prisma.ticket.update({
      where: { id },
      data: { replies: { create: { message: text, authorName: user.name, userId: user.id } } },
      include: ticketInclude,
    });
    return { ok: true, data: toTicketRow(ticket) };
  } catch (err) {
    console.error("addTicketReply failed", err);
    return { ok: false, error: "Could not send the reply. Please try again." };
  }
}
