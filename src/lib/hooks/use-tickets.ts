"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type {
  TicketRow,
  TicketCommentRow,
  TicketStatus,
  TicketPriority,
  TicketCategory,
} from "@/lib/supabase/database.types";

const supabase = createClient();
const KEY = ["tickets"] as const;
const commentsKey = (ticketId: string) => ["tickets", ticketId, "comments"] as const;

export type Ticket = TicketRow;
export type TicketComment = TicketCommentRow;

export type TicketInput = {
  subject: string;
  description: string;
  customer_name: string;
  company?: string | null;
  email?: string | null;
  priority?: TicketPriority;
  category?: TicketCategory;
  status?: TicketStatus;
  customer_id?: string | null;
  assigned_to_id?: string | null;
};

function ticketNumber(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `TKT-${year}-${rand}`;
}

async function currentUser(): Promise<{ id: string; name: string } | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("id, name")
    .eq("id", user.id)
    .single();
  return data ?? { id: user.id, name: user.email ?? "User" };
}

export function useTickets() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<Ticket[]> => {
      const { data, error } = await supabase
        .from("tickets")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useTicketComments(ticketId: string | null) {
  return useQuery({
    queryKey: ticketId ? commentsKey(ticketId) : ["tickets", "none", "comments"],
    enabled: !!ticketId,
    queryFn: async (): Promise<TicketComment[]> => {
      const { data, error } = await supabase
        .from("ticket_comments")
        .select("*")
        .eq("ticket_id", ticketId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TicketInput): Promise<Ticket> => {
      const user = await currentUser();
      const { data, error } = await supabase
        .from("tickets")
        .insert({
          ...input,
          ticket_number: ticketNumber(),
          status: input.status ?? "OPEN",
          priority: input.priority ?? "MEDIUM",
          category: input.category ?? "GENERAL",
          created_by_id: user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("Ticket created");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to create ticket"),
  });
}

export function useUpdateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...patch
    }: Partial<TicketInput> & {
      id: string;
      resolved_at?: string | null;
    }): Promise<Ticket> => {
      const { data, error } = await supabase
        .from("tickets")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to update ticket"),
  });
}

export function useAddTicketComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      ticketId,
      content,
      isInternal = false,
    }: {
      ticketId: string;
      content: string;
      isInternal?: boolean;
    }): Promise<TicketComment> => {
      const user = await currentUser();
      const { data, error } = await supabase
        .from("ticket_comments")
        .insert({
          ticket_id: ticketId,
          content,
          is_internal: isInternal,
          author_id: user?.id ?? null,
          author_name: user?.name ?? "Support Agent",
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: commentsKey(vars.ticketId) });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to add comment"),
  });
}

export function useDeleteTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from("tickets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("Ticket deleted");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to delete ticket"),
  });
}
