import { cache } from "react";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

const userSelect = { id: true, name: true, email: true, role: true, isActive: true } as const;

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

/**
 * The signed-in person's app account, or null if they aren't signed in, weren't invited, or were deactivated.
 * Roles live in our database; Clerk only proves identity. On first sign-in the Clerk account is linked to the
 * invited user row by verified email.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const { userId } = await auth();
  if (!userId) return null;

  let user = await prisma.user.findUnique({ where: { clerkId: userId }, select: userSelect });

  if (!user) {
    const clerkUser = await currentUser();
    const emails =
      clerkUser?.emailAddresses
        .filter((e) => e.verification?.status === "verified")
        .map((e) => e.emailAddress.toLowerCase()) ?? [];
    if (emails.length) {
      const invited = await prisma.user.findFirst({
        where: { email: { in: emails }, clerkId: null },
        select: { id: true },
      });
      if (invited) {
        user = await prisma.user.update({ where: { id: invited.id }, data: { clerkId: userId }, select: userSelect });
      }
    }
  }

  if (!user || !user.isActive) return null;
  return { id: user.id, name: user.name, email: user.email, role: user.role };
});
