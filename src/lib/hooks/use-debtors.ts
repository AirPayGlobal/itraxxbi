"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createClient, getSignedInProfile } from "@/lib/supabase/client";
import type { DebtorAgeLineRow, DebtorAgeReportRow } from "@/lib/supabase/database.types";
import { uploadRecordFile } from "@/lib/hooks/use-record-files";
import { formatCurrency } from "@/lib/utils";

// Debtors age analysis: one report per upload (as of a date) with one line per customer account.
const supabase = createClient();
const REPORTS_KEY = ["debtor-reports"] as const;
const linesKey = (reportId: string | null) => ["debtor-reports", reportId, "lines"] as const;
const PAGE = 1000;

export type DebtorReport = DebtorAgeReportRow;
export type DebtorLine = DebtorAgeLineRow;
/** A line ready to insert (report id is filled in on save). */
export type DebtorLineDraft = Omit<DebtorAgeLineRow, "id" | "report_id">;

export const AGE_BUCKETS = [
  { key: "current_amount", label: "Current" },
  { key: "days_30", label: "30 days" },
  { key: "days_60", label: "60 days" },
  { key: "days_90", label: "90 days" },
  { key: "days_120_plus", label: "120+ days" },
] as const;
export type AgeBucketKey = (typeof AGE_BUCKETS)[number]["key"];

/** Reads every page of a query (PostgREST caps each response at 1000 rows). */
async function fetchAll<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) throw error;
    out.push(...(data ?? []));
    if (!data || data.length < PAGE) return out;
  }
}

/** "2026-10-31" → "31 Oct 2026" (no time zone shift). */
export function formatAsOf(date: string): string {
  const [y, m, d] = date.slice(0, 10).split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, d))
  );
}

/** Last day of the previous month as YYYY-MM-DD, the usual "as of" date for a month-end age analysis. */
export function lastDayOfPreviousMonth(today = new Date()): string {
  const d = new Date(today.getFullYear(), today.getMonth(), 0);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function useDebtorReports() {
  return useQuery({
    queryKey: REPORTS_KEY,
    queryFn: async (): Promise<DebtorReport[]> => {
      const { data, error } = await supabase
        .from("debtor_age_reports")
        .select("*")
        .order("as_of", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useDebtorLines(reportId: string | null) {
  return useQuery({
    queryKey: linesKey(reportId),
    enabled: !!reportId,
    queryFn: async (): Promise<DebtorLine[]> => {
      const rows = await fetchAll<DebtorLine>((from, to) =>
        supabase.from("debtor_age_lines").select("*").eq("report_id", reportId!).order("id").range(from, to)
      );
      return rows.map((r) => ({
        ...r,
        current_amount: Number(r.current_amount) || 0,
        days_30: Number(r.days_30) || 0,
        days_60: Number(r.days_60) || 0,
        days_90: Number(r.days_90) || 0,
        days_120_plus: Number(r.days_120_plus) || 0,
        total: Number(r.total) || 0,
      }));
    },
  });
}

/**
 * Finds a customer for an age-analysis line: by account number first, then by exact name or company
 * (case-insensitive). Returns null when nothing matches.
 */
export async function loadCustomerMatcher(): Promise<(accountNumber: string, name: string) => string | null> {
  const customers = await fetchAll<{ id: string; name: string; company: string | null; account_number: string | null }>(
    (from, to) => supabase.from("customers").select("id, name, company, account_number").order("id").range(from, to)
  );
  const acc = (s: string) => s.trim().toUpperCase().replace(/\s+/g, "");
  const nm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
  const byAccount = new Map<string, string>();
  const byName = new Map<string, string>();
  const byCompany = new Map<string, string>();
  for (const c of customers) {
    if (c.account_number && !byAccount.has(acc(c.account_number))) byAccount.set(acc(c.account_number), c.id);
    if (c.name && !byName.has(nm(c.name))) byName.set(nm(c.name), c.id);
    if (c.company && !byCompany.has(nm(c.company))) byCompany.set(nm(c.company), c.id);
  }
  return (accountNumber, name) =>
    (accountNumber && byAccount.get(acc(accountNumber))) ||
    (name && (byName.get(nm(name)) ?? byCompany.get(nm(name)))) ||
    null;
}

export type DebtorImportInput = {
  asOf: string;
  notes: string | null;
  lines: DebtorLineDraft[];
  file: File;
};

/** Saves a report and its lines, then attaches the original file. Returns the summary for the toast. */
export function useImportDebtorReport(onSaved?: (reportId: string) => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ asOf, notes, lines, file }: DebtorImportInput): Promise<{ id: string; summary: string }> => {
      if (!lines.length) throw new Error("No lines to import.");
      const me = await getSignedInProfile();
      const { data: report, error } = await supabase
        .from("debtor_age_reports")
        .insert({ as_of: asOf, file_name: file.name, notes, uploaded_by_id: me?.id ?? null })
        .select()
        .single();
      if (error) throw error;

      for (let i = 0; i < lines.length; i += 500) {
        const chunk = lines.slice(i, i + 500).map((l) => ({ ...l, report_id: report.id }));
        const { error: lineError } = await supabase.from("debtor_age_lines").insert(chunk);
        if (lineError) {
          // Don't leave a half-imported report behind; lines cascade with it.
          await supabase.from("debtor_age_reports").delete().eq("id", report.id);
          throw lineError;
        }
      }

      let attachNote = "";
      try {
        await uploadRecordFile("debtors", report.id, file);
      } catch (e) {
        attachNote = ` (the original file couldn't be attached: ${(e as Error).message})`;
      }

      const total = lines.reduce((s, l) => s + l.total, 0);
      const n = lines.length;
      return {
        id: report.id,
        summary: `Age analysis as of ${formatAsOf(asOf)}: ${n} ${n === 1 ? "customer" : "customers"}, ${formatCurrency(total)} outstanding${attachNote}`,
      };
    },
    onSuccess: ({ id }) => {
      qc.invalidateQueries({ queryKey: REPORTS_KEY });
      qc.invalidateQueries({ queryKey: ["record-files", "debtors", id] });
      onSaved?.(id);
    },
  });
}

/** Removes the files attached to a record (storage objects and their rows). Best effort. */
async function removeAttachedFiles(entityId: string) {
  const { data } = await supabase.from("record_files").select("id, path").eq("area", "debtors").eq("entity_id", entityId);
  if (!data?.length) return;
  await supabase.storage.from("records").remove(data.map((f) => f.path));
  await supabase.from("record_files").delete().in("id", data.map((f) => f.id));
}

export function useDeleteDebtorReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("debtor_age_reports").delete().eq("id", id);
      if (error) throw error;
      await removeAttachedFiles(id).catch(() => undefined);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: REPORTS_KEY });
      toast.success("Age analysis deleted");
    },
    onError: (e: Error) => toast.error(e.message || "Couldn't delete the age analysis"),
  });
}
