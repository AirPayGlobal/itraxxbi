import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sign-in moved to Clerk; keep old links working.
  async redirects() {
    return [
      { source: "/login", destination: "/sign-in", permanent: true },
      { source: "/register", destination: "/sign-up", permanent: true },
      { source: "/forgot-password", destination: "/sign-in", permanent: true },
      { source: "/reset-password", destination: "/sign-in", permanent: true },
    ];
  },
};

export default nextConfig;
