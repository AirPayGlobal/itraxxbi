import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

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
    <html lang="en">
      <body className="font-sans antialiased">
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
      </body>
    </html>
  );
}
