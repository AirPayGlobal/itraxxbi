// Payslip import: turns spreadsheet rows exported from a payroll provider into payslip records,
// and matches bulk-uploaded PDF payslips to existing payslips by their file names.
// Pure logic only; the database reads and writes live in src/lib/hooks/use-payslips.ts.
import type { ImportField, MappedRow, RowCheck } from "@/components/data-import/import-dialog";
import { parseAmount, parseDate, parsePeriod } from "@/lib/import/parse";
import { cleanAmounts, formatPeriod, lastDayOfPeriod, round2, sumAmounts, type AmountMap } from "@/lib/payroll";
import type { PayslipStatus } from "@/lib/supabase/database.types";

// ---------------------------------------------------------------------------
// Spreadsheet import
// ---------------------------------------------------------------------------

export const PAYSLIP_IMPORT_FIELDS: ImportField[] = [
  { key: "email", label: "Employee email", aliases: ["email", "e-mail", "email address", "work email"], example: "jane@example.com" },
  {
    key: "employee_number",
    label: "Employee number",
    aliases: ["employee number", "employee no", "emp number", "emp no", "employee id", "emp id", "staff number", "staff no", "payroll number", "employee code"],
    example: "EMP-001",
  },
  { key: "name", label: "Employee name", aliases: ["employee name", "full name", "name", "employee", "staff name"], example: "Jane Doe" },
  { key: "period", label: "Period", aliases: ["period", "pay period", "payroll period", "month", "pay month"], example: "Nov 2026" },
  { key: "pay_date", label: "Pay date", aliases: ["pay date", "payment date", "date paid", "paid on", "date"], example: "25/11/2026" },
  { key: "basic_salary", label: "Basic salary", required: true, aliases: ["basic salary", "basic pay", "basic", "salary"], example: "25000.00" },
  { key: "gross_pay", label: "Gross pay", required: true, aliases: ["gross pay", "gross", "gross salary", "gross earnings", "total earnings"], example: "27500.00" },
  { key: "total_deductions", label: "Total deductions", required: true, aliases: ["total deductions", "deductions", "total deduction"], example: "4321.00" },
  { key: "net_pay", label: "Net pay", required: true, aliases: ["net pay", "net salary", "nett pay", "take home", "net"], example: "23179.00" },
  { key: "paye", label: "PAYE", aliases: ["paye", "income tax", "tax"], example: "3500.00" },
  { key: "social_security", label: "Social security", aliases: ["social security", "ssc", "social security commission"], example: "99.00" },
  { key: "pension", label: "Pension", aliases: ["pension", "pension fund", "provident fund", "retirement fund"], example: "500.00" },
  { key: "medical_aid", label: "Medical aid", aliases: ["medical aid", "medical", "med aid"], example: "222.00" },
  { key: "other_allowances", label: "Other allowances", aliases: ["other allowances", "allowances", "total allowances"], example: "2500.00" },
];

/** Someone a row can be matched to. */
export type ImportPerson = { id: string; name: string; email: string; employee_number: string | null };

/** An existing payslip for an employee + period. */
export type ExistingPayslip = { id: string; user_id: string; period: string; status: PayslipStatus; payslip_number: string };

export type PayslipImportRecord = {
  line: number;
  user_id: string;
  employee_name: string;
  period: string;
  pay_date: string;
  basic_salary: number;
  allowances: AmountMap;
  deductions: AmountMap;
  total_allowances: number;
  total_deductions: number;
  gross_pay: number;
  net_pay: number;
  /** Set when the row updates an existing DRAFT/GENERATED payslip. */
  existing_id: string | null;
  existing_number: string | null;
};

const squash = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
const alnum = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export type PersonIndex = {
  byEmail: Map<string, ImportPerson>;
  byNumber: Map<string, ImportPerson>;
  byName: Map<string, ImportPerson[]>;
};

export function indexPeople(people: ImportPerson[]): PersonIndex {
  const byEmail = new Map<string, ImportPerson>();
  const byNumber = new Map<string, ImportPerson>();
  const byName = new Map<string, ImportPerson[]>();
  for (const p of people) {
    if (p.email) byEmail.set(squash(p.email), p);
    if (p.employee_number && alnum(p.employee_number)) byNumber.set(alnum(p.employee_number), p);
    if (p.name) byName.set(squash(p.name), [...(byName.get(squash(p.name)) ?? []), p]);
  }
  return { byEmail, byNumber, byName };
}

/** Email first, then employee number, then exact full name. Each value is tried against all three. */
function findPerson(idx: PersonIndex, values: string[]): { person: ImportPerson } | { error: string } {
  const given = values.map((v) => v.trim()).filter(Boolean);
  if (!given.length) return { error: "No employee email, number or name on this row" };
  for (const v of given) {
    const hit = idx.byEmail.get(squash(v));
    if (hit) return { person: hit };
  }
  for (const v of given) {
    const hit = alnum(v) ? idx.byNumber.get(alnum(v)) : undefined;
    if (hit) return { person: hit };
  }
  for (const v of given) {
    const hits = idx.byName.get(squash(v));
    if (hits?.length === 1) return { person: hits[0] };
    if (hits && hits.length > 1) return { error: `More than one employee is called "${v}"; use an email or employee number` };
  }
  return { error: `No employee found for ${given.map((v) => `"${v}"`).join(" / ")}` };
}

const money = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Checks mapped rows against the staff list and the payslips that already exist for those periods.
 * Amounts from the file are kept as given; any gap between the itemised lines and the file's totals
 * is recorded as "Other earnings" / "Other deductions" so the payslip still adds up.
 */
export function checkPayslipRows(
  rows: MappedRow[],
  people: ImportPerson[],
  existing: ExistingPayslip[]
): RowCheck<PayslipImportRecord>[] {
  const idx = indexPeople(people);
  const existingByKey = new Map(existing.map((e) => [`${e.user_id}|${e.period}`, e] as const));
  const seen = new Map<string, number>();

  return rows.map((row): RowCheck<PayslipImportRecord> => {
    const v = row.values;
    const fail = (error: string): RowCheck<PayslipImportRecord> => ({ line: row.line, ok: false, error });

    const found = findPerson(idx, [v.email, v.employee_number, v.name]);
    if ("error" in found) return fail(found.error);
    const person = found.person;

    const payDate = parseDate(v.pay_date);
    if (v.pay_date && !payDate) return fail(`Pay date "${v.pay_date}" isn't a date`);
    const period = parsePeriod(v.period) ?? (v.period ? null : payDate?.slice(0, 7) ?? null);
    if (!period) return fail(v.period ? `Period "${v.period}" isn't a month` : "No period or pay date");

    const basic = parseAmount(v.basic_salary);
    const gross = parseAmount(v.gross_pay);
    const totalDed = parseAmount(v.total_deductions);
    const net = parseAmount(v.net_pay);
    if (net === null) return fail(v.net_pay ? `Net pay "${v.net_pay}" isn't an amount` : "No net pay");
    if (basic === null) return fail(v.basic_salary ? `Basic salary "${v.basic_salary}" isn't an amount` : "No basic salary");
    if (gross === null) return fail(v.gross_pay ? `Gross pay "${v.gross_pay}" isn't an amount` : "No gross pay");
    if (totalDed === null && v.total_deductions) return fail(`Total deductions "${v.total_deductions}" isn't an amount`);
    if (basic < 0 || gross < 0 || net < 0 || (totalDed ?? 0) < 0) return fail("Amounts can't be negative");

    const deductionsTotal = round2(totalDed ?? 0);
    const optional: Record<string, number | null> = {};
    for (const k of ["paye", "social_security", "pension", "medical_aid", "other_allowances"]) {
      const n = parseAmount(v[k]);
      if (v[k] && n === null) return fail(`${k.replace(/_/g, " ")} "${v[k]}" isn't an amount`);
      if (n !== null && n < 0) return fail("Amounts can't be negative");
      optional[k] = n;
    }

    if (Math.abs(round2(gross - deductionsTotal) - net) > 1) {
      return fail(
        `Net pay ${money(net)} doesn't equal gross ${money(gross)} less deductions ${money(deductionsTotal)}; check the column matching`
      );
    }

    // Earnings: basic + itemised allowances, with any remainder of gross as "other earnings".
    const allowances = cleanAmounts({ other_allowances: optional.other_allowances ?? 0 });
    const earningsGap = round2(gross - basic - sumAmounts(allowances));
    if (earningsGap < -0.01) return fail(`Basic salary plus allowances is more than gross pay ${money(gross)}`);
    if (earningsGap > 0.01) allowances.other_earnings = round2((allowances.other_earnings ?? 0) + earningsGap);

    const deductions = cleanAmounts({
      paye: optional.paye ?? 0,
      social_security: optional.social_security ?? 0,
      pension: optional.pension ?? 0,
      medical_aid: optional.medical_aid ?? 0,
    });
    const deductionsGap = round2(deductionsTotal - sumAmounts(deductions));
    if (deductionsGap < -0.01) return fail(`Itemised deductions add up to more than total deductions ${money(deductionsTotal)}`);
    if (deductionsGap > 0.01) deductions.other_deductions = deductionsGap;

    const key = `${person.id}|${period}`;
    const dupLine = seen.get(key);
    if (dupLine) return fail(`Same employee and period as row ${dupLine}`);
    seen.set(key, row.line);

    const prior = existingByKey.get(key);
    if (prior && prior.status !== "DRAFT" && prior.status !== "GENERATED") {
      return fail(`${person.name} already has a payslip for ${formatPeriod(period)} that was already sent (${prior.status})`);
    }

    const notes: string[] = [];
    if (prior) notes.push(`Updates ${prior.payslip_number}`);
    if (Math.abs(round2(gross - deductionsTotal) - net) > 0.009) notes.push("Net pay differs from gross less deductions by a few cents");

    return {
      line: row.line,
      ok: true,
      note: notes.join(". ") || undefined,
      record: {
        line: row.line,
        user_id: person.id,
        employee_name: person.name,
        period,
        pay_date: payDate ?? lastDayOfPeriod(period),
        basic_salary: round2(basic),
        allowances,
        deductions,
        total_allowances: round2(gross - basic),
        total_deductions: deductionsTotal,
        gross_pay: round2(gross),
        net_pay: round2(net),
        existing_id: prior?.id ?? null,
        existing_number: prior?.payslip_number ?? null,
      },
    };
  });
}

// ---------------------------------------------------------------------------
// Bulk PDF matching
// ---------------------------------------------------------------------------

export type PdfCandidate = { payslipId: string; person: ImportPerson };

export type PdfMatch =
  | { payslipId: string; how: string }
  | { payslipId: null; reason: string };

const tokens = (s: string) => s.toLowerCase().replace(/\.[a-z0-9]+$/, "").split(/[^a-z0-9]+/).filter(Boolean);

/** True when some run of consecutive tokens, joined, spells `target` (so "emp-001" matches "EMP001"). */
function hasRun(fileTokens: string[], target: string): boolean {
  if (!target) return false;
  for (let i = 0; i < fileTokens.length; i++) {
    let acc = "";
    for (let j = i; j < fileTokens.length && acc.length < target.length; j++) {
      acc += fileTokens[j];
      if (acc === target) return true;
    }
  }
  return false;
}

/**
 * Matches one PDF file name to a payslip. Strongest evidence wins: employee number or email,
 * then every part of the full name, then a single distinctive name part. A tie at the
 * strongest level is reported as ambiguous instead of guessed.
 */
export function matchPdfToPayslip(fileName: string, candidates: PdfCandidate[]): PdfMatch {
  const ft = tokens(fileName);
  const tiers: { how: string; hits: PdfCandidate[] }[] = [
    { how: "employee number", hits: [] },
    { how: "email", hits: [] },
    { how: "full name", hits: [] },
    { how: "name", hits: [] },
  ];
  for (const c of candidates) {
    const num = alnum(c.person.employee_number ?? "");
    if (num.length >= 3 && hasRun(ft, num)) tiers[0].hits.push(c);
    const local = alnum((c.person.email ?? "").split("@")[0]);
    if (local.length >= 4 && hasRun(ft, local)) tiers[1].hits.push(c);
    const parts = tokens(c.person.name ?? "").filter((p) => p.length >= 2);
    if (parts.length >= 2 && parts.every((p) => ft.includes(p))) tiers[2].hits.push(c);
    else if (parts.some((p) => p.length >= 3 && ft.includes(p))) tiers[3].hits.push(c);
  }
  for (const t of tiers) {
    if (t.hits.length === 1) return { payslipId: t.hits[0].payslipId, how: t.how };
    if (t.hits.length > 1) {
      return {
        payslipId: null,
        reason: `Matches ${t.hits.length} people by ${t.how} (${t.hits.map((h) => h.person.name).slice(0, 3).join(", ")})`,
      };
    }
  }
  return { payslipId: null, reason: "No employee number, email or name found in the file name" };
}
