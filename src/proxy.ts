import { NextResponse } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { canAccessRoute } from "@/lib/role-access";

const isPublic = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)", "/no-access"]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublic(req)) return;

  const { userId, redirectToSignIn } = await auth();
  if (!userId) return redirectToSignIn({ returnBackUrl: req.url });

  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/api/")) return;

  // Roles live in our database. Server actions re-check them, so this guard is about which pages render.
  const user = await prisma.user.findUnique({ where: { clerkId: userId }, select: { role: true, isActive: true } });
  if (!user) {
    // First visit after accepting an invite: the dashboard layout links the account, so send them there
    // rather than rendering a page before their role is known.
    return pathname === "/" ? undefined : NextResponse.redirect(new URL("/", req.url));
  }
  if (!user.isActive) return NextResponse.redirect(new URL("/no-access", req.url));
  if (!canAccessRoute(user.role, pathname)) return NextResponse.redirect(new URL("/", req.url));
});

export const config = {
  matcher: [
    // Skip Next internals and static files, unless found in search params.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
