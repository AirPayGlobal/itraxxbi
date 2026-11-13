"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { InvoiceStatus, PaymentMethod, PaymentRow } from "@/lib/supabase/database.types";

// Payments received. Bank-statement imports may not be matched to an invoice yet (invoice_id null).
const supabase = createClient();
const KEY = ["payments"] as const;
const INVOICES_KEY = ["invoices"] as const;
const PAGE = 1000;

export type Payment = PaymentRow;

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "BANK_TRANSFER", label: "Bank transfer" },
  { value: "CASH", label: "Cash" },
  { value: "CARD", label: "Card" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "MOBILE_PAYMENT", label: "Mobile payment" },
  { value: "OTHER", label: "Other" },
];
export const methodLabel = (m: PaymentMethod) => PAYMENT_METHODS.find((x) => x.value === m)?.label ?? m;

/** Free text from a statement ("EFT", "Cash deposit", "POS", "eWallet") → a payment method. Blank → bank transfer. */
export function parseMethod(raw: string): PaymentMethod {
  const s = raw.trim().toLowerCase();
  if (!s) return "BANK_TRANSFER";
  const exact = PAYMENT_METHODS.find((m) => m.value.toLowerCase() === s.replace(/[\s-]+/g, "_") || m.label.toLowerCase() === s);
  if (exact) return exact.value;
  if (/cheque|check|chq/.test(s)) return "CHEQUE";
  if (/cash/.test(s)) return "CASH";
  if (/card|pos|visa|master/.test(s)) return "CARD";
  if (/mobile|wallet|momo|mpesa|m-pesa|easy ?wallet|blue ?wallet|paytoday/.test(s)) return "MOBILE_PAYMENT";
  if (/eft|transfer|bank|deposit|rtgs|swift|internet|online/.test(s)) return "BANK_TRANSFER";
  return "OTHER";
}

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

export function usePayments() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<Payment[]> => {
      const rows = await fetchAll<Payment>((from, to) =>
        supabase
          .from("payments")
          .select("*")
          .order("paid_at", { ascending: false })
          .order("id")
          .range(from, to)
      );
      return rows.map((p) => ({ ...p, amount: Number(p.amount) || 0 }));
    },
  });
}

/** Invoice fields needed to match payments. */
export type MatchableInvoice = { id: string; invoice_number: string; customer_id: string; total: number; status: InvoiceStatus };

export async function loadMatchableInvoices(): Promise<MatchableInvoice[]> {
  const rows = await fetchAll<MatchableInvoice>((from, to) =>
    supabase.from("invoices").select("id, invoice_number, customer_id, total, status").order("id").range(from, to)
  );
  return rows.map((r) => ({ ...r, total: Number(r.total) || 0 }));
}

const alnum = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");

/**
 * Builds a matcher that finds the invoice whose number appears in an invoice-number cell or in the
 * reference/description text. Spacing and punctuation are ignored ("INV 2026 1234" finds INV-2026-1234).
 * The longest number wins; a tie between different invoices counts as no match.
 */
export function invoiceMatcher(invoices: MatchableInvoice[]) {
  const candidates = invoices
    .filter((i) => i.status !== "CANCELLED")
    .map((i) => ({ inv: i, key: alnum(i.invoice_number) }))
    .filter((c) => c.key.length >= 4)
    .sort((a, b) => b.key.length - a.key.length);
  const byKey = new Map(candidates.map((c) => [c.key, c.inv]));
  return (invoiceNumber: string, text: string): MatchableInvoice | null => {
    const direct = invoiceNumber ? byKey.get(alnum(invoiceNumber)) : undefined;
    if (direct) return direct;
    const hay = alnum(`${invoiceNumber} ${text}`);
    if (!hay) return null;
    const hits = candidates.filter((c) => hay.includes(c.key));
    if (!hits.length) return null;
    const best = hits.filter((h) => h.key.length === hits[0].key.length);
    return best.length === 1 ? best[0].inv : null;
  };
}

/** Same date, amount and reference → the same payment. */
export const paymentKey = (paidAt: string, amount: number, reference: string | null) =>
  `${paidAt.slice(0, 10)}|${Number(amount).toFixed(2)}|${(reference ?? "").trim().toLowerCase().replace(/\s+/g, " ")}`;

/** Keys of payments already recorded between two dates (inclusive), for duplicate detection. */
export async function loadExistingPaymentKeys(fromDate: string, toDate: string): Promise<Set<string>> {
  const rows = await fetchAll<{ paid_at: string; amount: number; reference: string | null }>((from, to) =>
    supabase
      .from("payments")
      .select("paid_at, amount, reference")
      .gte("paid_at", `${fromDate}T00:00:00`)
      .lte("paid_at", `${toDate}T23:59:59.999`)
      .order("id")
      .range(from, to)
  );
  return new Set(rows.map((r) => paymentKey(r.paid_at, r.amount, r.reference)));
}

export type InvoiceSyncResult = { paid: number; partial: number };

/**
 * Re-checks invoices against the payments recorded for them. Only SENT, OVERDUE and PARTIAL invoices
 * change: fully covered → PAID, partly covered → PARTIAL.
 */
export async function syncInvoiceStatuses(invoiceIds: string[]): Promise<InvoiceSyncResult> {
  const ids = [...new Set(invoiceIds)];
  const result: InvoiceSyncResult = { paid: 0, partial: 0 };
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200);
    const { data: invs, error } = await supabase
      .from("invoices")
      .select("id, total, status")
      .in("id", chunk)
      .in("status", ["SENT", "OVERDUE", "PARTIAL"]);
    if (error) throw error;
    if (!invs?.length) continue;
    const pays = await fetchAll<{ invoice_id: string | null; amount: number; paid_at: string }>((from, to) =>
      supabase
        .from("payments")
        .select("invoice_id, amount, paid_at")
        .in("invoice_id", invs.map((v) => v.id))
        .order("id")
        .range(from, to)
    );
    const sum = new Map<string, number>();
    const last = new Map<string, string>();
    for (const p of pays) {
      if (!p.invoice_id) continue;
      sum.set(p.invoice_id, (sum.get(p.invoice_id) ?? 0) + (Number(p.amount) || 0));
      if (!last.has(p.invoice_id) || p.paid_at > last.get(p.invoice_id)!) last.set(p.invoice_id, p.paid_at);
    }
    for (const inv of invs) {
      const paid = sum.get(inv.id) ?? 0;
      if (paid <= 0) continue;
      const covered = paid >= Number(inv.total) - 0.005;
      const status: InvoiceStatus = covered ? "PAID" : "PARTIAL";
      if (status === inv.status) continue;
      const { error: upErr } = await supabase
        .from("invoices")
        .update(covered ? { status, paid_date: last.get(inv.id) ?? new Date().toISOString() } : { status })
        .eq("id", inv.id);
      if (upErr) throw upErr;
      if (covered) result.paid++;
      else result.partial++;
    }
  }
  return result;
}

export type PaymentDraft = {
  paid_at: string;
  amount: number;
  reference: string | null;
  payer_name: string | null;
  method: PaymentMethod;
  invoice_id: string | null;
  customer_id: string | null;
  /** For display only; not saved. */
  invoice_number: string | null;
};

const statusNote = ({ paid, partial }: InvoiceSyncResult) => {
  const parts = [];
  if (paid) parts.push(`${paid} ${paid === 1 ? "invoice" : "invoices"} marked paid`);
  if (partial) parts.push(`${partial} part-paid`);
  return parts.length ? `. ${parts.join(", ")}` : "";
};

export function useImportPayments() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ records, file }: { records: PaymentDraft[]; file: File }): Promise<string> => {
      if (!records.length) throw new Error("No payments to import.");
      const note = `Imported from ${file.name}`;
      for (let i = 0; i < records.length; i += 500) {
        const chunk = records.slice(i, i + 500).map((r) => ({
          paid_at: r.paid_at,
          amount: r.amount,
          reference: r.reference,
          payer_name: r.payer_name,
          method: r.method,
          invoice_id: r.invoice_id,
          customer_id: r.customer_id,
          notes: note,
        }));
        const { error } = await supabase.from("payments").insert(chunk);
        if (error) {
          if (i > 0) throw new Error(`${error.message}. The first ${i} payments were saved; re-importing the file will skip them.`);
          throw error;
        }
      }
      const matchedIds = records.map((r) => r.invoice_id).filter((id): id is string => !!id);
      let sync: InvoiceSyncResult = { paid: 0, partial: 0 };
      let syncNote = "";
      try {
        sync = await syncInvoiceStatuses(matchedIds);
      } catch (e) {
        syncNote = `. Invoice statuses couldn't be updated: ${(e as Error).message}`;
      }
      const n = records.length;
      const matched = records.filter((r) => r.invoice_id).length;
      return `${n} ${n === 1 ? "payment" : "payments"} imported (${matched} matched to invoices)${statusNote(sync)}${syncNote}`;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: INVOICES_KEY });
    },
  });
}

/** Links a payment to an invoice (and its customer), then updates the invoice status. */
export function useMatchPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ paymentId, invoice }: { paymentId: string; invoice: { id: string; customer_id: string } }) => {
      const { error } = await supabase
        .from("payments")
        .update({ invoice_id: invoice.id, customer_id: invoice.customer_id })
        .eq("id", paymentId);
      if (error) throw error;
      return syncInvoiceStatuses([invoice.id]);
    },
    onSuccess: (sync) => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: INVOICES_KEY });
      toast.success(`Payment matched${statusNote(sync)}`);
    },
    onError: (e: Error) => toast.error(e.message || "Couldn't match the payment"),
  });
}

/** Removes the files attached to a payment (storage objects and their rows). Best effort. */
async function removeAttachedFiles(entityId: string) {
  const { data } = await supabase.from("record_files").select("id, path").eq("area", "payment").eq("entity_id", entityId);
  if (!data?.length) return;
  await supabase.storage.from("records").remove(data.map((f) => f.path));
  await supabase.from("record_files").delete().in("id", data.map((f) => f.id));
}

export function useDeletePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("payments").delete().eq("id", id);
      if (error) throw error;
      await removeAttachedFiles(id).catch(() => undefined);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("Payment deleted");
    },
    onError: (e: Error) => toast.error(e.message || "Couldn't delete the payment"),
  });
}
