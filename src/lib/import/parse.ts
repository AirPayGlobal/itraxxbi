// Reads CSV and Excel files in the browser and turns them into rows of strings keyed by header.
// Also holds the parsers that turn spreadsheet cells into numbers and dates.
import Papa from "papaparse";

export type SheetRow = Record<string, string>;
export type ParsedSheet = { headers: string[]; rows: SheetRow[] };

export const ACCEPTED_FILES = ".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function cellToString(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return isNaN(v.getTime()) ? "" : v.toISOString().slice(0, 10);
  return String(v).trim();
}

/** Some exports put a title or blank lines above the real header row; use the first row with 2+ filled cells. */
function toSheet(matrix: unknown[][]): ParsedSheet {
  const cleaned = matrix.map((r) => r.map(cellToString));
  const headerIdx = cleaned.findIndex((r) => r.filter(Boolean).length >= 2);
  if (headerIdx < 0) return { headers: [], rows: [] };
  const rawHeaders = cleaned[headerIdx];
  const seen = new Map<string, number>();
  const headers = rawHeaders.map((h, i) => {
    const base = h || `Column ${i + 1}`;
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return n > 1 ? `${base} (${n})` : base;
  });
  const rows = cleaned
    .slice(headerIdx + 1)
    .filter((r) => r.some(Boolean))
    .map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ""])));
  return { headers, rows };
}

export async function parseSpreadsheet(file: File): Promise<ParsedSheet> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".xlsx")) {
    const { default: readXlsxFile } = await import("read-excel-file");
    const matrix = await readXlsxFile(file);
    return toSheet(matrix as unknown[][]);
  }
  if (name.endsWith(".xls")) {
    throw new Error("Old .xls files aren't supported. Save the file as .xlsx or .csv and try again.");
  }
  const text = await file.text();
  const result = Papa.parse<string[]>(text, { skipEmptyLines: "greedy" });
  if (result.errors.length && !result.data.length) throw new Error(result.errors[0].message);
  return toSheet(result.data);
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Picks the sheet column that best matches a field, by exact or partial alias match. */
export function guessColumn(headers: string[], aliases: string[]): string | null {
  const wanted = aliases.map(norm);
  const byNorm = headers.map((h) => [h, norm(h)] as const);
  for (const w of wanted) {
    const hit = byNorm.find(([, n]) => n === w);
    if (hit) return hit[0];
  }
  for (const w of wanted) {
    const hit = byNorm.find(([, n]) => n.length > 2 && (n.includes(w) || w.includes(n)));
    if (hit) return hit[0];
  }
  return null;
}

/** "N$ 1 234,50", "(1,234.50)", "1234.5-", "R1,000" → number. Empty → null. */
export function parseAmount(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  let s = raw.trim();
  if (!s || s === "-") return null;
  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  if (s.endsWith("-")) {
    negative = true;
    s = s.slice(0, -1);
  }
  if (s.startsWith("-")) {
    negative = !negative;
    s = s.slice(1);
  }
  s = s.replace(/[^0-9.,]/g, "");
  // "1.234,56" or "1 234,56" (comma decimal) vs "1,234.56"
  if (/,\d{1,2}$/.test(s) && !/\.\d{1,2}$/.test(s)) s = s.replace(/\./g, "").replace(",", ".");
  else s = s.replace(/,/g, "");
  if (!s) return null;
  const n = Number(s);
  if (!isFinite(n)) return null;
  return negative ? -n : n;
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

/** Accepts 2026-11-13, 13/11/2026, 13-11-2026, 13 Nov 2026, Nov 13 2026, Excel serials. Day-first for slashes. */
export function parseDate(raw: string | undefined): string | null {
  if (!raw) return null;
  const s = raw.trim();
  if (!s) return null;
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  const pad = (n: number) => String(n).padStart(2, "0");
  const build = (y: number, m: number, d: number) => {
    if (y < 100) y += 2000;
    const dt = new Date(Date.UTC(y, m - 1, d));
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d ? `${y}-${pad(m)}-${pad(d)}` : null;
  };
  if (iso) return build(+iso[1], +iso[2], +iso[3]);
  const dmy = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (dmy) return build(+dmy[3], +dmy[2], +dmy[1]);
  const dMonY = s.match(/^(\d{1,2})[\s-]+([A-Za-z]{3,})[\s,-]+(\d{2,4})$/);
  if (dMonY) {
    const m = MONTHS[dMonY[2].slice(0, 3).toLowerCase()];
    if (m) return build(+dMonY[3], m, +dMonY[1]);
  }
  const monDY = s.match(/^([A-Za-z]{3,})\s+(\d{1,2}),?\s+(\d{2,4})$/);
  if (monDY && MONTHS[monDY[1].slice(0, 3).toLowerCase()]) return build(+monDY[3], MONTHS[monDY[1].slice(0, 3).toLowerCase()], +monDY[2]);
  if (/^\d{5}$/.test(s)) {
    const d = new Date(Date.UTC(1899, 11, 30) + Number(s) * 86400000);
    return d.toISOString().slice(0, 10);
  }
  return null;
}

/** "2026-11", "Nov 2026", "November 2026", "11/2026", a full date → "YYYY-MM". */
export function parsePeriod(raw: string | undefined): string | null {
  if (!raw) return null;
  const s = raw.trim();
  const ym = s.match(/^(\d{4})[-/](\d{1,2})$/);
  if (ym) return `${ym[1]}-${ym[2].padStart(2, "0")}`;
  const my = s.match(/^(\d{1,2})[-/](\d{4})$/);
  if (my) return `${my[2]}-${my[1].padStart(2, "0")}`;
  const named = s.match(/^([A-Za-z]{3,})[\s-]+(\d{4})$/);
  if (named && MONTHS[named[1].slice(0, 3).toLowerCase()]) return `${named[2]}-${String(MONTHS[named[1].slice(0, 3).toLowerCase()]).padStart(2, "0")}`;
  const d = parseDate(s);
  return d ? d.slice(0, 7) : null;
}

export function toCsv(headers: string[], rows: (string | number)[][]): string {
  return Papa.unparse({ fields: headers, data: rows });
}

export function downloadText(fileName: string, text: string, type = "text/csv") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
