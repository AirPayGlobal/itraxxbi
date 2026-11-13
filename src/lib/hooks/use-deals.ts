"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { DealRow, DealStage, OnboardingStage, ProfileRow } from "@/lib/supabase/database.types";

const supabase = createClient();
const KEY = ["deals"] as const;
const STAFF_KEY = ["staff-profiles"] as const;

export type EscalationDept = "technical" | "finance" | "management";
export type EscalationStatus = "pending" | "in_review" | "approved" | "rejected";

export type Escalation = {
  id: string;
  dept: EscalationDept;
  reason: string;
  status: EscalationStatus;
  created_at: string;
  created_by: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  response_note: string | null;
};

/** A deal row with its `escalations` jsonb parsed into a typed array. */
export type Deal = Omit<DealRow, "escalations"> & { escalations: Escalation[] };

export type DealInput = {
  title: string;
  company: string;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  value?: number;
  fleet_size?: number | null;
  stage?: DealStage;
  probability?: number;
  owner_id?: string | null;
  expected_close?: string | null;
  source?: string | null;
  notes?: string | null;
};

export type StaffMember = Pick<ProfileRow, "id" | "name" | "email" | "role">;

const DEPTS: EscalationDept[] = ["technical", "finance", "management"];
const ESC_STATUSES: EscalationStatus[] = ["pending", "in_review", "approved", "rejected"];

/** Default win probability for each stage, applied when a deal is moved. */
export const STAGE_PROBABILITY: Record<DealStage, number> = {
  lead: 10,
  qualified: 30,
  proposal: 50,
  negotiation: 70,
  closed_won: 100,
  closed_lost: 0,
};

export function parseEscalations(raw: unknown): Escalation[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item): Escalation[] => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const e = item as Record<string, unknown>;
    const dept = DEPTS.includes(e.dept as EscalationDept) ? (e.dept as EscalationDept) : null;
    if (!dept || typeof e.id !== "string") return [];
    const str = (v: unknown) => (typeof v === "string" ? v : null);
    return [
      {
        id: e.id,
        dept,
        reason: str(e.reason) ?? "",
        status: ESC_STATUSES.includes(e.status as EscalationStatus) ? (e.status as EscalationStatus) : "pending",
        created_at: str(e.created_at) ?? new Date(0).toISOString(),
        created_by: str(e.created_by),
        resolved_at: str(e.resolved_at),
        resolved_by: str(e.resolved_by),
        response_note: str(e.response_note),
      },
    ];
  });
}

function toDeal(row: DealRow): Deal {
  return { ...row, value: Number(row.value ?? 0), escalations: parseEscalations(row.escalations) };
}

export function useDeals() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<Deal[]> => {
      const { data, error } = await supabase
        .from("deals")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(toDeal);
    },
  });
}

/** Active staff (everyone except CLIENT accounts), for owner and assignee pickers. */
export function useStaff() {
  return useQuery({
    queryKey: STAFF_KEY,
    queryFn: async (): Promise<StaffMember[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, email, role")
        .neq("role", "CLIENT")
        .eq("is_active", true)
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as StaffMember[];
    },
  });
}

export function useCreateDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: DealInput): Promise<Deal> => {
      const stage = input.stage ?? "lead";
      const { data, error } = await supabase
        .from("deals")
        .insert({
          ...input,
          stage,
          probability: input.probability ?? STAGE_PROBABILITY[stage],
          escalations: [],
          last_activity_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw error;
      return toDeal(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("Deal created");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to create deal"),
  });
}

export function useUpdateDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<DealInput> & { id: string }): Promise<Deal> => {
      const { data, error } = await supabase
        .from("deals")
        .update({ ...patch, last_activity_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return toDeal(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("Deal updated");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to update deal"),
  });
}

/** Moves a deal to another stage (optimistically, for drag and drop) and resets its probability. */
export function useMoveDealStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: DealStage }): Promise<Deal> => {
      const { data, error } = await supabase
        .from("deals")
        .update({ stage, probability: STAGE_PROBABILITY[stage], last_activity_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return toDeal(data);
    },
    onMutate: async ({ id, stage }) => {
      await qc.cancelQueries({ queryKey: KEY });
      const previous = qc.getQueryData<Deal[]>(KEY);
      qc.setQueryData<Deal[]>(KEY, (old) =>
        old?.map((d) =>
          d.id === id
            ? { ...d, stage, probability: STAGE_PROBABILITY[stage], last_activity_at: new Date().toISOString() }
            : d
        )
      );
      return { previous };
    },
    onError: (e: Error, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(KEY, ctx.previous);
      toast.error(e.message || "Failed to move deal");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from("deals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("Deal deleted");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to delete deal"),
  });
}

/** Re-reads the deal's escalations, applies `change` and writes them back. */
async function writeEscalations(dealId: string, change: (current: Escalation[]) => Escalation[]): Promise<void> {
  const { data, error } = await supabase.from("deals").select("escalations").eq("id", dealId).single();
  if (error) throw error;
  const next = change(parseEscalations(data.escalations));
  const { error: upErr } = await supabase
    .from("deals")
    .update({ escalations: next, last_activity_at: new Date().toISOString() })
    .eq("id", dealId);
  if (upErr) throw upErr;
}

export function useAddEscalation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      dealId,
      dept,
      reason,
      createdBy,
    }: {
      dealId: string;
      dept: EscalationDept;
      reason: string;
      createdBy: string | null;
    }) => {
      const esc: Escalation = {
        id: crypto.randomUUID(),
        dept,
        reason,
        status: "pending",
        created_at: new Date().toISOString(),
        created_by: createdBy,
        resolved_at: null,
        resolved_by: null,
        response_note: null,
      };
      await writeEscalations(dealId, (cur) => [...cur, esc]);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("Escalation submitted");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to escalate deal"),
  });
}

export function useUpdateEscalation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      dealId,
      escalationId,
      status,
      note,
      by,
    }: {
      dealId: string;
      escalationId: string;
      status: EscalationStatus;
      note?: string | null;
      by: string | null;
    }) => {
      const resolved = status === "approved" || status === "rejected";
      await writeEscalations(dealId, (cur) =>
        cur.map((e) =>
          e.id === escalationId
            ? {
                ...e,
                status,
                response_note: note?.trim() ? note.trim() : e.response_note,
                resolved_at: resolved ? new Date().toISOString() : null,
                resolved_by: resolved ? by : null,
              }
            : e
        )
      );
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success(vars.status === "in_review" ? "Escalation marked in review" : `Escalation ${vars.status}`);
    },
    onError: (e: Error) => toast.error(e.message || "Failed to update escalation"),
  });
}

const ONBOARDING_ORDER: OnboardingStage[] = [
  "INQUIRY",
  "PROPOSAL",
  "CONTRACT",
  "INSTALLATION",
  "CONFIGURATION",
  "TRAINING",
  "GO_LIVE",
];

/**
 * For a won deal with no linked customer: creates the customer from the deal's
 * company and contact details, starts an onboarding record for it, and links the deal.
 */
export function useConvertDealToCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (deal: Deal): Promise<{ customerId: string }> => {
      const { data: customer, error } = await supabase
        .from("customers")
        .insert({
          name: deal.company,
          company: deal.company,
          email: deal.contact_email,
          phone: deal.contact_phone,
          status: "ACTIVE",
          country: "Namibia",
          notes: deal.contact_name ? `Primary contact: ${deal.contact_name}` : null,
        })
        .select()
        .single();
      if (error) throw error;

      // A won deal has been through inquiry and proposal; onboarding picks up at the contract.
      const now = new Date().toISOString();
      const checklist: Record<string, { done: boolean; at: string }> = {};
      for (const s of ONBOARDING_ORDER.slice(0, 2)) checklist[s] = { done: true, at: now };
      const { error: onbErr } = await supabase.from("customer_onboarding").insert({
        customer_id: customer.id,
        stage: "CONTRACT",
        status: "IN_PROGRESS",
        assigned_to_id: deal.owner_id,
        vehicle_count: deal.fleet_size,
        checklist,
        notes: `Started from won deal "${deal.title}"`,
        started_at: now,
      });
      if (onbErr) throw onbErr;

      const { error: linkErr } = await supabase
        .from("deals")
        .update({ customer_id: customer.id, last_activity_at: now })
        .eq("id", deal.id);
      if (linkErr) throw linkErr;
      return { customerId: customer.id };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["customer-onboarding"] });
      toast.success("Customer created and onboarding started");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to create customer"),
  });
}
