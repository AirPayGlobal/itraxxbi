"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/providers/session-provider";
import type {
  CustomerRow,
  InvoiceItemRow,
  InvoiceRow,
  JobCardRow,
  PaymentRow,
  TicketCategory,
  TicketCommentRow,
  TicketPriority,
  TicketRow,
  VehicleInspectionRow,
  VehicleRow,
} from "@/lib/supabase/database.types";

// Client portal data. Row-level security limits every query to the signed-in client's own company
// (approved inspections only, no draft invoices, no internal ticket notes), so no filters are needed here.
const supabase = createClient();

function useList<T>(key: string, table: string, order: string) {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["portal", key],
    enabled: !!profile?.customer_id,
    queryFn: async (): Promise<T[]> => {
      const { data, error } = await supabase.from(table as "vehicles").select("*").order(order, { ascending: false });
      if (error) throw error;
      return (data ?? []) as T[];
    },
  });
}

export function usePortalCompany() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["portal", "company", profile?.customer_id],
    enabled: !!profile?.customer_id,
    queryFn: async (): Promise<CustomerRow | null> => {
      const { data, error } = await supabase.from("customers").select("*").eq("id", profile!.customer_id!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export const usePortalVehicles = () => useList<VehicleRow>("vehicles", "vehicles", "registration_number");
export const usePortalJobCards = () => useList<JobCardRow>("job_cards", "job_cards", "created_at");
export const usePortalInspections = () => useList<VehicleInspectionRow>("inspections", "vehicle_inspections", "created_at");
export const usePortalInvoices = () => useList<InvoiceRow>("invoices", "invoices", "created_at");
export const usePortalTickets = () => useList<TicketRow>("tickets", "tickets", "created_at");

export function usePortalInvoiceDetail(invoiceId: string | null) {
  return useQuery({
    queryKey: ["portal", "invoice", invoiceId],
    enabled: !!invoiceId,
    queryFn: async (): Promise<{ items: InvoiceItemRow[]; payments: PaymentRow[] }> => {
      const [items, payments] = await Promise.all([
        supabase.from("invoice_items").select("*").eq("invoice_id", invoiceId!),
        supabase.from("payments").select("*").eq("invoice_id", invoiceId!).order("paid_at"),
      ]);
      if (items.error) throw items.error;
      if (payments.error) throw payments.error;
      return { items: items.data ?? [], payments: payments.data ?? [] };
    },
  });
}

export function usePortalTicketComments(ticketId: string | null) {
  return useQuery({
    queryKey: ["portal", "ticket", ticketId, "comments"],
    enabled: !!ticketId,
    queryFn: async (): Promise<TicketCommentRow[]> => {
      const { data, error } = await supabase
        .from("ticket_comments")
        .select("*")
        .eq("ticket_id", ticketId!)
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export type PortalTicketInput = {
  subject: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
};

function ticketNumber(): string {
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `TKT-${new Date().getFullYear()}-${rand}`;
}

export function useOpenPortalTicket() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  const { data: company } = usePortalCompany();
  return useMutation({
    mutationFn: async (input: PortalTicketInput) => {
      if (!profile?.customer_id) throw new Error("Your account isn't linked to a customer.");
      const { data, error } = await supabase
        .from("tickets")
        .insert({
          ...input,
          status: "OPEN",
          ticket_number: ticketNumber(),
          customer_id: profile.customer_id,
          customer_name: profile.name,
          company: company?.company || company?.name || null,
          email: profile.email,
          created_by_id: profile.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (t) => {
      qc.invalidateQueries({ queryKey: ["portal", "tickets"] });
      toast.success(`Ticket ${t.ticket_number} opened. Our team will be in touch.`);
    },
    onError: (err: Error) => toast.error(`Couldn't open the ticket: ${err.message}`),
  });
}

export function useReplyToPortalTicket(ticketId: string) {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (content: string) => {
      if (!profile) throw new Error("Not signed in.");
      const { error } = await supabase.from("ticket_comments").insert({
        ticket_id: ticketId,
        author_id: profile.id,
        author_name: profile.name,
        content,
        is_internal: false,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portal", "ticket", ticketId, "comments"] }),
    onError: (err: Error) => toast.error(`Couldn't send your reply: ${err.message}`),
  });
}
