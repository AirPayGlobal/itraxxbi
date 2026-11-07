import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getJobCardsPageData } from "@/lib/jobcards";
import { canWrite } from "@/lib/permissions";
import { canAccessRoute } from "@/lib/role-access";
import { JobCardsBoard } from "./jobcards-board";

export const dynamic = "force-dynamic";

export default async function JobCardsPage() {
  const session = await getServerSession(authOptions);
  const role = session?.user.role ?? "VIEWER";
  const data = await getJobCardsPageData(canAccessRoute(role, "/finance"));

  return (
    <JobCardsBoard
      initialJobCards={data.jobCards}
      customers={data.customers}
      technicians={data.technicians}
      vehicles={data.vehicles}
      revenue={data.revenue}
      canEdit={canWrite(role, "/jobcards")}
    />
  );
}
