export const roleAccess: Record<string, string[]> = {
  ADMIN: [
    "/", "/projects", "/tasks", "/jobcards", "/inspections", "/tickets",
    "/customers", "/customer-onboarding", "/staff", "/hr", "/payslips",
    "/documents", "/inventory", "/finance", "/sales-pipeline", "/my-portal",
    "/meeting-ai", "/traxx", "/settings",
  ],
  MANAGER: [
    "/", "/projects", "/tasks", "/jobcards", "/inspections", "/tickets",
    "/customers", "/customer-onboarding", "/staff", "/hr", "/payslips", "/documents",
    "/inventory", "/finance", "/sales-pipeline", "/my-portal", "/meeting-ai",
    "/traxx",
  ],
  TECHNICIAN: [
    "/", "/tasks", "/jobcards", "/inspections", "/tickets", "/customers",
    "/documents", "/inventory", "/my-portal",
  ],
  STAFF: [
    "/", "/tasks", "/tickets", "/documents", "/hr", "/my-portal",
  ],
  VIEWER: [
    "/", "/projects", "/tasks", "/jobcards", "/customers", "/finance",
  ],
  CLIENT: ["/portal"],
};

/** Where someone lands after signing in, and where they're sent from pages their role can't open. */
export function homeFor(role: string): string {
  return role === "CLIENT" ? "/portal" : "/";
}

export function canAccessRoute(role: string, path: string): boolean {
  const allowed = roleAccess[role];
  if (!allowed) return false;
  return allowed.some(
    (route) => route === path || (route !== "/" && path.startsWith(route))
  );
}
