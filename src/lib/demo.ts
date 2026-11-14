// Demo site switches (set only on the separate demo deployment, never on the live app).
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "1";

/** Shown on the demo sign-in page so prospects can log straight in. Set on the demo deployment only. */
export const DEMO_LOGINS = DEMO_MODE
  ? [
      { label: "Staff view (read-only)", email: process.env.NEXT_PUBLIC_DEMO_EMAIL || "demo@sinapsedi.com" },
      { label: "Client portal", email: process.env.NEXT_PUBLIC_DEMO_CLIENT_EMAIL || "demo.client@sinapsedi.com" },
    ]
  : [];
export const DEMO_PASSWORD = DEMO_MODE ? process.env.NEXT_PUBLIC_DEMO_PASSWORD || "" : "";
