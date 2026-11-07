import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { toDay } from "@/lib/permissions";

export const CUSTOMER_STATUSES = ["PROSPECT", "ACTIVE", "INACTIVE", "CHURNED"] as const;

export interface CustomerRow {
  id: string;
  accountNumber: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  notes: string;
  status: (typeof CUSTOMER_STATUSES)[number];
  vehicles: number;
  trackedVehicles: number;
  contractStart: string;
  contractEnd: string;
}

export const customerInclude = {
  vehicles: { select: { trackerStatus: true } },
} satisfies Prisma.CustomerInclude;

type CustomerWithVehicles = Prisma.CustomerGetPayload<{ include: typeof customerInclude }>;

export function toCustomerRow(c: CustomerWithVehicles): CustomerRow {
  return {
    id: c.id,
    accountNumber: c.accountNumber ?? "",
    name: c.name,
    company: c.company ?? "",
    email: c.email ?? "",
    phone: c.phone ?? "",
    address: c.address ?? "",
    city: c.city ?? "",
    country: c.country ?? "",
    notes: c.notes ?? "",
    status: c.status,
    vehicles: c.vehicles.length,
    trackedVehicles: c.vehicles.filter((v) => v.trackerStatus === "ACTIVE").length,
    contractStart: toDay(c.contractStart),
    contractEnd: toDay(c.contractEnd),
  };
}

export async function getCustomersPageData(includeRevenue: boolean) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const [customers, revenue] = await Promise.all([
    prisma.customer.findMany({ include: customerInclude, orderBy: [{ company: "asc" }, { name: "asc" }] }),
    includeRevenue ? prisma.payment.aggregate({ _sum: { amount: true }, where: { paidAt: { gte: monthStart } } }) : null,
  ]);
  return {
    customers: customers.map(toCustomerRow),
    revenueThisMonth: revenue ? revenue._sum.amount ?? 0 : null,
  };
}
