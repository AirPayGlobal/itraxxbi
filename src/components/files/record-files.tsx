"use client";

import { useRef } from "react";
import { Download, FileText, Loader2, Paperclip, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { RecordFileArea } from "@/lib/supabase/database.types";
import {
  openRecordFile,
  useDeleteRecordFile,
  useRecordFiles,
  useUploadRecordFile,
} from "@/lib/hooks/use-record-files";

const size = (b: number | null) =>
  b == null ? "" : b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1048576).toFixed(1)} MB`;

/** Attached files for one record: list, open, and (when allowed) attach or remove. */
export function RecordFiles({
  area,
  entityId,
  canEdit,
  title = "Attachments",
  accept,
  emptyText = "No files attached.",
}: {
  area: RecordFileArea;
  entityId: string;
  canEdit: boolean;
  title?: string;
  accept?: string;
  emptyText?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const { data: files = [], isLoading, isError } = useRecordFiles(area, entityId);
  const upload = useUploadRecordFile(area, entityId);
  const remove = useDeleteRecordFile(area, entityId);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-400">{title}</h4>
        {canEdit && (
          <>
            <input
              ref={input}
              type="file"
              multiple
              accept={accept}
              className="hidden"
              onChange={(e) => {
                const list = Array.from(e.target.files ?? []);
                if (list.length) upload.mutate(list);
                e.target.value = "";
              }}
            />
            <button
              onClick={() => input.current?.click()}
              disabled={upload.isPending}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-50"
            >
              {upload.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />}
              Attach file
            </button>
          </>
        )}
      </div>
      {isLoading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : isError ? (
        <p className="text-sm text-red-600">Couldn&apos;t load files.</p>
      ) : files.length === 0 ? (
        <p className="text-sm italic text-gray-400">{emptyText}</p>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
          {files.map((f) => (
            <li key={f.id} className="flex items-center gap-3 px-3 py-2">
              <FileText className="h-4 w-4 flex-shrink-0 text-gray-400" />
              <button
                onClick={() => openRecordFile(f)}
                className="min-w-0 flex-1 truncate text-left text-sm text-gray-800 hover:text-blue-600 hover:underline"
                title={f.file_name}
              >
                {f.file_name}
              </button>
              <span className="hidden text-xs text-gray-400 sm:inline">
                {size(f.file_size)} · {formatDate(f.created_at)}
              </span>
              <button onClick={() => openRecordFile(f)} aria-label={`Download ${f.file_name}`} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
                <Download className="h-4 w-4" />
              </button>
              {canEdit && (
                <button
                  onClick={() => confirm(`Remove ${f.file_name}?`) && remove.mutate(f)}
                  aria-label={`Remove ${f.file_name}`}
                  className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
