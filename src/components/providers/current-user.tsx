"use client";

import { createContext, useContext } from "react";
import type { CurrentUser } from "@/lib/session";

const CurrentUserContext = createContext<CurrentUser | null>(null);

export function CurrentUserProvider({ user, children }: { user: CurrentUser; children: React.ReactNode }) {
  return <CurrentUserContext.Provider value={user}>{children}</CurrentUserContext.Provider>;
}

export function useCurrentUser(): CurrentUser | null {
  return useContext(CurrentUserContext);
}
