import { canAccessRoute } from "@/lib/role-access";
import { getCurrentUser } from "@/lib/session";

export function canWrite(role: string, route: string): boolean {
  return role !== "VIEWER" && canAccessRoute(role, route);
}

/** Returns the signed-in user if they may change records behind `route`, otherwise null. */
export async function getWriter(route: string) {
  const user = await getCurrentUser();
  if (!user || !canWrite(user.role, route)) return null;
  return user;
}

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

/** Parses a YYYY-MM-DD form value; stored at noon UTC so it reads as the same day in any timezone. */
export function parseDay(value: unknown): Date | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function toDay(date: Date | null): string {
  return date ? date.toISOString().slice(0, 10) : "";
}

export function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  return allowed.includes(value as T) ? (value as T) : null;
}
