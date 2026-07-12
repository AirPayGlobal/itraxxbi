"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { DocumentRow, DocCategory, DocAccess } from "@/lib/supabase/database.types";

const supabase = createClient();
const KEY = ["documents"] as const;
const BUCKET = "documents";

export type Document = DocumentRow;

export type DocumentUploadInput = {
  file: File;
  name: string;
  description?: string | null;
  category?: DocCategory;
  access_level?: DocAccess;
  expiry_date?: string | null;
  customer_id?: string | null;
};

async function currentUserId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in.");
  return user.id;
}

export function useDocuments() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<Document[]> => {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUploadDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: DocumentUploadInput): Promise<Document> => {
      const uploaded_by_id = await currentUserId();
      const { file } = input;

      // Store under a per-user, collision-resistant path.
      const safeName = file.name.replace(/[^\w.\-]+/g, "_");
      const path = `${uploaded_by_id}/${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || undefined,
        });
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from(BUCKET).getPublicUrl(path);

      const { data, error } = await supabase
        .from("documents")
        .insert({
          name: input.name || file.name,
          description: input.description ?? null,
          file_name: file.name,
          file_url: publicUrl,
          file_size: file.size,
          mime_type: file.type || null,
          category: input.category ?? "GENERAL",
          version: 1,
          access_level: input.access_level ?? "INTERNAL",
          expiry_date: input.expiry_date ?? null,
          customer_id: input.customer_id ?? null,
          uploaded_by_id,
        })
        .select()
        .single();
      if (error) {
        // Roll back the orphaned object if the metadata insert fails.
        await supabase.storage.from(BUCKET).remove([path]);
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("Document uploaded");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to upload document"),
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (doc: Document): Promise<void> => {
      // Best-effort remove of the stored object (path derived from the URL).
      const marker = `/object/public/${BUCKET}/`;
      const idx = doc.file_url.indexOf(marker);
      if (idx !== -1) {
        const path = decodeURIComponent(doc.file_url.slice(idx + marker.length));
        await supabase.storage.from(BUCKET).remove([path]);
      }
      const { error } = await supabase.from("documents").delete().eq("id", doc.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("Document deleted");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to delete document"),
  });
}
