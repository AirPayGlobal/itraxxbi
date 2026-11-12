"use client";

import { LogOut } from "lucide-react";
import { useAuth } from "@/components/providers/session-provider";
import { usePortalCompany } from "@/lib/hooks/use-portal";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const { profile, signOut } = useAuth();
  const { data: company } = usePortalCompany();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="relative border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
          <img src="/logo-wordmark.svg" alt="iTrackerX" className="h-8 w-auto" />
          <span className="hidden h-6 w-px bg-slate-200 sm:block" />
          <span className="hidden truncate text-sm font-medium text-slate-600 sm:block">
            {company ? company.company || company.name : "Client portal"}
          </span>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-right text-xs leading-tight text-slate-500 sm:block">
              <span className="block font-medium text-slate-800">{profile?.name}</span>
              {profile?.email}
            </span>
            <button
              onClick={signOut}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-50"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-0.5 bg-[image:var(--signal-gradient)]" />
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
