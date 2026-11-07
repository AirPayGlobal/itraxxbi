"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { ActionResult, getWriter, oneOf, parseDay } from "@/lib/permissions";
import { CUSTOMER_STATUSES, CustomerRow, customerInclude, toCustomerRow } from "@/lib/customers";

export interface CustomerInput {
  name: string;
  company: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  notes: string;
  status: string;
  contractStart: string;
  contractEnd: string;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function nextAccountNumber() {
  const rows = await prisma.customer.findMany({ where: { accountNumber: { startsWith: "ACC-" } }, select: { accountNumber: true } });
  const max = rows.reduce((m, r) => Math.max(m, parseInt(r.accountNumber!.slice(4), 10) || 0), 1000);
  return `ACC-${max + 1}`;
}

export async function saveCustomer(id: string | null, input: CustomerInput): Promise<ActionResult<CustomerRow>> {
  const user = await getWriter("/customers");
  if (!user) return { ok: false, error: "You don't have permission to change customers." };

  const name = input.name?.trim();
  const email = input.email?.trim().toLowerCase() || null;
  const status = id ? oneOf(input.status, CUSTOMER_STATUSES) : "ACTIVE";
  const contractStart = input.contractStart ? parseDay(input.contractStart) : null;
  const contractEnd = input.contractEnd ? parseDay(input.contractEnd) : null;
  if (!name) return { ok: false, error: "Name is required." };
  if (email && !EMAIL.test(email)) return { ok: false, error: "Please enter a valid email address." };
  if (!status) return { ok: false, error: "Invalid status." };
  if ((input.contractStart && !contractStart) || (input.contractEnd && !contractEnd)) {
    return { ok: false, error: "Contract dates are not valid." };
  }
  if (contractStart && contractEnd && contractEnd < contractStart) {
    return { ok: false, error: "Contract end must be after the start." };
  }

  const data = {
    name,
    company: input.company?.trim() || null,
    email,
    phone: input.phone?.trim() || null,
    address: input.address?.trim() || null,
    city: input.city?.trim() || null,
    country: input.country?.trim() || "Namibia",
    notes: input.notes?.trim() || null,
    status,
    contractStart,
    contractEnd,
  };

  try {
    let customer;
    if (id) {
      if (!(await prisma.customer.findUnique({ where: { id }, select: { id: true } }))) {
        return { ok: false, error: "This customer no longer exists." };
      }
      customer = await prisma.customer.update({ where: { id }, data, include: customerInclude });
    } else {
      for (let attempt = 0; ; attempt++) {
        try {
          customer = await prisma.customer.create({
            data: { ...data, accountNumber: await nextAccountNumber() },
            include: customerInclude,
          });
          break;
        } catch (err) {
          const clash = err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
          if (!clash || attempt >= 4) throw err;
        }
      }
    }
    revalidatePath("/");
    return { ok: true, data: toCustomerRow(customer) };
  } catch (err) {
    console.error("saveCustomer failed", err);
    return { ok: false, error: "Could not save the customer. Please try again." };
  }
}
