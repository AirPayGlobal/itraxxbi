import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDashboardData } from "@/lib/dashboard";
import { canAccessRoute } from "@/lib/role-access";
import { DashboardView } from "@/components/dashboard/dashboard-view";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const role = session?.user.role ?? "VIEWER";
  const data = await getDashboardData(canAccessRoute(role, "/finance"));

  return <DashboardView data={data} userName={session?.user.name ?? "there"} />;
}
