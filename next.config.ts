import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Accounts are invite-only now; send old sign-up links to the login page.
  async redirects() {
    return [{ source: "/register", destination: "/login", permanent: true }];
  },
};

export default nextConfig;
