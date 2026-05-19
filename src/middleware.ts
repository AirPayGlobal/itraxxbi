import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: { signIn: "/login" },
});

export const config = {
  matcher: [
    "/((?!login|register|forgot-password|reset-password|api/auth|_next|favicon\\.ico|logo\\.svg).*)",
  ],
};
