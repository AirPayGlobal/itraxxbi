"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type {
  CustomerOnboardingRow,
  CustomerRow,
  OnboardingStage,
  OnboardingStatus,
} from "@/lib/supabase/database.types";

const supabase = createClient();
const KEY = ["customer-onboarding"] as const;

export const ONBOARDING_STAGES: OnboardingStage[] = [
  "INQUIRY",
  "PROPOSAL",
  "CONTRACT",
  "INSTALLATION",
  "CONFIGURATION",
  "TRAINING",
  "GO_LIVE",
];

export type ChecklistEntry = { done: boolean; at: string | null };
export type Checklist = Partial<Record<OnboardingStage, ChecklistEntry>>;

export type OnboardingCustomer = Pick<CustomerRow, "id" | "name" | "company" | "email" | "phone">;

export type Onboarding = Omit<CustomerOnboardingRow, "checklist"> & {
  checklist: Checklist;
  customer: OnboardingCustomer | null;
};

export type OnboardingInput = {
  customer_id: string;
  assigned_to_id?: string | null;
  vehicle_count?: number | null;
  package?: string | null;
  target_date?: string | null;
  notes?: string | null;
};

export function parseChecklist(raw: unknown): Checklist {
  const out: Checklist = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  const obj = raw as Record<string, unknown>;
  for (const stage of ONBOARDING_STAGES) {
    const v = obj[stage];
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const e = v as Record<string, unknown>;
      out[stage] = { done: e.done === true, at: typeof e.at === "string" ? e.at : null };
    }
  }
  return out;
}

export function isStageDone(checklist: Checklist, stage: OnboardingStage): boolean {
  return checklist[stage]?.done === true;
}

/** The first stage not yet ticked off, or GO_LIVE when everything is done. */
export function currentStageFor(checklist: Checklist): OnboardingStage {
  return ONBOARDING_STAGES.find((s) => !isStageDone(checklist, s)) ?? "GO_LIVE";
}

export function completedStageCount(checklist: Checklist): number {
  return ONBOARDING_STAGES.filter((s) => isStageDone(checklist, s)).length;
}

export function useOnboardings() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<Onboarding[]> => {
      const { data, error } = await supabase
        .from("customer_onboarding")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = data ?? [];
      const ids = [...new Set(rows.map((r) => r.customer_id))];
      const customers = new Map<string, OnboardingCustomer>();
      if (ids.length > 0) {
        const { data: cust, error: custErr } = await supabase
          .from("customers")
          .select("id, name, company, email, phone")
          .in("id", ids);
        if (custErr) throw custErr;
        for (const c of (cust ?? []) as OnboardingCustomer[]) customers.set(c.id, c);
      }
      return rows.map((r) => ({
        ...r,
        checklist: parseChecklist(r.checklist),
        customer: customers.get(r.customer_id) ?? null,
      }));
    },
  });
}

export function useCreateOnboarding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: OnboardingInput): Promise<void> => {
      const { error } = await supabase.from("customer_onboarding").insert({
        ...input,
        stage: "INQUIRY",
        status: "IN_PROGRESS",
        checklist: {},
        started_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("Onboarding started");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to start onboarding"),
  });
}

export function useUpdateOnboarding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...patch
    }: Partial<Omit<OnboardingInput, "customer_id">> & {
      id: string;
      status?: OnboardingStatus;
      completed_at?: string | null;
    }): Promise<void> => {
      const { error } = await supabase.from("customer_onboarding").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("Onboarding updated");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to update onboarding"),
  });
}

/**
 * Ticks or unticks one checklist stage, then recomputes the current stage.
 * Completing GO_LIVE completes the onboarding; unticking it reopens a completed one.
 */
export function useToggleOnboardingStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      onboarding,
      stage,
      done,
    }: {
      onboarding: Onboarding;
      stage: OnboardingStage;
      done: boolean;
    }): Promise<{ completed: boolean }> => {
      const now = new Date().toISOString();
      const checklist: Checklist = { ...onboarding.checklist, [stage]: { done, at: done ? now : null } };
      const allDone = ONBOARDING_STAGES.every((s) => isStageDone(checklist, s));
      const goLiveDone = isStageDone(checklist, "GO_LIVE");
      const completed = allDone || (stage === "GO_LIVE" && goLiveDone);

      let status: OnboardingStatus = onboarding.status;
      let completed_at = onboarding.completed_at;
      if (completed) {
        status = "COMPLETED";
        completed_at = completed_at ?? now;
      } else if (onboarding.status === "COMPLETED") {
        status = "IN_PROGRESS";
        completed_at = null;
      }

      const { error } = await supabase
        .from("customer_onboarding")
        .update({
          checklist,
          stage: completed ? "GO_LIVE" : currentStageFor(checklist),
          status,
          completed_at,
        })
        .eq("id", onboarding.id);
      if (error) throw error;
      return { completed: completed && onboarding.status !== "COMPLETED" };
    },
    onSuccess: ({ completed }) => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success(completed ? "Onboarding completed: customer is live" : "Checklist updated");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to update checklist"),
  });
}

export function useDeleteOnboarding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from("customer_onboarding").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("Onboarding deleted");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to delete onboarding"),
  });
}
