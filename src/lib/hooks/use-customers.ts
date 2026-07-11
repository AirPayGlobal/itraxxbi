"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { CustomerRow, CustomerStatus } from "@/lib/supabase/database.types";

const supabase = createClient();
const KEY = ["customers"] as const;

export type Customer = CustomerRow;

export type CustomerInput = {
  name: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  account_number?: string | null;
  status?: CustomerStatus;
  notes?: string | null;
  contract_start?: string | null;
  contract_end?: string | null;
};

export function useCustomers() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<Customer[]> => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CustomerInput): Promise<Customer> => {
      const { data, error } = await supabase
        .from("customers")
        .insert({
          ...input,
          status: input.status ?? "ACTIVE",
          country: input.country ?? "Namibia",
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("Customer created");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to create customer"),
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...patch
    }: Partial<CustomerInput> & { id: string }): Promise<Customer> => {
      const { data, error } = await supabase
        .from("customers")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("Customer updated");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to update customer"),
  });
}

export function useDeleteCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from("customers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("Customer deleted");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to delete customer"),
  });
}
