"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
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
          ...input,
          created_by_id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("Inspection saved");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to save inspection"),
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
