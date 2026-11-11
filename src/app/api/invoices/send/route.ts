import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";
import { invoiceEmailHtml, invoiceSubject } from "@/lib/invoice-email";

// POST /api/invoices/send
// Body: { invoiceId: string }
// Emails the invoice to the customer and marks it SENT. Server-side so the
// email API key is never exposed to the browser.
export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Finance actions are restricted to MANAGER/ADMIN.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "ADMIN" && profile?.role !== "MANAGER") {
    return NextResponse.json(
      { error: "You are not permitted to send invoices." },
      { status: 403 }
    );
  }

  let body: { invoiceId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!body.invoiceId) {
    return NextResponse.json({ error: "invoiceId is required" }, { status: 400 });
  }

  const { data: invoice, error: invErr } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", body.invoiceId)
    .single();
  if (invErr || !invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const [{ data: items }, { data: customer }, { data: settings }] =
    await Promise.all([
      supabase.from("invoice_items").select("*").eq("invoice_id", invoice.id),
      supabase
        .from("customers")
        .select("name, email")
        .eq("id", invoice.customer_id)
        .single(),
      supabase
        .from("company_settings")
        .select("company_name")
        .eq("id", "default")
        .maybeSingle(),
    ]);

  const email = customer?.email ?? null;
  if (!email) {
    return NextResponse.json(
      { error: "This customer has no email on file." },
      { status: 400 }
    );
  }

  const companyName = settings?.company_name ?? undefined;

  try {
    await sendEmail({
      to: email,
      subject: invoiceSubject(invoice, companyName),
      htmlContent: invoiceEmailHtml(invoice, items ?? [], {
        companyName,
        customerName: customer?.name ?? undefined,
      }),
    });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message || "Failed to send email" },
      { status: 502 }
    );
  }

  const { error: updErr } = await supabase
    .from("invoices")
    .update({
      status: "SENT",
      issued_date: invoice.issued_date ?? new Date().toISOString(),
    })
    .eq("id", invoice.id);
  if (updErr) {
    return NextResponse.json(
      { error: "Email sent, but updating the invoice failed. Please retry." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, email });
}
