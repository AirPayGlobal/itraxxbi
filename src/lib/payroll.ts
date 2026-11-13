// Pure payroll helpers: Namibian statutory deductions, payslip totals and
// payslip numbering. No I/O; safe to use on the client or the server.

/** A named amount map as stored in payslips.allowances / payslips.deductions. */
export type AmountMap = Record<string, number>;

export function round2(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

export function sumAmounts(map: AmountMap | null | undefined): number {
  if (!map) return 0;
  return round2(
    Object.values(map).reduce((acc, v) => acc + (Number(v) || 0), 0)
  );
}

// ---------------------------------------------------------------------------
// Namibian income tax (PAYE)
// ---------------------------------------------------------------------------

export type TaxBracket = {
  /** Lower bound of taxable annual income for this bracket (exclusive of the previous bracket's top). */
  from: number;
  /** Upper bound, or null for the top bracket. */
  to: number | null;
  /** Fixed tax due on income up to `from`. */
  base: number;
  /** Marginal rate applied to income above `from`. */
  rate: number;
};

/**
 * Namibian individual income tax table, effective for tax years starting
 * 1 March 2025 (tax-free threshold raised from N$50,000 to N$100,000).
 * Amendments proposed for later years were not law when this was written;
 * check NamRA's published table before relying on it, and update this data
 * (not the calculation) when the brackets change.
 */
export const NAMIBIA_TAX_BRACKETS: readonly TaxBracket[] = [
  { from: 0, to: 100_000, base: 0, rate: 0 },
  { from: 100_000, to: 150_000, base: 0, rate: 0.18 },
  { from: 150_000, to: 350_000, base: 9_000, rate: 0.25 },
  { from: 350_000, to: 550_000, base: 59_000, rate: 0.28 },
  { from: 550_000, to: 850_000, base: 115_000, rate: 0.3 },
  { from: 850_000, to: 1_550_000, base: 205_000, rate: 0.32 },
  { from: 1_550_000, to: null, base: 429_000, rate: 0.37 },
];

/** Annual income tax on a taxable annual income, using the Namibian table above. */
export function calculateNamibiaAnnualIncomeTax(
  annualTaxableIncome: number,
  brackets: readonly TaxBracket[] = NAMIBIA_TAX_BRACKETS
): number {
  const income = Math.max(0, Number(annualTaxableIncome) || 0);
  for (let i = brackets.length - 1; i >= 0; i--) {
    const b = brackets[i];
    if (income > b.from) return round2(b.base + (income - b.from) * b.rate);
  }
  return 0;
}

/**
 * Monthly PAYE for a monthly gross: annualise (x12), apply the Namibian
 * brackets, divide by 12.
 */
export function calculateNamibiaMonthlyPaye(monthlyGross: number): number {
  return round2(calculateNamibiaAnnualIncomeTax((Number(monthlyGross) || 0) * 12) / 12);
}

// ---------------------------------------------------------------------------
// Social Security (Namibia SSC, employee share)
// ---------------------------------------------------------------------------

export const SOCIAL_SECURITY_RATE = 0.009;
export const SOCIAL_SECURITY_MONTHLY_CAP = 99;

/** Employee Social Security contribution: 0.9% of basic, capped at N$99 a month. */
export function calculateSocialSecurity(basicSalary: number): number {
  return round2(
    Math.min(
      Math.max(0, Number(basicSalary) || 0) * SOCIAL_SECURITY_RATE,
      SOCIAL_SECURITY_MONTHLY_CAP
    )
  );
}

/** Statutory deductions for a month: PAYE on gross (basic + allowances), SSC on basic. */
export function calculateStatutoryDeductions(
  basicSalary: number,
  allowances: AmountMap = {}
): { paye: number; social_security: number } {
  const gross = (Number(basicSalary) || 0) + sumAmounts(allowances);
  return {
    paye: calculateNamibiaMonthlyPaye(gross),
    social_security: calculateSocialSecurity(basicSalary),
  };
}

// ---------------------------------------------------------------------------
// Totals
// ---------------------------------------------------------------------------

export type PayslipTotals = {
  total_allowances: number;
  total_deductions: number;
  gross_pay: number;
  net_pay: number;
};

export function computePayslipTotals(input: {
  basic_salary: number;
  allowances: AmountMap | null | undefined;
  deductions: AmountMap | null | undefined;
}): PayslipTotals {
  const total_allowances = sumAmounts(input.allowances);
  const total_deductions = sumAmounts(input.deductions);
  const gross_pay = round2((Number(input.basic_salary) || 0) + total_allowances);
  return {
    total_allowances,
    total_deductions,
    gross_pay,
    net_pay: round2(gross_pay - total_deductions),
  };
}

/** Drop empty keys and zero/invalid amounts, and round what's left. */
export function cleanAmounts(map: AmountMap): AmountMap {
  const out: AmountMap = {};
  for (const [k, v] of Object.entries(map)) {
    const key = k.trim();
    const n = round2(Number(v));
    if (key && Number.isFinite(n) && n !== 0) out[key] = n;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Periods and numbering
// ---------------------------------------------------------------------------

/** "YYYY-MM" for a date (local time). */
export function toPeriod(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/** "2026-11" -> "November 2026". */
export function formatPeriod(period: string): string {
  const [y, m] = period.split("-").map(Number);
  if (!y || !m) return period;
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(
    new Date(y, m - 1, 1)
  );
}

/** Last calendar day of the period as "YYYY-MM-DD" (default pay date). */
export function lastDayOfPeriod(period: string): string {
  const [y, m] = period.split("-").map(Number);
  const day = new Date(y, m, 0).getDate();
  return `${period}-${String(day).padStart(2, "0")}`;
}

/**
 * The next `count` payslip numbers for a period, of the form PS-YYYY-MM-0001,
 * continuing after the highest number already used for that period.
 */
export function nextPayslipNumbers(
  period: string,
  existingNumbers: string[],
  count: number
): string[] {
  const prefix = `PS-${period}-`;
  let max = 0;
  for (const n of existingNumbers) {
    if (!n.startsWith(prefix)) continue;
    const seq = Number(n.slice(prefix.length));
    if (Number.isFinite(seq) && seq > max) max = seq;
  }
  return Array.from(
    { length: count },
    (_, i) => `${prefix}${String(max + i + 1).padStart(4, "0")}`
  );
}

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

const KNOWN_LABELS: Record<string, string> = {
  paye: "PAYE (Income Tax)",
  social_security: "Social Security",
  pension: "Pension Fund",
  medical_aid: "Medical Aid",
  housing: "Housing Allowance",
  transport: "Transport Allowance",
  overtime: "Overtime",
};

/** Human label for an allowance/deduction key ("social_security" -> "Social Security"). */
export function amountLabel(key: string): string {
  if (KNOWN_LABELS[key]) return KNOWN_LABELS[key];
  return key
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Storage key for a label typed by a user ("Car Allowance" -> "car_allowance"). */
export function amountKey(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
