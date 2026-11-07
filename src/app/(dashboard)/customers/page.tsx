import { getCurrentUser } from "@/lib/session";
import { getCustomersPageData } from "@/lib/customers";
import { canWrite } from "@/lib/permissions";
import { canAccessRoute } from "@/lib/role-access";
import { CustomersBoard } from "./customers-board";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const user = await getCurrentUser();
  const role = user?.role ?? "VIEWER";
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
