import { getCurrentUser } from "@/lib/session";
import { getJobCardsPageData } from "@/lib/jobcards";
import { canWrite } from "@/lib/permissions";
import { canAccessRoute } from "@/lib/role-access";
import { JobCardsBoard } from "./jobcards-board";

export const dynamic = "force-dynamic";

export default async function JobCardsPage({ searchParams }: { searchParams: Promise<{ customer?: string }> }) {
  const [user, { customer }] = await Promise.all([getCurrentUser(), searchParams]);
  const role = user?.role ?? "VIEWER";
  const data = await getJobCardsPageData(canAccessRoute(role, "/finance"));
  const canEdit = canWrite(role, "/jobcards");
  const prefillCustomerId = canEdit && data.customers.some((c) => c.id === customer) ? customer : undefined;

  return (
    <JobCardsBoard
      initialJobCards={data.jobCards}
      customers={data.customers}
      technicians={data.technicians}
      vehicles={data.vehicles}
      revenue={data.revenue}
      canEdit={canEdit}
      prefillCustomerId={prefillCustomerId}
    />
  );
}
