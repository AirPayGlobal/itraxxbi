"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createClient, getSignedInProfile } from "@/lib/supabase/client";
import type {
  EmployeeRow,
  PayslipRow,
  ProfileRow,
  RecordFileRow,
} from "@/lib/supabase/database.types";
import type { MappedRow, RowCheck } from "@/components/data-import/import-dialog";
import { parseDate, parsePeriod } from "@/lib/import/parse";
import {
  checkPayslipRows,
  type ExistingPayslip,
  type PayslipImportRecord,
} from "@/lib/import/payslip-import";
import {
  calculateStatutoryDeductions,
  cleanAmounts,
  computePayslipTotals,
  formatPeriod,
  lastDayOfPeriod,
  nextPayslipNumbers,
  type AmountMap,
} from "@/lib/payroll";

const supabase = createClient();
const KEY = ["payslips"] as const;

export type Payslip = PayslipRow;

/** Profile + employee record of someone on the payroll. */
export type PayrollPerson = Pick<
  ProfileRow,
  "id" | "name" | "email" | "department" | "job_title" | "role" | "is_active"
> & {
  employee: EmployeeRow | null;
};

// Numeric columns come back from PostgREST as numbers or strings depending on
// precision, so normalise them once here.
function normalise(row: PayslipRow): Payslip {
  return {
    ...row,
    basic_salary: Number(row.basic_salary) || 0,
    total_allowances: Number(row.total_allowances) || 0,
    total_deductions: Number(row.total_deductions) || 0,
    gross_pay: Number(row.gross_pay) || 0,
    net_pay: Number(row.net_pay) || 0,
    allowances: (row.allowances ?? {}) as AmountMap,
    deductions: (row.deductions ?? {}) as AmountMap,
  };
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** Distinct periods that have payslips, newest first. */
export function usePayslipPeriods() {
  return useQuery({
    queryKey: [...KEY, "periods"],
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from("payslips")
        .select("period")
        .order("period", { ascending: false });
      if (error) throw error;
      return Array.from(new Set((data ?? []).map((r) => r.period)));
    },
  });
}

/** All payslips for a period (managers see everyone; RLS limits others to their own). */
export function usePayslipsForPeriod(period: string | null) {
  return useQuery({
    queryKey: [...KEY, "period", period],
    enabled: !!period,
    queryFn: async (): Promise<Payslip[]> => {
      const { data, error } = await supabase
        .from("payslips")
        .select("*")
        .eq("period", period!)
        .order("payslip_number");
      if (error) throw error;
      return (data ?? []).map(normalise);
    },
  });
}

/** The signed-in person's own payslips, newest first. */
export function useMyPayslips(userId: string | null | undefined) {
  return useQuery({
    queryKey: [...KEY, "mine", userId],
    enabled: !!userId,
    queryFn: async (): Promise<Payslip[]> => {
      const { data, error } = await supabase
        .from("payslips")
        .select("*")
        .eq("user_id", userId!)
        .order("period", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(normalise);
    },
  });
}

/** Active staff profiles (not clients) joined with their employee record. */
export function usePayrollPeople() {
  return useQuery({
    queryKey: ["payroll_people"],
    queryFn: async (): Promise<PayrollPerson[]> => {
      return fetchPayrollPeople();
    },
  });
}

async function fetchPayrollPeople(): Promise<PayrollPerson[]> {
  const [profilesRes, employeesRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, name, email, department, job_title, role, is_active")
      .neq("role", "CLIENT")
      .order("name"),
    supabase.from("employees").select("*"),
  ]);
  if (profilesRes.error) throw profilesRes.error;
  if (employeesRes.error) throw employeesRes.error;
  const byUser = new Map(
    (employeesRes.data ?? []).map((e) => [e.user_id, e] as const)
  );
  return (profilesRes.data ?? []).map((p) => ({
    ...p,
    employee: byUser.get(p.id) ?? null,
  }));
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export type GenerateResult = {
  created: number;
  skippedExisting: number;
  skippedNoSalary: number;
};

/**
 * Create one payslip per active staff member with a salary for `period`,
 * skipping anyone who already has one for that period.
 */
export function useGeneratePayslips() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (period: string): Promise<GenerateResult> => {
      const me = await getSignedInProfile();
      const people = (await fetchPayrollPeople()).filter((p) => p.is_active);

      const { data: existing, error: existingErr } = await supabase
        .from("payslips")
        .select("user_id, payslip_number")
        .eq("period", period);
      if (existingErr) throw existingErr;
      const already = new Set((existing ?? []).map((r) => r.user_id));

      const eligible = people.filter(
        (p) => p.employee && Number(p.employee.salary) > 0
      );
      const toCreate = eligible.filter((p) => !already.has(p.id));
      const skippedNoSalary = people.length - eligible.length;
      const skippedExisting = eligible.length - toCreate.length;

      if (toCreate.length === 0) {
        return { created: 0, skippedExisting, skippedNoSalary };
      }

      const numbers = nextPayslipNumbers(
        period,
        (existing ?? []).map((r) => r.payslip_number),
        toCreate.length
      );
      const pay_date = lastDayOfPeriod(period);

      const rows = toCreate.map((p, i) => {
        const basic_salary = Number(p.employee!.salary) || 0;
        const allowances: AmountMap = {};
        const deductions: AmountMap = cleanAmounts(
          calculateStatutoryDeductions(basic_salary, allowances)
        );
        return {
          payslip_number: numbers[i],
          user_id: p.id,
          period,
          pay_date,
          basic_salary,
          allowances,
          deductions,
          ...computePayslipTotals({ basic_salary, allowances, deductions }),
          status: "GENERATED" as const,
          created_by_id: me?.id ?? null,
        };
      });

      const { error } = await supabase.from("payslips").insert(rows);
      if (error) throw error;
      return { created: rows.length, skippedExisting, skippedNoSalary };
    },
    onSuccess: (res, period) => {
      qc.invalidateQueries({ queryKey: KEY });
      const label = formatPeriod(period);
      if (res.created > 0) {
        toast.success(
          `Generated ${res.created} payslip${res.created === 1 ? "" : "s"} for ${label}`
        );
      } else {
        toast.info(`No new payslips to generate for ${label}`);
      }
    },
    onError: (e: Error) => toast.error(e.message || "Failed to generate payslips"),
  });
}

export type PayslipEdit = {
  id: string;
  basic_salary: number;
  allowances: AmountMap;
  deductions: AmountMap;
  pay_date?: string | null;
};

/** Edit a DRAFT/GENERATED payslip's amounts; totals are recomputed. */
export function useUpdatePayslip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: PayslipEdit): Promise<Payslip> => {
      const allowances = cleanAmounts(input.allowances);
      const deductions = cleanAmounts(input.deductions);
      const patch = {
        basic_salary: input.basic_salary,
        allowances,
        deductions,
        ...computePayslipTotals({
          basic_salary: input.basic_salary,
          allowances,
          deductions,
        }),
        ...(input.pay_date !== undefined ? { pay_date: input.pay_date } : {}),
      };
      const { data, error } = await supabase
        .from("payslips")
        .update(patch)
        .eq("id", input.id)
        .in("status", ["DRAFT", "GENERATED"])
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Only draft or generated payslips can be edited.");
      return normalise(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("Payslip updated");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to update payslip"),
  });
}

/** Mark payslips as sent (status only; nothing is emailed). */
export function useMarkPayslipsSent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]): Promise<number> => {
      if (ids.length === 0) return 0;
      const { data, error } = await supabase
        .from("payslips")
        .update({ status: "SENT", sent_at: new Date().toISOString() })
        .in("id", ids)
        .in("status", ["DRAFT", "GENERATED"])
        .select("id");
      if (error) throw error;
      return data?.length ?? 0;
    },
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success(
        count > 0
          ? `${count} payslip${count === 1 ? "" : "s"} marked as sent`
          : "No unsent payslips to mark"
      );
    },
    onError: (e: Error) => toast.error(e.message || "Failed to mark payslips as sent"),
  });
}

// ---------------------------------------------------------------------------
// Import from a payroll export
// ---------------------------------------------------------------------------

/** Validates spreadsheet rows against staff and the payslips already on file for those periods. */
export async function checkPayslipImport(rows: MappedRow[]): Promise<RowCheck<PayslipImportRecord>[]> {
  const periods = new Set<string>();
  for (const r of rows) {
    const p = parsePeriod(r.values.period) ?? parseDate(r.values.pay_date)?.slice(0, 7);
    if (p) periods.add(p);
  }
  const [people, existing] = await Promise.all([fetchPayrollPeople(), fetchExistingForPeriods([...periods])]);
  return checkPayslipRows(
    rows,
    people.map((p) => ({ id: p.id, name: p.name, email: p.email, employee_number: p.employee?.employee_number ?? null })),
    existing
  );
}

async function fetchExistingForPeriods(periods: string[]): Promise<ExistingPayslip[]> {
  if (!periods.length) return [];
  const { data, error } = await supabase
    .from("payslips")
    .select("id, user_id, period, status, payslip_number")
    .in("period", periods);
  if (error) throw error;
  return data ?? [];
}

/**
 * Saves checked import records: updates the DRAFT/GENERATED payslips they replace and inserts
 * the rest with fresh payslip numbers. Everything ends up GENERATED.
 */
export async function importPayslips(records: PayslipImportRecord[]): Promise<{ created: number; updated: number }> {
  const me = await getSignedInProfile();
  const amounts = (r: PayslipImportRecord) => ({
    pay_date: r.pay_date,
    basic_salary: r.basic_salary,
    allowances: r.allowances,
    deductions: r.deductions,
    total_allowances: r.total_allowances,
    total_deductions: r.total_deductions,
    gross_pay: r.gross_pay,
    net_pay: r.net_pay,
    status: "GENERATED" as const,
  });

  let updated = 0;
  const updates = records.filter((r) => r.existing_id);
  for (const r of updates) {
    const { data, error } = await supabase
      .from("payslips")
      .update(amounts(r))
      .eq("id", r.existing_id!)
      .in("status", ["DRAFT", "GENERATED"])
      .select("id")
      .maybeSingle();
    if (error) throw new Error(`Row ${r.line}: ${error.message}`);
    if (!data) throw new Error(`Row ${r.line}: ${r.existing_number} was sent while importing; ${updated} updated before this`);
    updated++;
  }

  const inserts = records.filter((r) => !r.existing_id);
  if (inserts.length) {
    const periods = [...new Set(inserts.map((r) => r.period))];
    const existing = await fetchExistingForPeriods(periods);
    const taken = new Set(existing.map((e) => `${e.user_id}|${e.period}`));
    const clash = inserts.find((r) => taken.has(`${r.user_id}|${r.period}`));
    if (clash) {
      throw new Error(
        `Row ${clash.line}: ${clash.employee_name} got a payslip for ${formatPeriod(clash.period)} while importing; check the rows again`
      );
    }
    const rows = periods.flatMap((period) => {
      const forPeriod = inserts.filter((r) => r.period === period);
      const numbers = nextPayslipNumbers(
        period,
        existing.filter((e) => e.period === period).map((e) => e.payslip_number),
        forPeriod.length
      );
      return forPeriod.map((r, i) => ({
        ...amounts(r),
        payslip_number: numbers[i],
        user_id: r.user_id,
        period,
        created_by_id: me?.id ?? null,
      }));
    });
    const { error } = await supabase.from("payslips").insert(rows);
    if (error) throw new Error(updated ? `${updated} updated, but adding new payslips failed: ${error.message}` : error.message);
  }

  return { created: inserts.length, updated };
}

// ---------------------------------------------------------------------------
// Attached PDFs
// ---------------------------------------------------------------------------

export const PAYSLIP_FILES_KEY = ["record-files", "payslip", "batch"] as const;

/** Files attached to many payslips in one query, grouped by payslip id. RLS decides what is visible. */
export function usePayslipFiles(ids: string[]) {
  const sorted = [...ids].sort();
  return useQuery({
    queryKey: [...PAYSLIP_FILES_KEY, sorted.join(",")],
    enabled: sorted.length > 0,
    queryFn: async (): Promise<Map<string, RecordFileRow[]>> => {
      const out = new Map<string, RecordFileRow[]>();
      for (let i = 0; i < sorted.length; i += 100) {
        const { data, error } = await supabase
          .from("record_files")
          .select("*")
          .eq("area", "payslip")
          .in("entity_id", sorted.slice(i, i + 100))
          .order("created_at", { ascending: false });
        if (error) throw error;
        for (const f of data ?? []) out.set(f.entity_id, [...(out.get(f.entity_id) ?? []), f]);
      }
      return out;
    },
  });
}

/** An employee records that they opened their own payslip. Silent on success. */
export function useMarkPayslipViewed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.rpc("mark_payslip_viewed", { payslip: id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to update payslip"),
  });
}
