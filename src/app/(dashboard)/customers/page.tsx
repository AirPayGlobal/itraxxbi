import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCustomersPageData } from "@/lib/customers";
import { canWrite } from "@/lib/permissions";
import { canAccessRoute } from "@/lib/role-access";
import { CustomersBoard } from "./customers-board";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const session = await getServerSession(authOptions);
  const role = session?.user.role ?? "VIEWER";
  const data = await getCustomersPageData(canAccessRoute(role, "/finance"));

  return (
    <CustomersBoard
      initialCustomers={data.customers}
      revenueThisMonth={data.revenueThisMonth}
      canEdit={canWrite(role, "/customers")}
      canCreateJobs={canWrite(role, "/jobcards")}
    />
  );
}
