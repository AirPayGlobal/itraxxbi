"use client";

import Link from "next/link";

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen">
      {/* Left panel - branding */}
      <div className="hidden w-1/2 flex-col justify-between bg-slate-900 p-12 lg:flex">
        <Link href="/login" className="flex items-center">
          <img src="/logo.svg" alt="iTrackerX" className="h-10 w-auto brightness-0 invert" />
        </Link>
        <div>
          <h2 className="text-3xl font-bold text-white">
            Fleet Data Intelligence
          </h2>
          <p className="mt-3 text-base text-slate-400">
            Comprehensive business intelligence for vehicle tracking and fleet
            management operations.
          </p>
        </div>
        <p className="text-xs text-slate-500">
          &copy; {new Date().getFullYear()} iTrackerX. All rights reserved.
        </p>
      </div>

      {/* Right panel - form */}
      <div className="flex w-full flex-col items-center justify-center bg-slate-50 px-6 lg:w-1/2">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="mb-8 flex justify-center lg:hidden">
            <img src="/logo.svg" alt="iTrackerX" className="h-10 w-auto" />
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
            <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
