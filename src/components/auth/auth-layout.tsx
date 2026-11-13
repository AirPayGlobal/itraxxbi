"use client";

import Link from "next/link";

interface AuthLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

function SignalArcs({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 400" fill="none" aria-hidden="true" className={className}>
      <defs>
        <linearGradient id="auth-arcs" x1="0" y1="400" x2="400" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--color-brand-700)" />
          <stop offset="1" stopColor="var(--color-brand-300)" />
        </linearGradient>
      </defs>
      <g stroke="url(#auth-arcs)" strokeLinecap="round">
        <path d="M0 300a100 100 0 0 1 100 100" strokeWidth="22" />
        <path d="M0 200a200 200 0 0 1 200 200" strokeWidth="22" />
        <path d="M0 100a300 300 0 0 1 300 300" strokeWidth="22" />
        <path d="M0 0a400 400 0 0 1 400 400" strokeWidth="22" />
      </g>
    </svg>
  );
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen">
      {/* Left panel - branding */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-ink-900 p-12 lg:flex">
        <SignalArcs className="pointer-events-none absolute -right-24 -top-24 h-[520px] w-[520px] rotate-90 opacity-[0.14]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-signal" />

        <Link href="/sign-in" className="relative flex items-center">
          <img src="/brand/itrackerx-logo-on-dark.png" alt="iTrackerX — Fleet Data Intelligence" className="h-14 w-auto" />
        </Link>
        <div className="relative max-w-md">
          <p className="eyebrow text-brand-300">Fleet Data Intelligence</p>
          <h2 className="mt-4 text-3xl font-bold leading-tight text-white">
            Every vehicle, job and customer in one view.
          </h2>
          <p className="mt-3 text-base text-slate-400">
            Business intelligence for vehicle tracking and fleet management operations.
          </p>
        </div>
        <p className="relative text-xs text-slate-500">
          &copy; {new Date().getFullYear()} iTrackerX. All rights reserved.
        </p>
      </div>

      {/* Right panel - form */}
      <div className="flex w-full flex-col items-center justify-center bg-slate-50 px-6 lg:w-1/2">
        <div className="flex w-full max-w-md flex-col items-center lg:items-stretch">
          {/* Mobile logo */}
          <div className="mb-8 flex justify-center lg:hidden">
            <img src="/brand/itrackerx-logo.png" alt="iTrackerX — Fleet Data Intelligence" className="h-12 w-auto" />
          </div>

          {title && (
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-ink-800">{title}</h1>
              {subtitle && <p className="mt-2 text-sm text-slate-500">{subtitle}</p>}
            </div>
          )}

          {children}
        </div>
      </div>
    </div>
  );
}
