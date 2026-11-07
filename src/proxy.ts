import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { canAccessRoute } from "@/lib/role-access";

export async function proxy(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  const { pathname } = req.nextUrl;
  const isPage = !pathname.startsWith("/api/") && !/\.\w+$/.test(pathname);
  if (isPage && !canAccessRoute(token.role, pathname)) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip auth pages, Next internals and any static file (paths with an extension, e.g. /logo-dark.svg).
    "/((?!login|register|forgot-password|reset-password|api/auth|_next|.*\\.[a-zA-Z0-9]+$).*)",
  ],
};
