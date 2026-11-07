import "dotenv/config";
import { PrismaClient, UserRole } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

const demoUsers = [
  {
    email: "admin@itrackerx.com",
    name: "Admin User",
    role: UserRole.ADMIN,
    department: "Management",
    jobTitle: "System Administrator",
  },
  {
    email: "manager@itrackerx.com",
    name: "Sarah Manager",
    role: UserRole.MANAGER,
    department: "Operations",
    jobTitle: "Operations Manager",
  },
  {
    email: "technician@itrackerx.com",
    name: "John Technician",
    role: UserRole.TECHNICIAN,
    department: "Technical",
    jobTitle: "Senior Technician",
  },
  {
    email: "staff@itrackerx.com",
    name: "Jane Staff",
    role: UserRole.STAFF,
    department: "Administration",
    jobTitle: "Office Administrator",
  },
  {
    email: "viewer@itrackerx.com",
    name: "Mike Viewer",
    role: UserRole.VIEWER,
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

const projectNames = ["Fleet Tracker Rollout", "Fleet Maintenance", "Vehicle Diagnostics", "Client Onboarding"];

async function seedProjects() {
  if ((await prisma.project.count()) > 0) return;
  const projects = [];
  for (const name of projectNames) projects.push(await prisma.project.create({ data: { name, status: "ACTIVE" } }));
  const tasks = await prisma.task.findMany({ where: { projectId: null }, select: { id: true }, orderBy: { createdAt: "asc" } });
  for (const [i, t] of tasks.entries()) {
    await prisma.task.update({ where: { id: t.id }, data: { projectId: projects[i % projects.length].id } });
  }
  console.log(`Seeded ${projects.length} projects`);
}

const vehicleModels = [
  ["Toyota", "Hilux"], ["Ford", "Ranger"], ["Isuzu", "D-Max"], ["Toyota", "Land Cruiser"], ["Nissan", "NP300"], ["Mercedes-Benz", "Actros"],
] as const;

async function seedVehicles() {
  if ((await prisma.vehicle.count()) > 0) return;
  const owners = await prisma.customer.findMany({ where: { status: "ACTIVE" }, select: { id: true }, orderBy: { accountNumber: "asc" } });
  let n = 0;
  for (const owner of owners) {
    for (let k = 0; k < 2; k++, n++) {
      const [make, model] = vehicleModels[n % vehicleModels.length];
      await prisma.vehicle.create({
        data: {
          make,
          model,
          year: 2018 + (n % 7),
          registrationNumber: `N ${1200 + n * 37} WB`,
          trackerStatus: "ACTIVE",
          customerId: owner.id,
        },
      });
    }
  }
  console.log(`Seeded ${n} vehicles`);
}

async function linkInvoicesToJobCards() {
  if ((await prisma.invoice.count({ where: { jobCardId: { not: null } } })) > 0) return;
  const jobs = await prisma.jobCard.findMany({ where: { status: "INVOICED" }, select: { id: true, customerId: true } });
  const invoices = await prisma.invoice.findMany({ where: { jobCardId: null, status: "PAID" }, select: { id: true }, orderBy: { paidDate: "desc" }, take: jobs.length });
  for (const [i, inv] of invoices.entries()) {
    await prisma.invoice.update({ where: { id: inv.id }, data: { jobCardId: jobs[i].id, customerId: jobs[i].customerId ?? undefined } });
  }
  if (invoices.length) console.log(`Linked ${invoices.length} invoices to job cards`);
}

async function seedContracts() {
  if ((await prisma.customer.count({ where: { contractStart: { not: null } } })) > 0) return;
  const rows = await prisma.customer.findMany({ where: { status: { in: ["ACTIVE", "INACTIVE"] } } });
  for (const c of rows) {
    // Inactive customers get a contract that ended a month ago; active ones a 12-month term from signup.
    const start = c.status === "ACTIVE" ? c.createdAt : new Date(Date.now() - 395 * DAY);
    const end = new Date(start.getTime() + 365 * DAY);
    await prisma.customer.update({ where: { id: c.id }, data: { contractStart: start, contractEnd: end } });
  }
  console.log(`Set contract dates on ${rows.length} customers`);
}

const demoTickets = [
  ["GPS tracker not reporting since yesterday", "GPS_DEVICE", "URGENT", "OPEN", 0, null,
    "Our truck stopped transmitting location data yesterday morning. We rely on live tracking for deliveries.",
    [["c", "Device last reported at 06:42 yesterday. Vehicle is parked at our depot."]]],
  ["Install trackers on 3 new Land Cruisers", "INSTALLATION", "HIGH", "IN_PROGRESS", 2, "MANAGER",
    "We bought three new Land Cruisers and need trackers fitted at our yard.",
    [["c", "Vehicles are at the depot, available weekdays 08:00–16:00."], ["a", "Booked our team for Thursday at 09:00."], ["c", "Thursday works, thank you!"]]],
  ["Invoice shows wrong vehicle count", "BILLING", "MEDIUM", "WAITING", 4, "ADMIN",
    "This month's invoice bills us for 14 vehicles but we only have 12 active units.",
    [["a", "Two units were reactivated on the 3rd. Can you confirm they're still in service?"]]],
  ["Geofence alerts firing at the wrong times", "SOFTWARE", "HIGH", "IN_PROGRESS", 1, "TECHNICIAN",
    "We get exit alerts while vehicles are still inside the Windhoek depot geofence.",
    [["a", "Looks like the polygon is too tight on the north gate. Adjusting now."]]],
  ["Intermittent signal loss in the north", "CONNECTIVITY", "MEDIUM", "OPEN", 1, null,
    "Units drop out between Otjiwarongo and Tsumeb for 20–30 minutes at a time.", []],
  ["Request driver behaviour report", "GENERAL", "LOW", "RESOLVED", 9, "STAFF",
    "Please send a harsh braking and speeding report for last quarter.",
    [["a", "Report attached to your account portal."], ["c", "Got it, thanks."]]],
  ["Fuel sensor reading 20% low", "GPS_DEVICE", "HIGH", "RESOLVED", 12, "TECHNICIAN",
    "Fuel level on the reefer truck reads about 20% lower than the gauge.",
    [["a", "Recalibrated the probe on site. Readings now match the gauge."]]],
  ["Add two new users to the portal", "SOFTWARE", "LOW", "CLOSED", 20, "STAFF",
    "Please give our dispatch supervisors access to the tracking portal.",
    [["a", "Accounts created and login details emailed."]]],
  ["Panic button pressed by mistake", "GENERAL", "MEDIUM", "CLOSED", 26, "MANAGER",
    "A driver hit the panic button accidentally. Please clear the alert.", [["a", "Alert cleared and logged as a false alarm."]]],
  ["Tracker damaged during accident", "GPS_DEVICE", "URGENT", "WAITING", 3, "TECHNICIAN",
    "One of our vehicles was in an accident and the tracker unit is damaged.",
    [["a", "We can replace it on Monday. Is the vehicle drivable to our workshop?"]]],
] as const;

async function seedTickets() {
  if ((await prisma.ticket.count()) > 0) return;
  const users = await prisma.user.findMany({ select: { id: true, name: true, role: true } });
  const byRole = Object.fromEntries(users.map((u) => [u.role, u]));
  const owners = await prisma.customer.findMany({
    where: { status: "ACTIVE" },
    include: { vehicles: { select: { id: true } } },
    orderBy: { accountNumber: "asc" },
  });
  for (const [i, [subject, category, priority, status, age, assignee, description, thread]] of demoTickets.entries()) {
    const owner = owners[i % owners.length];
    const createdAt = daysAgo(age, 8 + (i % 6));
    const prefix = `TKT-${createdAt.getFullYear() % 100}${String(createdAt.getMonth() + 1).padStart(2, "0")}-`;
    const agent = assignee ? byRole[assignee] : byRole.STAFF;
    const lastAt = new Date(Math.min(createdAt.getTime() + thread.length * 3 * 3600 * 1000, Date.now() - 10 * 60 * 1000));
    await prisma.ticket.create({
      data: {
        ticketNumber: `${prefix}${String(i + 1).padStart(4, "0")}`,
        subject,
        description,
        category,
        priority,
        status,
        contactName: owner.name,
        contactEmail: owner.email,
        contactPhone: owner.phone,
        customerId: owner.id,
        vehicleId: category === "GPS_DEVICE" ? owner.vehicles[0]?.id : null,
        assignedToId: assignee ? byRole[assignee].id : null,
        createdById: byRole.STAFF.id,
        resolvedAt: status === "RESOLVED" || status === "CLOSED" ? lastAt : null,
        createdAt,
        updatedAt: lastAt,
        replies: {
          create: thread.map(([who, message], k) => ({
            message,
            fromCustomer: who === "c",
            authorName: who === "c" ? owner.name : agent.name,
            userId: who === "c" ? null : agent.id,
            createdAt: new Date(Math.min(createdAt.getTime() + (k + 1) * 3 * 3600 * 1000, lastAt.getTime())),
          })),
        },
      },
    });
  }
  console.log(`Seeded ${demoTickets.length} tickets`);
}

async function main() {
  // Demo staff own the sample tasks, job cards and tickets. Sign-in is through Clerk, so they can only log in
  // if someone with that email is invited.
  for (const user of demoUsers) {
    await prisma.user.upsert({ where: { email: user.email }, update: {}, create: user });
  }
  console.log(`Seed complete: ${demoUsers.length} demo users`);

  // Access is invite-only, so the first administrator is created here. They sign in through Clerk with this email.
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (adminEmail) {
    await prisma.user.upsert({
      where: { email: adminEmail },
      update: { role: UserRole.ADMIN, isActive: true },
      create: { email: adminEmail, name: process.env.ADMIN_NAME?.trim() || "Administrator", role: UserRole.ADMIN },
    });
    console.log(`Admin access granted to ${adminEmail}`);
  }
  await seedBusinessData();
  await seedProjects();
  await seedVehicles();
  await linkInvoicesToJobCards();
  await seedContracts();
  await seedTickets();
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
