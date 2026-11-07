import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getTeam } from "@/lib/team";
import { TeamBoard } from "./team-board";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const user = await getCurrentUser();
  if (user?.role !== "ADMIN") redirect("/");
  return <TeamBoard initialMembers={await getTeam()} currentUserId={user.id} />;
}
