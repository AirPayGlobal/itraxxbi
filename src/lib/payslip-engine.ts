// ---------------------------------------------------------------------------
// Payslip generation engine
// Generates monthly payslips for all employees with Namibian tax/deductions
// ---------------------------------------------------------------------------

export interface PayslipEmployee {
  id: string;
  name: string;
  employeeNumber: string;
  department: string;
  jobTitle: string;
  bankName: string;
  bankAccount: string;
  taxNumber: string;
  socialSecurityNo: string;
  basicSalary: number;
  allowances: {
    housing: number;
    transport: number;
    medical: number;
    overtime: number;
  };
  deductions: {
    paye: number; // Namibian income tax
    socialSecurity: number;
    medicalAid: number;
    pension: number;
    unionFees: number;
  };
}

export interface Payslip {
  id: string;
  payslipNumber: string;
  employeeId: string;
  employee: PayslipEmployee;
  payPeriod: string; // e.g. "March 2026"
  payDate: string;
  grossPay: number;
  totalAllowances: number;
  totalDeductions: number;
  netPay: number;
  status: "DRAFT" | "GENERATED" | "SENT" | "VIEWED";
  sentAt: string | null;
  viewedAt: string | null;
  generatedAt: string;
}

// ---------------------------------------------------------------------------
// Employee salary data
// ---------------------------------------------------------------------------

const employeeSalaryData: PayslipEmployee[] = [
  {
    id: "1",
    name: "Johannes Shikongo",
    employeeNumber: "EMP-001",
    department: "Operations",
    jobTitle: "Senior Technician",
    bankName: "First National Bank",
    bankAccount: "****4521",
    taxNumber: "NAM-TX-890123",
    socialSecurityNo: "SSC-001-8901",
    basicSalary: 18500,
    allowances: { housing: 3000, transport: 1500, medical: 800, overtime: 2200 },
    deductions: { paye: 3850, socialSecurity: 81, medicalAid: 1200, pension: 1850, unionFees: 50 },
  },
  {
    id: "2",
    name: "Maria Nekongo",
    employeeNumber: "EMP-002",
    department: "Finance",
    jobTitle: "Financial Controller",
    bankName: "Bank Windhoek",
    bankAccount: "****7832",
    taxNumber: "NAM-TX-890456",
    socialSecurityNo: "SSC-002-8902",
    basicSalary: 28000,
    allowances: { housing: 4500, transport: 2000, medical: 1200, overtime: 0 },
    deductions: { paye: 7200, socialSecurity: 81, medicalAid: 1800, pension: 2800, unionFees: 0 },
  },
  {
    id: "3",
    name: "Petrus Amupanda",
    employeeNumber: "EMP-003",
    department: "Operations",
    jobTitle: "Technician",
    bankName: "Standard Bank",
    bankAccount: "****3190",
    taxNumber: "NAM-TX-890789",
    socialSecurityNo: "SSC-003-8903",
    basicSalary: 14000,
    allowances: { housing: 2500, transport: 1200, medical: 800, overtime: 1800 },
    deductions: { paye: 2650, socialSecurity: 81, medicalAid: 1200, pension: 1400, unionFees: 50 },
  },
  {
    id: "4",
    name: "Selma Iipumbu",
    employeeNumber: "EMP-004",
    department: "Human Resources",
    jobTitle: "HR Manager",
    bankName: "Nedbank Namibia",
    bankAccount: "****6478",
    taxNumber: "NAM-TX-891012",
    socialSecurityNo: "SSC-004-8904",
    basicSalary: 25000,
    allowances: { housing: 4000, transport: 1800, medical: 1200, overtime: 0 },
    deductions: { paye: 6100, socialSecurity: 81, medicalAid: 1800, pension: 2500, unionFees: 0 },
  },
  {
    id: "5",
    name: "Fillipus Hamutenya",
    employeeNumber: "EMP-005",
    department: "Operations",
    jobTitle: "Junior Technician",
    bankName: "First National Bank",
    bankAccount: "****2901",
    taxNumber: "NAM-TX-891345",
    socialSecurityNo: "SSC-005-8905",
    basicSalary: 9500,
    allowances: { housing: 1500, transport: 800, medical: 600, overtime: 1200 },
    deductions: { paye: 1250, socialSecurity: 81, medicalAid: 900, pension: 950, unionFees: 50 },
  },
  {
    id: "6",
    name: "Ndapewa Kashela",
    employeeNumber: "EMP-006",
    department: "Sales",
    jobTitle: "Account Manager",
    bankName: "Bank Windhoek",
    bankAccount: "****8745",
    taxNumber: "NAM-TX-891678",
    socialSecurityNo: "SSC-006-8906",
    basicSalary: 20000,
    allowances: { housing: 3500, transport: 1500, medical: 1000, overtime: 0 },
    deductions: { paye: 4400, socialSecurity: 81, medicalAid: 1500, pension: 2000, unionFees: 0 },
  },
  {
    id: "7",
    name: "Tomas Nghidinwa",
    employeeNumber: "EMP-007",
    department: "IT",
    jobTitle: "Systems Administrator",
    bankName: "Standard Bank",
    bankAccount: "****5612",
    taxNumber: "NAM-TX-891901",
    socialSecurityNo: "SSC-007-8907",
    basicSalary: 16000,
    allowances: { housing: 2800, transport: 1200, medical: 800, overtime: 600 },
    deductions: { paye: 3100, socialSecurity: 81, medicalAid: 1200, pension: 1600, unionFees: 0 },
  },
  {
    id: "8",
    name: "Loini Kapinga",
    employeeNumber: "EMP-008",
    department: "Operations",
    jobTitle: "Fleet Coordinator",
    bankName: "Nedbank Namibia",
    bankAccount: "****9034",
    taxNumber: "NAM-TX-892234",
    socialSecurityNo: "SSC-008-8908",
    basicSalary: 12000,
    allowances: { housing: 2000, transport: 1000, medical: 600, overtime: 800 },
    deductions: { paye: 1950, socialSecurity: 81, medicalAid: 900, pension: 1200, unionFees: 50 },
  },
];

// ---------------------------------------------------------------------------
// Pre-generated payslips (historical data)
// ---------------------------------------------------------------------------

function computePayslip(emp: PayslipEmployee): {
  grossPay: number;
  totalAllowances: number;
  totalDeductions: number;
  netPay: number;
} {
  const totalAllowances =
    emp.allowances.housing +
    emp.allowances.transport +
    emp.allowances.medical +
    emp.allowances.overtime;
  const grossPay = emp.basicSalary + totalAllowances;
  const totalDeductions =
    emp.deductions.paye +
    emp.deductions.socialSecurity +
    emp.deductions.medicalAid +
    emp.deductions.pension +
    emp.deductions.unionFees;
  const netPay = grossPay - totalDeductions;
  return { grossPay, totalAllowances, totalDeductions, netPay };
}

function generatePayslipNumber(month: number, year: number, index: number): string {
  const m = String(month).padStart(2, "0");
  const y = String(year).slice(-2);
  const seq = String(index + 1).padStart(3, "0");
  return `PS-${y}${m}-${seq}`;
}

const months = [
  { label: "January 2026", payDate: "2026-01-25", month: 1, year: 2026 },
  { label: "February 2026", payDate: "2026-02-25", month: 2, year: 2026 },
];

const historicalPayslips: Payslip[] = [];
months.forEach((period) => {
  employeeSalaryData.forEach((emp, idx) => {
    const calc = computePayslip(emp);
    historicalPayslips.push({
      id: `ps-${period.month}-${emp.id}`,
      payslipNumber: generatePayslipNumber(period.month, period.year, idx),
      employeeId: emp.id,
      employee: emp,
      payPeriod: period.label,
      payDate: period.payDate,
      ...calc,
      status: "SENT",
      sentAt: period.payDate + "T08:00:00",
      viewedAt: period.payDate + "T10:30:00",
      generatedAt: period.payDate + "T07:00:00",
    });
  });
});

// ---------------------------------------------------------------------------
// Payslip store
// ---------------------------------------------------------------------------

let payslips: Payslip[] = [...historicalPayslips];
let _listeners: (() => void)[] = [];

function notify() {
  _listeners.forEach((fn) => fn());
}

export function subscribeToPayslips(listener: () => void): () => void {
  _listeners.push(listener);
  return () => {
    _listeners = _listeners.filter((fn) => fn !== listener);
  };
}

export function getAllPayslips(): Payslip[] {
  return [...payslips].sort(
    (a, b) =>
      new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
  );
}

export function getPayslipsForPeriod(period: string): Payslip[] {
  return payslips.filter((p) => p.payPeriod === period);
}

export function getPayslipsForEmployee(employeeId: string): Payslip[] {
  return payslips
    .filter((p) => p.employeeId === employeeId)
    .sort(
      (a, b) =>
        new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
    );
}

export function getAvailablePeriods(): string[] {
  const periods = [...new Set(payslips.map((p) => p.payPeriod))];
  return periods.sort().reverse();
}

export function getEmployeeSalaryData(): PayslipEmployee[] {
  return [...employeeSalaryData];
}

export function generateMonthlyPayslips(
  month: number,
  year: number
): Payslip[] {
  const periodLabel = `${["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][month - 1]} ${year}`;

  // Check if payslips already exist for this period
  const existing = payslips.filter((p) => p.payPeriod === periodLabel);
  if (existing.length > 0) return existing;

  const payDate = `${year}-${String(month).padStart(2, "0")}-25`;
  const now = new Date().toISOString();

  const newPayslips: Payslip[] = employeeSalaryData.map((emp, idx) => {
    const calc = computePayslip(emp);
    return {
      id: `ps-${month}-${year}-${emp.id}`,
      payslipNumber: generatePayslipNumber(month, year, idx),
      employeeId: emp.id,
      employee: emp,
      payPeriod: periodLabel,
      payDate,
      ...calc,
      status: "GENERATED" as const,
      sentAt: null,
      viewedAt: null,
      generatedAt: now,
    };
  });

  payslips = [...payslips, ...newPayslips];
  notify();
  return newPayslips;
}

export function sendPayslip(payslipId: string): void {
  payslips = payslips.map((p) =>
    p.id === payslipId
      ? { ...p, status: "SENT" as const, sentAt: new Date().toISOString() }
      : p
  );
  notify();
}

export function sendAllPayslipsForPeriod(period: string): number {
  let count = 0;
  const now = new Date().toISOString();
  payslips = payslips.map((p) => {
    if (p.payPeriod === period && (p.status === "GENERATED" || p.status === "DRAFT")) {
      count++;
      return { ...p, status: "SENT" as const, sentAt: now };
    }
    return p;
  });
  notify();
  return count;
}

export function getTotalPayroll(period: string): {
  totalGross: number;
  totalNet: number;
  totalDeductions: number;
  totalTax: number;
  employeeCount: number;
} {
  const periodPayslips = payslips.filter((p) => p.payPeriod === period);
  return {
    totalGross: periodPayslips.reduce((s, p) => s + p.grossPay, 0),
    totalNet: periodPayslips.reduce((s, p) => s + p.netPay, 0),
    totalDeductions: periodPayslips.reduce((s, p) => s + p.totalDeductions, 0),
    totalTax: periodPayslips.reduce(
      (s, p) => s + p.employee.deductions.paye,
      0
    ),
    employeeCount: periodPayslips.length,
  };
}
