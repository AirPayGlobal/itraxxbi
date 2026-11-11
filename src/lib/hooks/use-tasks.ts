"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type {
  TaskRow,
  TaskStatus,
  Priority,
  ProjectRow,
} from "@/lib/supabase/database.types";

const supabase = createClient();
const KEY = ["tasks"] as const;

export type Task = TaskRow;

export type TaskInput = {
  title: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: Priority;
  due_date?: string | null;
  start_date?: string | null;
  assignee_id?: string | null;
  project_id?: string | null;
};

async function currentUserId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in.");
  return user.id;
}

export function useTasks() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<Task[]> => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useProjectsLite() {
  return useQuery({
    queryKey: ["projects", "lite"],
    queryFn: async (): Promise<Pick<ProjectRow, "id" | "name">[]> => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TaskInput): Promise<Task> => {
      const created_by_id = await currentUserId();
      const { data, error } = await supabase
        .from("tasks")
        .insert({
          ...input,
          status: input.status ?? "TODO",
          priority: input.priority ?? "MEDIUM",
          is_recurring: false,
          created_by_id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("Task created");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to create task"),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...patch
    }: Partial<TaskInput> & { id: string; completed_at?: string | null }): Promise<Task> => {
      const { data, error } = await supabase
        .from("tasks")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("Task updated");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to update task"),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("Task deleted");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to delete task"),
  });
}
