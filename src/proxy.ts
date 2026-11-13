import { NextResponse } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { canAccessRoute } from "@/lib/role-access";
import { resolveProfile } from "@/lib/link-profile";

const isPublic = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)", "/no-access"]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublic(req)) return;

  const { userId, redirectToSignIn } = await auth();
  if (!userId) return redirectToSignIn({ returnBackUrl: req.url });

  // API routes check permissions themselves.
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/api/")) return;

  // Pages follow the same role rules as the sidebar; the database enforces data access separately.
  // A misconfigured server (missing key, unreachable database) sends people to /no-access, which explains it.
  const profile = await resolveProfile(userId).catch((err) => {
    console.error("Could not resolve profile", err);
    return null;
  });
  if (!profile?.is_active) return NextResponse.redirect(new URL("/no-access", req.url));
  if (!canAccessRoute(profile.role, pathname)) return NextResponse.redirect(new URL("/", req.url));
},
  // Send signed-out visitors to the app's branded pages rather than Clerk's hosted Account Portal.
  { signInUrl: "/sign-in", signUpUrl: "/sign-up" }
);

export const config = {
  matcher: [
    // Skip Next internals and static files, unless found in search params.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
