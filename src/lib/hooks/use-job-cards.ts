"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type {
  JobCardRow,
  JobStatus,
  JobType,
  Priority,
} from "@/lib/supabase/database.types";

const supabase = createClient();
const KEY = ["job_cards"] as const;

export type JobCard = JobCardRow;

export type JobCardInput = {
  title: string;
  description?: string | null;
  status?: JobStatus;
  priority?: Priority;
  job_type?: JobType;
  scheduled_date?: string | null;
  estimated_hours?: number | null;
  actual_hours?: number | null;
  notes?: string | null;
  location?: string | null;
  technician_id?: string | null;
  customer_id?: string | null;
  vehicle_id?: string | null;
};

async function currentUserId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in.");
  return user.id;
}

function jobNumber(): string {
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `JC-${stamp}-${rand}`;
}

export function useJobCards() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<JobCard[]> => {
      const { data, error } = await supabase
        .from("job_cards")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateJobCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: JobCardInput): Promise<JobCard> => {
      const created_by_id = await currentUserId();
      const { data, error } = await supabase
        .from("job_cards")
        .insert({
          ...input,
          job_number: jobNumber(),
          status: input.status ?? "OPEN",
          priority: input.priority ?? "MEDIUM",
          job_type: input.job_type ?? "INSTALLATION",
          created_by_id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("Job card created");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to create job card"),
  });
}

export function useUpdateJobCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...patch
    }: Partial<JobCardInput> & {
      id: string;
      started_at?: string | null;
      completed_at?: string | null;
    }): Promise<JobCard> => {
      const { data, error } = await supabase
        .from("job_cards")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("Job card updated");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to update job card"),
  });
}

export function useDeleteJobCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from("job_cards").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("Job card deleted");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to delete job card"),
  });
}
