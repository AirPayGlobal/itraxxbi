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

      // Private bucket — store the object PATH, not a public URL. Files are
      // served on demand through signed URLs (see getDocumentSignedUrl).
      const { data, error } = await supabase
        .from("documents")
        .insert({
          name: input.name || file.name,
          description: input.description ?? null,
          file_name: file.name,
          file_url: path,
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

// Generate a short-lived signed URL for viewing or downloading an object.
// `doc.file_url` holds the storage object path (private bucket).
export async function getDocumentSignedUrl(
  doc: Document,
  { download = false }: { download?: boolean | string } = {}
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(doc.file_url, 300, {
      download: download === true ? doc.file_name : download || undefined,
    });
  if (error) throw error;
  return data.signedUrl;
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (doc: Document): Promise<void> => {
      // Remove the stored object (file_url is the object path).
      if (doc.file_url) {
        await supabase.storage.from(BUCKET).remove([doc.file_url]);
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
