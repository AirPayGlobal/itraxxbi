import { prisma } from "@/lib/prisma";
import { ROLES, type Role, type TeamMember } from "@/lib/roles";

export { ROLES };
export type { Role, TeamMember };

export function toTeamMember(u: {
  id: string;
  name: string;
  email: string;
  role: Role;
  department: string | null;
  isActive: boolean;
  clerkId: string | null;
}): TeamMember {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    department: u.department ?? "",
    status: !u.isActive ? "deactivated" : u.clerkId ? "active" : "invited",
  };
}

export const teamSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  department: true,
  isActive: true,
  clerkId: true,
} as const;

export async function getTeam() {
  const users = await prisma.user.findMany({ select: teamSelect, orderBy: [{ isActive: "desc" }, { name: "asc" }] });
  return users.map(toTeamMember);
}
