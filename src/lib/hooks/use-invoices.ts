"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type {
  InvoiceRow,
  InvoiceItemRow,
  InvoiceStatus,
} from "@/lib/supabase/database.types";

const supabase = createClient();
const KEY = ["invoices"] as const;
const itemsKey = (invoiceId: string) => ["invoices", invoiceId, "items"] as const;

export type Invoice = InvoiceRow;
export type InvoiceItem = InvoiceItemRow;

export type InvoiceItemInput = {
  description: string;
  quantity: number;
  unit_price: number;
};

export type InvoiceInput = {
  customer_id: string;
  job_card_id?: string | null;
  tax_rate?: number; // percent, e.g. 15 for 15%
  status?: InvoiceStatus;
  issued_date?: string | null;
  due_date?: string | null;
  notes?: string | null;
  items: InvoiceItemInput[];
};

function invoiceNumber(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `INV-${year}-${rand}`;
}

export function useInvoices() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<Invoice[]> => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useInvoiceItems(invoiceId: string | null) {
  return useQuery({
    queryKey: invoiceId ? itemsKey(invoiceId) : ["invoices", "none", "items"],
    enabled: !!invoiceId,
    queryFn: async (): Promise<InvoiceItem[]> => {
      const { data, error } = await supabase
        .from("invoice_items")
        .select("*")
        .eq("invoice_id", invoiceId!);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: InvoiceInput): Promise<Invoice> => {
      const lineItems = input.items.filter((i) => i.description.trim());
      if (lineItems.length === 0) {
        throw new Error("Add at least one line item.");
      }
      const subtotal = lineItems.reduce(
        (sum, i) => sum + i.quantity * i.unit_price,
        0
      );
      const tax = subtotal * ((input.tax_rate ?? 0) / 100);
      const total = subtotal + tax;

      const { data: invoice, error } = await supabase
        .from("invoices")
        .insert({
          invoice_number: invoiceNumber(),
          customer_id: input.customer_id,
          job_card_id: input.job_card_id ?? null,
          subtotal,
          tax,
          total,
          status: input.status ?? "DRAFT",
          issued_date: input.issued_date ?? null,
          due_date: input.due_date ?? null,
          notes: input.notes ?? null,
        })
        .select()
        .single();
      if (error) throw error;

      const { error: itemsError } = await supabase.from("invoice_items").insert(
        lineItems.map((i) => ({
          invoice_id: invoice.id,
          description: i.description,
          quantity: i.quantity,
          unit_price: i.unit_price,
          total: i.quantity * i.unit_price,
        }))
      );
      if (itemsError) throw itemsError;

      return invoice;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("Invoice created");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to create invoice"),
  });
}

export function useUpdateInvoiceStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: InvoiceStatus;
    }): Promise<Invoice> => {
      const patch: Partial<InvoiceRow> = { status };
      if (status === "PAID") patch.paid_date = new Date().toISOString();
      if (status === "SENT") patch.issued_date = new Date().toISOString();
      const { data, error } = await supabase
        .from("invoices")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("Invoice updated");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to update invoice"),
  });
}

export function useDeleteInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from("invoices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("Invoice deleted");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to delete invoice"),
  });
}
