"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { ProjectRow, ProjectStatus } from "@/lib/supabase/database.types";

const supabase = createClient();
const KEY = ["projects"] as const;

export type Project = ProjectRow;

export type ProjectInput = {
  name: string;
  description?: string | null;
  status?: ProjectStatus;
  start_date?: string | null;
  end_date?: string | null;
};

export function useProjects() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<Project[]> => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ProjectInput): Promise<Project> => {
      const { data, error } = await supabase
        .from("projects")
        .insert({ ...input, status: input.status ?? "ACTIVE" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("Project created");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to create project"),
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...patch
    }: Partial<ProjectInput> & { id: string }): Promise<Project> => {
      const { data, error } = await supabase
        .from("projects")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("Project updated");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to update project"),
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("Project deleted");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to delete project"),
  });
}
