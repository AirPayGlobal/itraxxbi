// Safe to import from client components.
export const ROLES = ["ADMIN", "MANAGER", "TECHNICIAN", "STAFF", "VIEWER"] as const;
export type Role = (typeof ROLES)[number];
