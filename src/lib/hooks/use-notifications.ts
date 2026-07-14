"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type {
  NotificationRow,
  NotificationType,
} from "@/lib/supabase/database.types";

const supabase = createClient();
const KEY = ["notifications"] as const;

export type Notification = NotificationRow;

export function useNotifications() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<Notification[]> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 60_000,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<void> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

// Producer helper for other features (e.g. "leave request submitted").
// Inserts a notification row for the target user.
export async function createNotification(input: {
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
  link?: string | null;
}): Promise<void> {
  await supabase.from("notifications").insert({
    user_id: input.userId,
    title: input.title,
    message: input.message,
    type: input.type ?? "INFO",
    channel: "APP",
    is_read: false,
    link: input.link ?? null,
  });
}
