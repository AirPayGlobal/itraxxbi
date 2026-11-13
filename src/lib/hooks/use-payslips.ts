"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createClient, getSignedInProfile } from "@/lib/supabase/client";
import type {
  EmployeeRow,
  PayslipRow,
  ProfileRow,
} from "@/lib/supabase/database.types";
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
