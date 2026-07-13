import type {
  InvoiceRow,
  InvoiceItemRow,
} from "@/lib/supabase/database.types";

function esc(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function money(n: number): string {
  return new Intl.NumberFormat("en-NA", {
    style: "currency",
    currency: "NAD",
    currencyDisplay: "narrowSymbol",
  }).format(n ?? 0);
}

function fmtDate(d: string | null): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-NA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(d));
}

export function invoiceSubject(invoice: InvoiceRow, companyName?: string): string {
  return `${companyName || "iTraxx BI"} — Invoice ${invoice.invoice_number}`;
}

export function invoiceEmailHtml(
  invoice: InvoiceRow,
  items: InvoiceItemRow[],
  opts: { companyName?: string; customerName?: string } = {}
): string {
  const company = opts.companyName || "iTraxx BI";

  const itemRows =
    items.length > 0
      ? items
          .map(
            (it) => `<tr>
              <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#0f172a;">${esc(
                it.description
              )}</td>
              <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;color:#334155;">${esc(
                it.quantity
              )}</td>
              <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;color:#334155;">${money(
                it.unit_price
              )}</td>
              <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;color:#0f172a;font-weight:600;">${money(
                it.total
              )}</td>
            </tr>`
          )
          .join("")
      : `<tr><td colspan="4" style="padding:8px 0;color:#94a3b8;">No line items.</td></tr>`;

  return `<!doctype html>
<html><body style="margin:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:640px;margin:0 auto;padding:24px;">
    <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:24px;">
      <div style="display:flex;justify-content:space-between;border-bottom:2px solid #2563eb;padding-bottom:12px;margin-bottom:16px;">
        <div>
          <h1 style="margin:0;font-size:20px;color:#0f172a;">${esc(company)}</h1>
          <p style="margin:4px 0 0;color:#64748b;font-size:14px;">Invoice</p>
        </div>
        <div style="text-align:right;">
          <p style="margin:0;font-size:16px;font-weight:700;color:#0f172a;">${esc(
            invoice.invoice_number
          )}</p>
          <p style="margin:4px 0 0;color:#64748b;font-size:13px;">${esc(
            invoice.status
          )}</p>
        </div>
      </div>

      <table style="font-size:14px;margin-bottom:8px;">
        <tr><td style="padding:2px 12px 2px 0;color:#64748b;">Billed to</td><td style="padding:2px 0;color:#0f172a;font-weight:600;">${esc(
          opts.customerName
        )}</td></tr>
        <tr><td style="padding:2px 12px 2px 0;color:#64748b;">Issued</td><td style="padding:2px 0;color:#0f172a;">${fmtDate(
          invoice.issued_date
        )}</td></tr>
        <tr><td style="padding:2px 12px 2px 0;color:#64748b;">Due</td><td style="padding:2px 0;color:#0f172a;">${fmtDate(
          invoice.due_date
        )}</td></tr>
      </table>

      <table style="width:100%;font-size:14px;margin-top:16px;border-collapse:collapse;">
        <thead>
          <tr style="color:#94a3b8;font-size:11px;text-transform:uppercase;text-align:left;">
            <th style="padding:6px 0;">Description</th>
            <th style="padding:6px 0;text-align:right;">Qty</th>
            <th style="padding:6px 0;text-align:right;">Unit</th>
            <th style="padding:6px 0;text-align:right;">Total</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>

      <table style="width:100%;font-size:14px;margin-top:16px;">
        <tr><td style="padding:2px 0;text-align:right;color:#64748b;">Subtotal</td><td style="padding:2px 0;width:120px;text-align:right;color:#0f172a;">${money(
          invoice.subtotal
        )}</td></tr>
        <tr><td style="padding:2px 0;text-align:right;color:#64748b;">Tax</td><td style="padding:2px 0;text-align:right;color:#0f172a;">${money(
          invoice.tax
        )}</td></tr>
        <tr><td style="padding:6px 0;text-align:right;font-weight:700;color:#0f172a;border-top:1px solid #e2e8f0;">Total</td><td style="padding:6px 0;text-align:right;font-weight:700;color:#2563eb;border-top:1px solid #e2e8f0;">${money(
          invoice.total
        )}</td></tr>
      </table>

      ${
        invoice.notes
          ? `<p style="margin:16px 0 0;font-size:13px;color:#64748b;white-space:pre-wrap;">${esc(
              invoice.notes
            )}</p>`
          : ""
      }

      <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;">
        Thank you for your business. Please reference ${esc(
          invoice.invoice_number
        )} with your payment.
      </p>
    </div>
  </div>
</body></html>`;
}
