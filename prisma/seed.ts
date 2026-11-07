import "dotenv/config";
import { PrismaClient, UserRole } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

const demoUsers = [
  {
    email: "admin@itrackerx.com",
    name: "Admin User",
    role: UserRole.ADMIN,
    password: "admin123",
    department: "Management",
    jobTitle: "System Administrator",
  },
  {
    email: "manager@itrackerx.com",
    name: "Sarah Manager",
    role: UserRole.MANAGER,
    password: "manager123",
    department: "Operations",
    jobTitle: "Operations Manager",
  },
  {
    email: "technician@itrackerx.com",
    name: "John Technician",
    role: UserRole.TECHNICIAN,
    password: "tech123",
    department: "Technical",
    jobTitle: "Senior Technician",
  },
  {
    email: "staff@itrackerx.com",
    name: "Jane Staff",
    role: UserRole.STAFF,
    password: "staff123",
    department: "Administration",
    jobTitle: "Office Administrator",
  },
  {
    email: "viewer@itrackerx.com",
    name: "Mike Viewer",
    role: UserRole.VIEWER,
    password: "viewer123",
    department: "External",
    jobTitle: "Auditor",
  },
];

const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (d: number, hour = 10) => {
  const t = new Date(Date.now() - d * DAY);
  t.setHours(hour, (d * 17) % 60, 0, 0);
  if (d >= 0 && t.getTime() > Date.now()) t.setTime(Date.now() - hour * 7 * 60 * 1000);
  return t;
};
const daysAhead = (d: number) => daysAgo(-d, 9);

const customers = [
  { name: "Petrus Shikongo", company: "Namib Logistics", city: "Windhoek", status: "ACTIVE", age: 170 },
  { name: "Anna Haufiku", company: "Erongo Freight", city: "Walvis Bay", status: "ACTIVE", age: 150 },
  { name: "Johan van Wyk", company: "Kalahari Transport", city: "Keetmanshoop", status: "ACTIVE", age: 128 },
  { name: "Maria Nghipondoka", company: "Oshana Couriers", city: "Oshakati", status: "ACTIVE", age: 104 },
  { name: "David Kandjii", company: "Skeleton Coast Tours", city: "Swakopmund", status: "ACTIVE", age: 81 },
  { name: "Selma Amutenya", company: "Etosha Safari Fleet", city: "Outjo", status: "ACTIVE", age: 58 },
  { name: "Frans Muller", company: "Desert Rose Mining", city: "Rosh Pinah", status: "INACTIVE", age: 52 },
  { name: "Hilma Iipumbu", company: "Capital Cab Co.", city: "Windhoek", status: "ACTIVE", age: 33 },
  { name: "Thomas Garoeb", company: "Kunene Water Haulage", city: "Opuwo", status: "ACTIVE", age: 12 },
  { name: "Ndapewa Shilongo", company: "Zambezi Agri Transport", city: "Katima Mulilo", status: "PROSPECT", age: 4 },
] as const;

const jobCards = [
  ["Tracker installation — 6 trucks", "OPEN", "INSTALLATION", "HIGH", 2],
  ["Replace faulty GPS antenna", "OPEN", "REPAIR", "URGENT", 1],
  ["Annual tracker inspection", "OPEN", "INSPECTION", "LOW", 6],
  ["Fuel sensor calibration", "OPEN", "MAINTENANCE", "MEDIUM", 9],
  ["Install driver ID tag readers", "OPEN", "INSTALLATION", "MEDIUM", 3],
  ["Panic button not reporting", "OPEN", "REPAIR", "HIGH", 0],
  ["Fleet tracker rollout — phase 2", "ASSIGNED", "INSTALLATION", "HIGH", 4],
  ["Remove trackers from sold vehicles", "ASSIGNED", "REMOVAL", "LOW", 7],
  ["Temperature probe install — reefer", "ASSIGNED", "INSTALLATION", "MEDIUM", 11],
  ["Ignition wire fault", "ASSIGNED", "REPAIR", "HIGH", 2],
  ["Camera system health check", "ASSIGNED", "INSPECTION", "MEDIUM", 14],
  ["Dashcam installation — 4 buses", "IN_PROGRESS", "INSTALLATION", "HIGH", 5],
  ["Tracker firmware update", "IN_PROGRESS", "MAINTENANCE", "MEDIUM", 8],
  ["CAN-bus integration", "IN_PROGRESS", "INSTALLATION", "URGENT", 3],
  ["Immobiliser relay replacement", "IN_PROGRESS", "REPAIR", "HIGH", 1],
  ["Quarterly fleet audit", "IN_PROGRESS", "INSPECTION", "LOW", 19],
  ["Tracker install — new bakkie", "COMPLETED", "INSTALLATION", "MEDIUM", 22],
  ["SIM card replacement", "COMPLETED", "MAINTENANCE", "LOW", 27],
  ["Harness re-route after accident", "COMPLETED", "REPAIR", "HIGH", 35],
  ["Fuel probe installation", "COMPLETED", "INSTALLATION", "MEDIUM", 41],
  ["Tracker install — 3 tippers", "INVOICED", "INSTALLATION", "MEDIUM", 48],
  ["Annual inspection — sedan fleet", "INVOICED", "INSPECTION", "LOW", 63],
  ["Power supply repair", "INVOICED", "REPAIR", "HIGH", 77],
  ["Duplicate booking", "CANCELLED", "OTHER", "LOW", 30],
] as const;

const tasks = [
  ["Order 20 tracker units from supplier", "TODO", "HIGH", 1, 3],
  ["Confirm install slot with Erongo Freight", "TODO", "MEDIUM", 2, 1],
  ["Prepare monthly fleet report", "IN_PROGRESS", "MEDIUM", 4, 6],
  ["Follow up overdue invoice — Desert Rose", "TODO", "URGENT", 1, 10],
  ["Calibrate diagnostic equipment", "TODO", "LOW", 9, 4],
  ["Review technician timesheets", "REVIEW", "MEDIUM", 3, 2],
  ["Renew SIM data bundles", "IN_PROGRESS", "HIGH", 5, 8],
  ["Update customer contact records", "TODO", "LOW", 12, 15],
  ["Train new technician on CAN-bus", "TODO", "MEDIUM", 7, 20],
  ["Restock fuse and relay kits", "DONE", "LOW", -2, 25],
  ["Send quote to Zambezi Agri Transport", "DONE", "HIGH", -1, 4],
  ["Plan Q1 inspection schedule", "TODO", "MEDIUM", 15, 40],
] as const;

// Monthly revenue grows roughly 8% a month; the current month is partial.
const monthlyRevenue = [31800, 34600, 37900, 41200, 45100, 23400];

async function seedBusinessData() {
  if ((await prisma.customer.count()) > 0) {
    console.log("Business data already present, skipping");
    return;
  }
  const users = Object.fromEntries(
    (await prisma.user.findMany({ select: { id: true, role: true } })).map((u) => [u.role, u.id])
  );

  const created = [];
  for (const [i, c] of customers.entries()) {
    created.push(
      await prisma.customer.create({
        data: {
          name: c.name,
          company: c.company,
          city: c.city,
          status: c.status,
          email: `${c.company.toLowerCase().replace(/[^a-z]/g, "")}@example.com`,
          accountNumber: `ACC-${String(1001 + i)}`,
          createdAt: daysAgo(c.age),
          updatedAt: daysAgo(c.age),
        },
      })
    );
  }
  const activeCustomers = created.filter((c) => c.status === "ACTIVE");

  for (const [i, [title, status, jobType, priority, age]] of jobCards.entries()) {
    const at = daysAgo(age, 8 + (i % 8));
    await prisma.jobCard.create({
      data: {
        jobNumber: `JC-${at.getFullYear() % 100}${String(at.getMonth() + 1).padStart(2, "0")}-${String(40 + i).padStart(4, "0")}`,
        title,
        status,
        jobType,
        priority,
        technicianId: status === "OPEN" ? null : users.TECHNICIAN,
        createdById: i % 2 ? users.MANAGER : users.ADMIN,
        customerId: activeCustomers[i % activeCustomers.length].id,
        scheduledDate: daysAgo(age - 2),
        completedAt: status === "COMPLETED" || status === "INVOICED" ? at : null,
        createdAt: daysAgo(age + 3),
        updatedAt: at,
      },
    });
  }

  const assignees = [users.TECHNICIAN, users.STAFF, users.MANAGER, users.ADMIN];
  for (const [i, [title, status, priority, dueIn, age]] of tasks.entries()) {
    await prisma.task.create({
      data: {
        title,
        status,
        priority,
        dueDate: daysAhead(dueIn),
        completedAt: status === "DONE" ? daysAgo(Math.max(0, -dueIn)) : null,
        assigneeId: assignees[i % assignees.length],
        createdById: users.MANAGER,
        createdAt: daysAgo(age),
        updatedAt: daysAgo(Math.min(age, i % 3), 9 + i),
      },
    });
  }

  let n = 1;
  for (const [m, target] of monthlyRevenue.entries()) {
    const monthsBack = monthlyRevenue.length - 1 - m;
    const now = new Date();
    const lastDay = m === monthlyRevenue.length - 1 ? now.getDate() : 28;
    const parts = [0.38, 0.27, 0.21, 0.14];
    for (const [k, share] of parts.entries()) {
      const paidAt = new Date(now.getFullYear(), now.getMonth() - monthsBack, Math.max(1, Math.round(lastDay * (k + 1) / parts.length)), 11);
      if (paidAt > now) paidAt.setTime(now.getTime() - (k + 1) * 3600 * 1000);
      const total = Math.round(target * share);
      await prisma.invoice.create({
        data: {
          invoiceNumber: `INV-${paidAt.getFullYear() % 100}${String(paidAt.getMonth() + 1).padStart(2, "0")}-${String(n++).padStart(4, "0")}`,
          customerId: activeCustomers[(m + k) % activeCustomers.length].id,
          subtotal: Math.round(total / 1.15),
          tax: total - Math.round(total / 1.15),
          total,
          status: "PAID",
          issuedDate: new Date(paidAt.getTime() - 14 * DAY),
          paidDate: paidAt,
          payments: { create: { amount: total, method: k % 2 ? "CARD" : "BANK_TRANSFER", paidAt } },
          createdAt: new Date(paidAt.getTime() - 14 * DAY),
        },
      });
    }
  }
  console.log(`Seeded ${customers.length} customers, ${jobCards.length} job cards, ${tasks.length} tasks, ${n - 1} paid invoices`);
}

async function main() {
  for (const user of demoUsers) {
    const hashedPassword = await bcrypt.hash(user.password, 12);
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: { ...user, password: hashedPassword },
    });
  }
  console.log("Seed complete: 5 demo users created");
  await seedBusinessData();
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
