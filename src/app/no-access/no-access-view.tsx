"use client";

import { useClerk } from "@clerk/nextjs";
import { ShieldAlert } from "lucide-react";
import { AuthLayout } from "@/components/auth/auth-layout";
import type { AccessDiagnosis } from "@/lib/link-profile";

const explain: Record<Exclude<AccessDiagnosis["reason"], "ok">, { title: string; body: string }> = {
  "not-invited": {
    title: "This email hasn't been invited",
    body: "Access is by invitation only. Ask an administrator to invite the email address below, or sign in with the address you were invited with.",
  },
  deactivated: {
    title: "Your access has been turned off",
    body: "An administrator has deactivated this account. Ask them to turn it back on.",
  },
  "unverified-email": {
    title: "Your email isn't verified",
    body: "Sign out and sign in again to verify your email address, then reload this page.",
  },
  "not-configured": {
    title: "The server isn't fully set up",
    body: "The app can't check invitations yet. An administrator needs to add the Supabase secret key to the hosting environment.",
  },
  "database-error": {
    title: "The app couldn't check your access",
    body: "Something went wrong talking to the database. Send the details below to your administrator.",
  },
};

export function NoAccessView({ diagnosis }: { diagnosis: AccessDiagnosis }) {
  const { signOut } = useClerk();
  const info = explain[diagnosis.reason as keyof typeof explain] ?? explain["database-error"];

  return (
    <AuthLayout title="No access yet" subtitle={info.title}>
      <div className="w-full rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
        <ShieldAlert className="mx-auto mb-3 h-12 w-12 text-amber-500" />
        <p className="text-sm text-amber-800">{info.body}</p>
      </div>

      <dl className="mt-4 w-full space-y-1.5 rounded-lg border border-slate-200 bg-white p-4 text-xs text-slate-600">
        <div className="flex gap-2">
          <dt className="w-24 flex-shrink-0 text-slate-400">Signed in as</dt>
          <dd className="min-w-0 break-all">
            {diagnosis.emails.length === 0
              ? "—"
              : diagnosis.emails.map((e) => (
                  <span key={e.address} className="block">
                    {e.address}
                    {!e.verified && <span className="text-amber-600"> (unverified)</span>}
                  </span>
                ))}
          </dd>
        </div>
        {diagnosis.detail && (
          <div className="flex gap-2">
            <dt className="w-24 flex-shrink-0 text-slate-400">Details</dt>
            <dd className="min-w-0 break-words">{diagnosis.detail}</dd>
          </div>
        )}
        {diagnosis.project && (
          <div className="flex gap-2">
            <dt className="w-24 flex-shrink-0 text-slate-400">Database</dt>
            <dd className="font-mono">{diagnosis.project}</dd>
          </div>
        )}
      </dl>

      <div className="mt-6 flex w-full gap-3">
        <button
          onClick={() => window.location.reload()}
          className="flex-1 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700"
        >
          Try again
        </button>
        <button
          onClick={() => signOut({ redirectUrl: "/sign-in" })}
          className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
        >
          Use another account
        </button>
      </div>
    </AuthLayout>
  );
}
