"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createClient, getSignedInProfile } from "@/lib/supabase/client";
import type { RecordFileArea, RecordFileRow } from "@/lib/supabase/database.types";

// Files attached to payslips, deals, payments and debtors reports. They live in the private "records"
// bucket at <area>/<entity id>/<file>; the database decides who may read or add them.
const supabase = createClient();
const BUCKET = "records";
const MAX_BYTES = 20 * 1024 * 1024;

export type RecordFile = RecordFileRow;
const key = (area: RecordFileArea, entityId: string | null) => ["record-files", area, entityId] as const;

export function useRecordFiles(area: RecordFileArea, entityId: string | null) {
  return useQuery({
    queryKey: key(area, entityId),
    enabled: !!entityId,
    queryFn: async (): Promise<RecordFile[]> => {
      const { data, error } = await supabase
        .from("record_files")
        .select("*")
        .eq("area", area)
        .eq("entity_id", entityId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Uploads a file and records it against the entity. Usable outside React (e.g. during imports). */
export async function uploadRecordFile(area: RecordFileArea, entityId: string, file: File): Promise<RecordFile> {
  if (file.size > MAX_BYTES) throw new Error(`${file.name} is larger than 20 MB.`);
  const me = await getSignedInProfile();
  if (!me) throw new Error("You must be signed in.");
  const safe = file.name.replace(/[^\w.\- ]+/g, "_").slice(-120);
  const path = `${area}/${entityId}/${crypto.randomUUID()}-${safe}`;
  const up = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type || undefined });
  if (up.error) throw up.error;
  const { data, error } = await supabase
    .from("record_files")
    .insert({ area, entity_id: entityId, path, file_name: file.name, file_size: file.size, mime_type: file.type || null, uploaded_by_id: me.id })
    .select()
    .single();
  if (error) {
    await supabase.storage.from(BUCKET).remove([path]);
    throw error;
  }
  return data;
}

export function useUploadRecordFile(area: RecordFileArea, entityId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (files: File[]) => {
      if (!entityId) throw new Error("Nothing to attach to.");
      for (const f of files) await uploadRecordFile(area, entityId, f);
      return files.length;
    },
    onSuccess: (n) => {
      qc.invalidateQueries({ queryKey: key(area, entityId) });
      toast.success(n === 1 ? "File attached" : `${n} files attached`);
    },
    onError: (err: Error) => toast.error(`Upload failed: ${err.message}`),
  });
}

export function useDeleteRecordFile(area: RecordFileArea, entityId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: RecordFile) => {
      const rm = await supabase.storage.from(BUCKET).remove([file.path]);
      if (rm.error) throw rm.error;
      const { error } = await supabase.from("record_files").delete().eq("id", file.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key(area, entityId) });
      toast.success("File removed");
    },
    onError: (err: Error) => toast.error(`Couldn't remove the file: ${err.message}`),
  });
}

/** Opens a file through a short-lived signed URL (the bucket is private). */
export async function openRecordFile(file: RecordFile) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(file.path, 60, { download: file.file_name });
  if (error || !data) {
    toast.error(`Couldn't open the file: ${error?.message ?? "unknown error"}`);
    return;
  }
  window.open(data.signedUrl, "_blank", "noopener");
}
