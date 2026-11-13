import type { Metadata } from "next";
import localFont from "next/font/local";
import { Toaster } from "sonner";
import { ClerkProvider } from "@clerk/nextjs";
import AuthSessionProvider from "@/components/providers/session-provider";
import QueryProvider from "@/components/providers/query-provider";
import "./globals.css";

// Self-hosted from npm so builds don't depend on reaching Google Fonts.
const inter = localFont({
  src: "../../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2",
  weight: "100 900",
  variable: "--font-inter",
  display: "swap",
});
const montserrat = localFont({
  src: [
    { path: "../../node_modules/@fontsource/montserrat/files/montserrat-latin-600-normal.woff2", weight: "600" },
    { path: "../../node_modules/@fontsource/montserrat/files/montserrat-latin-700-normal.woff2", weight: "700" },
  ],
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata: Metadata = {
  title: "iTraxx BI - Business Intelligence Platform",
  description:
    "iTraxx BI Platform - Comprehensive business intelligence for task management, job tracking, HR, finance, and more.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${montserrat.variable}`}>
      <body className="font-sans antialiased">
        <ClerkProvider
          signInUrl="/sign-in"
          signUpUrl="/sign-up"
          signInFallbackRedirectUrl="/"
          signUpFallbackRedirectUrl="/"
          afterSignOutUrl="/sign-in"
          appearance={{
            variables: {
              colorPrimary: "#1676c4",
              colorForeground: "#23272e",
              colorBackground: "#ffffff",
              colorBorder: "#e2e8f0",
              fontFamily: "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
              borderRadius: "0.5rem",
            },
            // Email and password only: no Google or other social sign-in buttons anywhere.
            elements: { socialButtonsRoot: "hidden", socialButtons: "hidden", dividerRow: "hidden" },
          }}
        >
        <AuthSessionProvider>
        <QueryProvider>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            classNames: {
              toast:
                "rounded-lg border border-slate-200 bg-white shadow-lg text-slate-900 text-sm",
              title: "font-semibold",
              description: "text-slate-500",
              success: "border-l-4 border-l-emerald-500",
              error: "border-l-4 border-l-red-500",
              warning: "border-l-4 border-l-amber-500",
              info: "border-l-4 border-l-blue-500",
            },
          }}
          richColors
        />
        </QueryProvider>
        </AuthSessionProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
