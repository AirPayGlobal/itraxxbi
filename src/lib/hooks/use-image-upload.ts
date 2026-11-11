"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();
const BUCKET = "brand-assets";
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

export type ImageFolder = "logos" | "avatars";

// Uploads an image to the public brand-assets bucket and returns its public URL.
// Validates type/size, uses a collision-resistant path, and best-effort removes
// a previous object when replacing.
export function useImageUpload(folder: ImageFolder) {
  const [uploading, setUploading] = useState(false);

  const upload = useCallback(
    async (file: File, replaceUrl?: string | null): Promise<string | null> => {
      if (!file.type.startsWith("image/")) {
        toast.error("Please choose an image file (PNG, JPG, SVG…).");
        return null;
      }
      if (file.size > MAX_BYTES) {
        toast.error("Image must be under 2 MB.");
        return null;
      }

      setUploading(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const owner = user?.id ?? "anon";
        const ext = file.name.split(".").pop()?.toLowerCase() || "png";
        const path = `${folder}/${owner}-${Date.now()}.${ext}`;

        const { error } = await supabase.storage
          .from(BUCKET)
          .upload(path, file, {
            cacheControl: "3600",
            upsert: true,
            contentType: file.type || undefined,
          });
        if (error) throw error;

        // Best-effort cleanup of the previous file we're replacing.
        if (replaceUrl) {
          const marker = `/object/public/${BUCKET}/`;
          const idx = replaceUrl.indexOf(marker);
          if (idx !== -1) {
            const old = decodeURIComponent(replaceUrl.slice(idx + marker.length));
            if (old !== path) {
              await supabase.storage.from(BUCKET).remove([old]);
            }
          }
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from(BUCKET).getPublicUrl(path);
        return publicUrl;
      } catch (e) {
        toast.error((e as Error).message || "Upload failed");
        return null;
      } finally {
        setUploading(false);
      }
    },
    [folder]
  );

  return { upload, uploading };
}
