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
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
