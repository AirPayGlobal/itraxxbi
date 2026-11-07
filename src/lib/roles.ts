// Safe to import from client components (no server dependencies).
export const ROLES = ["ADMIN", "MANAGER", "TECHNICIAN", "STAFF", "VIEWER"] as const;
export type Role = (typeof ROLES)[number];

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: Role;
  department: string;
  status: "active" | "invited" | "deactivated";
}
