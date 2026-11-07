import { getCurrentUser } from "@/lib/session";
import { getDashboardData } from "@/lib/dashboard";
import { canAccessRoute } from "@/lib/role-access";
import { DashboardView } from "@/components/dashboard/dashboard-view";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const role = user?.role ?? "VIEWER";
  const data = await getDashboardData(canAccessRoute(role, "/finance"));

  return <DashboardView data={data} userName={user?.name ?? "there"} />;
}
