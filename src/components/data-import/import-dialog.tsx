"use client";

import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Loader2, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ACCEPTED_FILES,
  downloadText,
  guessColumn,
  parseSpreadsheet,
  toCsv,
  type ParsedSheet,
  type SheetRow,
} from "@/lib/import/parse";

export type ImportField = {
  key: string;
  label: string;
  required?: boolean;
  /** Header names this field is commonly exported as, best match first. */
  aliases: string[];
  /** Example value for the downloadable template. */
  example?: string;
};

/** One spreadsheet row with its values picked out by field key. */
export type MappedRow = { line: number; values: Record<string, string> };

export type RowCheck<T> = { line: number; ok: true; record: T; note?: string } | { line: number; ok: false; error: string };

export type ImportDialogProps<T> = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  fields: ImportField[];
  templateName: string;
  /** Turns mapped rows into records, or explains why a row can't be imported. May look things up. */
  validate: (rows: MappedRow[]) => Promise<RowCheck<T>[]> | RowCheck<T>[];
  /** Saves the valid records; returns a short summary for the toast. */
  importRows: (records: T[], file: File) => Promise<string>;
  /** Optional extra inputs shown above the preview (e.g. "as of" date). */
  extra?: React.ReactNode;
  /** Column labels for the preview table, picked from each record. */
  preview: { label: string; value: (record: T) => string }[];
};

export function ImportDialog<T>(props: ImportDialogProps<T>) {
  const { open, onClose, title, description, fields, templateName, validate, importRows, extra, preview } = props;
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [sheet, setSheet] = useState<ParsedSheet | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [checks, setChecks] = useState<RowCheck<T>[] | null>(null);
  const [busy, setBusy] = useState<"reading" | "checking" | "saving" | null>(null);

  const missingRequired = useMemo(() => fields.filter((f) => f.required && !mapping[f.key]), [fields, mapping]);
  const valid = (checks ?? []).filter((c): c is Extract<RowCheck<T>, { ok: true }> => c.ok);
  const invalid = (checks ?? []).filter((c): c is Extract<RowCheck<T>, { ok: false }> => !c.ok);

  if (!open) return null;

  function reset() {
    setFile(null);
    setSheet(null);
    setMapping({});
    setChecks(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function pick(f: File | undefined) {
    if (!f) return;
    reset();
    setBusy("reading");
    try {
      const parsed = await parseSpreadsheet(f);
      if (!parsed.rows.length) throw new Error("No rows found in that file.");
      const auto: Record<string, string> = {};
      for (const field of fields) {
        const col = guessColumn(parsed.headers, field.aliases);
        if (col && !Object.values(auto).includes(col)) auto[field.key] = col;
      }
      setFile(f);
      setSheet(parsed);
      setMapping(auto);
    } catch (e) {
      toast.error((e as Error).message || "Couldn't read that file.");
    } finally {
      setBusy(null);
    }
  }

  async function check() {
    if (!sheet) return;
    setBusy("checking");
    try {
      const rows: MappedRow[] = sheet.rows.map((r: SheetRow, i) => ({
        line: i + 2,
        values: Object.fromEntries(fields.map((f) => [f.key, mapping[f.key] ? (r[mapping[f.key]] ?? "").trim() : ""])),
      }));
      setChecks(await validate(rows));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function save() {
    if (!file || !valid.length) return;
    setBusy("saving");
    try {
      const summary = await importRows(valid.map((v) => v.record), file);
      toast.success(summary);
      reset();
      onClose();
    } catch (e) {
      toast.error(`Import failed: ${(e as Error).message}`);
    } finally {
      setBusy(null);
    }
  }

  function template() {
    downloadText(`${templateName}.csv`, toCsv(fields.map((f) => f.label), [fields.map((f) => f.example ?? "")]));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {extra}

          {/* 1. File */}
          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED_FILES}
              className="hidden"
              onChange={(e) => pick(e.target.files?.[0])}
            />
            <button
              onClick={() => inputRef.current?.click()}
              disabled={!!busy}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {busy === "reading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {file ? "Choose another file" : "Choose CSV or Excel file"}
            </button>
            <button onClick={template} className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline">
              <Download className="h-4 w-4" /> Download template
            </button>
            {file && (
              <span className="flex items-center gap-1.5 text-sm text-slate-600">
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                {file.name} · {sheet?.rows.length} rows
              </span>
            )}
          </div>

          {/* 2. Column matching */}
          {sheet && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-700">Match your columns</h3>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {fields.map((f) => (
                  <label key={f.key} className="text-xs text-slate-500">
                    {f.label}
                    {f.required && <span className="text-red-500"> *</span>}
                    <select
                      value={mapping[f.key] ?? ""}
                      onChange={(e) => {
                        setChecks(null);
                        setMapping({ ...mapping, [f.key]: e.target.value });
                      }}
                      className={cn(
                        "mt-1 w-full rounded-lg border bg-white px-2.5 py-1.5 text-sm text-slate-800",
                        f.required && !mapping[f.key] ? "border-red-300" : "border-slate-300"
                      )}
                    >
                      <option value="">— not in file —</option>
                      {sheet.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
              <button
                onClick={check}
                disabled={missingRequired.length > 0 || !!busy}
                className="mt-3 flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {busy === "checking" && <Loader2 className="h-4 w-4 animate-spin" />}
                {missingRequired.length
                  ? `Match ${missingRequired.map((f) => f.label).join(", ")} to continue`
                  : "Check rows"}
              </button>
            </div>
          )}

          {/* 3. Preview */}
          {checks && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-3 text-sm">
                <span className="flex items-center gap-1.5 text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" /> {valid.length} ready to import
                </span>
                {invalid.length > 0 && (
                  <span className="flex items-center gap-1.5 text-amber-700">
                    <AlertTriangle className="h-4 w-4" /> {invalid.length} will be skipped
                  </span>
                )}
              </div>
              {valid.length > 0 && (
                <div className="max-h-64 overflow-auto rounded-lg border border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Row</th>
                        {preview.map((p) => (
                          <th key={p.label} className="px-3 py-2 text-left text-xs font-semibold text-slate-500">
                            {p.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {valid.slice(0, 200).map((v) => (
                        <tr key={v.line}>
                          <td className="px-3 py-1.5 text-xs text-slate-400">
                            {v.line}
                            {v.note && <span className="ml-1 text-amber-600" title={v.note}>•</span>}
                          </td>
                          {preview.map((p) => (
                            <td key={p.label} className="px-3 py-1.5 text-slate-700">
                              {p.value(v.record)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {invalid.length > 0 && (
                <ul className="max-h-40 space-y-1 overflow-auto rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                  {invalid.slice(0, 100).map((c) => (
                    <li key={c.line}>
                      Row {c.line}: {c.error}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">
            Cancel
          </button>
          <button
            onClick={save}
            disabled={!valid.length || !!busy}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {busy === "saving" && <Loader2 className="h-4 w-4 animate-spin" />}
            Import {valid.length || ""} {valid.length === 1 ? "row" : "rows"}
          </button>
        </div>
      </div>
    </div>
  );
}
