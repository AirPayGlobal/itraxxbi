"use server";

import { headers } from "next/headers";
import { clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { ActionResult, getWriter, oneOf } from "@/lib/permissions";
import { ROLES, TeamMember, teamSelect, toTeamMember } from "@/lib/team";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DENIED = { ok: false as const, error: "Only administrators can manage the team." };

async function requireAdmin() {
  const user = await getWriter("/settings");
  return user?.role === "ADMIN" ? user : null;
}

async function signUpUrl() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}/sign-up`;
}

async function sendInvitation(email: string) {
  const clerk = await clerkClient();
  await clerk.invitations.createInvitation({ emailAddress: email, redirectUrl: await signUpUrl(), ignoreExisting: true });
}

function clerkErrorMessage(err: unknown): string {
  const e = err as { errors?: { longMessage?: string; message?: string }[] };
  return e?.errors?.[0]?.longMessage ?? e?.errors?.[0]?.message ?? "Clerk couldn't send the invitation.";
}

export async function inviteMember(input: { name: string; email: string; role: string; department: string }): Promise<ActionResult<TeamMember>> {
  if (!(await requireAdmin())) return DENIED;

  const name = input.name?.trim();
  const email = input.email?.trim().toLowerCase();
  const role = oneOf(input.role, ROLES);
  if (!name) return { ok: false, error: "Name is required." };
  if (!email || !EMAIL.test(email)) return { ok: false, error: "Please enter a valid email address." };
  if (!role) return { ok: false, error: "Please choose a role." };

  if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) {
    return { ok: false, error: "Someone with that email is already on the team." };
  }

  // Send the invitation first so a failure doesn't leave a half-invited user behind.
  try {
    await sendInvitation(email);
  } catch (err) {
    console.error("Clerk invitation failed", err);
    return { ok: false, error: clerkErrorMessage(err) };
  }

  const user = await prisma.user.create({
    data: { name, email, role, department: input.department?.trim() || null },
    select: teamSelect,
  });
  return { ok: true, data: toTeamMember(user) };
}

export async function resendInvite(id: string): Promise<ActionResult<TeamMember>> {
  if (!(await requireAdmin())) return DENIED;
  const user = await prisma.user.findUnique({ where: { id }, select: teamSelect });
  if (!user) return { ok: false, error: "That person no longer exists." };
  if (user.clerkId) return { ok: false, error: "They've already accepted their invitation." };
  try {
    await sendInvitation(user.email);
  } catch (err) {
    console.error("Clerk invitation failed", err);
    return { ok: false, error: clerkErrorMessage(err) };
  }
  return { ok: true, data: toTeamMember(user) };
}

export async function updateMember(id: string, changes: { role?: string; isActive?: boolean }): Promise<ActionResult<TeamMember>> {
  const admin = await requireAdmin();
  if (!admin) return DENIED;
  if (id === admin.id) return { ok: false, error: "You can't change your own role or access." };

  const data: { role?: (typeof ROLES)[number]; isActive?: boolean } = {};
  if (changes.role !== undefined) {
    const role = oneOf(changes.role, ROLES);
    if (!role) return { ok: false, error: "Invalid role." };
    data.role = role;
  }
  if (changes.isActive !== undefined) data.isActive = !!changes.isActive;

  try {
    const user = await prisma.user.update({ where: { id }, data, select: teamSelect });
    return { ok: true, data: toTeamMember(user) };
  } catch (err) {
    console.error("updateMember failed", err);
    return { ok: false, error: "Could not update this person. Please try again." };
  }
}
