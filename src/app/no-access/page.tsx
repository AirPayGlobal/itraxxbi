"use client";

import { useClerk } from "@clerk/nextjs";
import { ShieldAlert } from "lucide-react";
import { AuthLayout } from "@/components/auth/auth-layout";

export default function NoAccessPage() {
  const { signOut: clerkSignOut } = useClerk();

  async function signOut() {
    await clerkSignOut({ redirectUrl: "/sign-in" });
  }

  return (
    <AuthLayout title="No access yet" subtitle="Your account isn't active in this workspace">
      <div className="w-full rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
        <ShieldAlert className="mx-auto mb-3 h-12 w-12 text-amber-500" />
        <p className="text-sm text-amber-800">
          Access is by invitation only. Ask an administrator to invite the email address you signed in with, or to
          reactivate your account.
        </p>
      </div>
      <button
        onClick={signOut}
        className="mt-6 w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
      >
        Sign in with a different account
      </button>
    </AuthLayout>
  );
}
