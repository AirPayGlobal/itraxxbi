"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { ExpenseRow, ExpenseCategory } from "@/lib/supabase/database.types";

const supabase = createClient();
const KEY = ["expenses"] as const;

export type Expense = ExpenseRow;

export type ExpenseInput = {
  description: string;
  amount: number;
  category: ExpenseCategory;
  date: string;
  vendor?: string | null;
  notes?: string | null;
  approved?: boolean;
};

export function useExpenses() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<Expense[]> => {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .order("date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ExpenseInput): Promise<Expense> => {
      const { data, error } = await supabase
        .from("expenses")
        .insert({ ...input, approved: input.approved ?? false })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("Expense recorded");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to record expense"),
  });
}

export function useSetExpenseApproved() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      approved,
    }: {
      id: string;
      approved: boolean;
    }): Promise<Expense> => {
      const { data, error } = await supabase
        .from("expenses")
        .update({ approved })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success(vars.approved ? "Expense approved" : "Approval revoked");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to update expense"),
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("Expense deleted");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to delete expense"),
  });
}
