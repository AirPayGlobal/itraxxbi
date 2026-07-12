"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { createNotification } from "@/lib/hooks/use-notifications";
import type { VehicleInspectionRow } from "@/lib/supabase/database.types";

const supabase = createClient();
const KEY = ["vehicle_inspections"] as const;

export type VehicleInspection = VehicleInspectionRow;

// Everything the technician can fill in (id/timestamps/creator are set by us).
export type VehicleInspectionInput = Partial<
  Omit<VehicleInspectionRow, "id" | "created_at" | "updated_at" | "created_by_id">
>;

async function currentUserId(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

// Recipients for a submitted checklist: users whose job title is Office
// Administrator; if none are on file, fall back to ADMIN accounts.
async function officeAdministratorIds(): Promise<string[]> {
  const { data: admins } = await supabase
    .from("profiles")
    .select("id")
    .ilike("job_title", "%office admin%");
  if (admins && admins.length > 0) return admins.map((a) => a.id);

  const { data: fallback } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "ADMIN");
  return (fallback ?? []).map((a) => a.id);
}

export function useInspections() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<VehicleInspection[]> => {
      const { data, error } = await supabase
        .from("vehicle_inspections")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateInspection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: VehicleInspectionInput
    ): Promise<VehicleInspection> => {
      const created_by_id = await currentUserId();
      const { data, error } = await supabase
        .from("vehicle_inspections")
        .insert({
          condition_checks: {},
          extras: {},
          anti_theft: {},
          accessories: {},
          signed_pre_check: false,
          signed_post_check: false,
          status: "SUBMITTED",
          ...input,
          created_by_id,
        })
        .select()
        .single();
      if (error) throw error;

      // Submit: notify the Office Administrator(s) that a checklist is in.
      const recipients = await officeAdministratorIds();
      const label = data.reg_number || data.client_name || "a vehicle";
      const by = data.technician_name ? ` by ${data.technician_name}` : "";
      await Promise.all(
        recipients.map((userId) =>
          createNotification({
            userId,
            title: "Vehicle inspection submitted",
            message: `Inspection checklist for ${label}${by} is ready for review.`,
            type: "JOB",
            link: "/inspections",
          })
        )
      );

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("Checklist submitted to the Office Administrator");
    },
    onError: (e: Error) =>
      toast.error(e.message || "Failed to submit inspection"),
  });
}

// Office Administrator approves a submitted checklist. Delegates to a
// server route that emails the report to the client (keeping the email API
// key server-side) and records the dispatch.
export function useApproveInspection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      inspection,
      clientEmail,
    }: {
      inspection: VehicleInspection;
      clientEmail?: string;
    }): Promise<{ email: string }> => {
      const res = await fetch("/api/inspections/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inspectionId: inspection.id, clientEmail }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload.error || "Failed to send inspection");
      }
      return { email: payload.email };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success(`Approved and emailed to ${data.email}`);
    },
    onError: (e: Error) =>
      toast.error(e.message || "Failed to approve inspection"),
  });
}

export function useRejectInspection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      inspection,
      note,
    }: {
      inspection: VehicleInspection;
      note?: string;
    }): Promise<VehicleInspection> => {
      const reviewer = await currentUserId();
      const { data, error } = await supabase
        .from("vehicle_inspections")
        .update({
          status: "REJECTED",
          approved_by_id: reviewer,
          approved_at: new Date().toISOString(),
          review_note: note ?? null,
        })
        .eq("id", inspection.id)
        .select()
        .single();
      if (error) throw error;

      if (data.created_by_id) {
        await createNotification({
          userId: data.created_by_id,
          title: "Inspection returned for changes",
          message: `Your inspection for ${
            data.reg_number || data.client_name || "a vehicle"
          } was rejected${note ? `: ${note}` : "."}`,
          type: "WARNING",
          link: "/inspections",
        });
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("Inspection returned to the technician");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to reject"),
  });
}

export function useDeleteInspection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from("vehicle_inspections")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("Inspection deleted");
    },
    onError: (e: Error) =>
      toast.error(e.message || "Failed to delete inspection"),
  });
}
