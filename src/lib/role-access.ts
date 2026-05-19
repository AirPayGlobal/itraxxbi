export const roleAccess: Record<string, string[]> = {
  ADMIN: [
    "/", "/projects", "/tasks", "/jobcards", "/tickets", "/customers",
    "/customer-onboarding", "/staff", "/hr", "/payslips", "/documents",
    "/inventory", "/finance", "/sales-pipeline", "/my-portal", "/meeting-ai",
    "/traxx", "/settings",
  ],
  MANAGER: [
    "/", "/projects", "/tasks", "/jobcards", "/tickets", "/customers",
    "/customer-onboarding", "/staff", "/hr", "/documents", "/inventory",
    "/finance", "/sales-pipeline", "/my-portal", "/meeting-ai", "/traxx",
  ],
  TECHNICIAN: [
    "/", "/tasks", "/jobcards", "/tickets", "/customers", "/documents",
    "/inventory", "/my-portal",
  ],
  STAFF: [
    "/", "/tasks", "/tickets", "/documents", "/hr", "/my-portal", "/payslips",
  ],
  VIEWER: [
    "/", "/projects", "/tasks", "/jobcards", "/customers", "/finance",
  ],
};

export function canAccessRoute(role: string, path: string): boolean {
  const allowed = roleAccess[role];
  if (!allowed) return false;
  return allowed.some(
    (route) => route === path || (route !== "/" && path.startsWith(route))
  );
}
