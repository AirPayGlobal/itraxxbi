"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useClerk, useUser } from "@clerk/nextjs";
import { createClient } from "@/lib/supabase/client";

export type Profile = {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "MANAGER" | "TECHNICIAN" | "STAFF" | "VIEWER";
  phone: string | null;
  avatar: string | null;
  department: string | null;
  job_title: string | null;
  is_active: boolean;
};

type AuthContextValue = {
  /** `id` is the app profile id (what foreign keys use), not the Clerk user id. */
  user: { id: string; email: string } | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export default function AuthSessionProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded, user: clerkUser } = useUser();
  const clerk = useClerk();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!clerkUser) {
      setProfile(null);
      setProfileLoaded(true);
      return;
    }
    const { data } = await createClient()
      .from("profiles")
      .select("id, email, name, role, phone, avatar, department, job_title, is_active")
      .eq("clerk_user_id", clerkUser.id)
      .maybeSingle();
    setProfile((data as Profile | null) ?? null);
    setProfileLoaded(true);
  }, [clerkUser]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load once Clerk knows who is signed in
    if (isLoaded) loadProfile();
  }, [isLoaded, loadProfile]);

  const value: AuthContextValue = {
    user: profile ? { id: profile.id, email: clerkUser?.primaryEmailAddress?.emailAddress ?? profile.email } : null,
    profile,
    loading: !isLoaded || !profileLoaded,
    signOut: async () => {
      await clerk.signOut({ redirectUrl: "/sign-in" });
    },
    refresh: loadProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthSessionProvider");
  return ctx;
}
