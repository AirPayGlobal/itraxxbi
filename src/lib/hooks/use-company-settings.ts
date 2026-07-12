"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { CompanySettingsRow } from "@/lib/supabase/database.types";

const supabase = createClient();
const KEY = ["company_settings"] as const;
const ROW_ID = "default";

export type CompanySettings = CompanySettingsRow;
export type CompanySettingsInput = Partial<
  Omit<CompanySettingsRow, "id" | "updated_at">
>;

export function useCompanySettings() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<CompanySettings | null> => {
      const { data, error } = await supabase
        .from("company_settings")
        .select("*")
        .eq("id", ROW_ID)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useSaveCompanySettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CompanySettingsInput): Promise<CompanySettings> => {
      const { data, error } = await supabase
        .from("company_settings")
        .upsert({ id: ROW_ID, ...input })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("Company profile saved");
    },
    onError: (e: Error) =>
      toast.error(e.message || "Failed to save company profile"),
  });
}
