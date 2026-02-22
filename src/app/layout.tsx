import type { Metadata } from "next";
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
      </body>
    </html>
  );
}
