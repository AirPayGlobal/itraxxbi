// Safe to import from client components.

/** ITRACKERX staff roles. */
export const ROLES = ["ADMIN", "MANAGER", "TECHNICIAN", "STAFF", "VIEWER"] as const;
export type Role = (typeof ROLES)[number];

/** People from customer companies. They only see the client portal and their own company's records. */
export const CLIENT_ROLE = "CLIENT" as const;
