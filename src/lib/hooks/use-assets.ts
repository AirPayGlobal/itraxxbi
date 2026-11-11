"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type {
  AssetRow,
  AssetCategory,
  AssetStatus,
} from "@/lib/supabase/database.types";

const supabase = createClient();
const KEY = ["assets"] as const;

export type Asset = AssetRow;

export type AssetInput = {
  name: string;
  asset_number: string;
  serial_number?: string | null;
  category: AssetCategory;
  status?: AssetStatus;
  purchase_date?: string | null;
  purchase_price?: number | null;
  current_value?: number | null;
  depreciation_rate?: number | null;
  location?: string | null;
  barcode?: string | null;
  quantity?: number;
  min_stock_level?: number | null;
  notes?: string | null;
};

export function useAssets() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<Asset[]> => {
      const { data, error } = await supabase
        .from("assets")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: AssetInput): Promise<Asset> => {
      const { data, error } = await supabase
        .from("assets")
        .insert({
          ...input,
          status: input.status ?? "AVAILABLE",
          quantity: input.quantity ?? 1,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("Asset added");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to add asset"),
  });
}

export function useUpdateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...patch
    }: Partial<AssetInput> & { id: string }): Promise<Asset> => {
      const { data, error } = await supabase
        .from("assets")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("Asset updated");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to update asset"),
  });
}

export function useDeleteAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from("assets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("Asset deleted");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to delete asset"),
  });
}
