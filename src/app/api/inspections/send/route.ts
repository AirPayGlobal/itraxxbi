import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";
import {
  inspectionEmailHtml,
  inspectionSubject,
} from "@/lib/inspection-email";

// POST /api/inspections/send
// Body: { inspectionId: string, clientEmail?: string }
// Approves an inspection and emails the report to the client. Runs
// server-side so the email API key is never exposed to the browser.
export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Only Office Administrators / managers / admins may approve & send.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, job_title")
    .eq("id", user.id)
    .single();
  const canReview =
    profile?.role === "ADMIN" ||
    profile?.role === "MANAGER" ||
    (profile?.job_title ?? "").toLowerCase().includes("office admin");
  if (!canReview) {
    return NextResponse.json(
      { error: "You are not permitted to approve inspections." },
      { status: 403 }
    );
  }

  let body: { inspectionId?: string; clientEmail?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const { inspectionId, clientEmail } = body;
  if (!inspectionId) {
    return NextResponse.json(
      { error: "inspectionId is required" },
      { status: 400 }
    );
  }

  const { data: inspection, error: fetchError } = await supabase
    .from("vehicle_inspections")
    .select("*")
    .eq("id", inspectionId)
    .single();
  if (fetchError || !inspection) {
    return NextResponse.json(
      { error: "Inspection not found" },
      { status: 404 }
    );
  }

  // Resolve the client email: explicit override, then stored, then customer.
  let email = clientEmail?.trim() || inspection.client_email || null;
  if (!email && inspection.customer_id) {
    const { data: customer } = await supabase
      .from("customers")
      .select("email")
      .eq("id", inspection.customer_id)
      .single();
    email = customer?.email ?? null;
  }
  if (!email) {
    return NextResponse.json(
      { error: "No client email on file — provide one to send the report." },
      { status: 400 }
    );
  }

  // Company name for the email header (best effort).
  const { data: settings } = await supabase
    .from("company_settings")
    .select("company_name")
    .eq("id", "default")
    .maybeSingle();

  // Send the email first; only record the dispatch if delivery succeeds.
  try {
    await sendEmail({
      to: email,
      subject: inspectionSubject(inspection),
      htmlContent: inspectionEmailHtml(inspection, {
        companyName: settings?.company_name ?? undefined,
      }),
    });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message || "Failed to send email" },
      { status: 502 }
    );
  }

  const now = new Date().toISOString();
  const { data: updated, error: updateError } = await supabase
    .from("vehicle_inspections")
    .update({
      status: "APPROVED",
      approved_by_id: user.id,
      approved_at: now,
      sent_to_client_at: now,
      client_email: email,
    })
    .eq("id", inspectionId)
    .select()
    .single();
  if (updateError) {
    // Email went out but the status update failed — surface it.
    return NextResponse.json(
      { error: "Email sent, but saving the status failed. Please retry." },
      { status: 500 }
    );
  }

  // Notify the technician that it was approved & sent.
  if (updated.created_by_id) {
    await supabase.from("notifications").insert({
      user_id: updated.created_by_id,
      title: "Inspection approved & sent to client",
      message: `Your inspection for ${
        updated.reg_number || updated.client_name || "a vehicle"
      } was approved and emailed to ${email}.`,
      type: "JOB",
      channel: "APP",
      is_read: false,
      link: "/inspections",
    });
  }

  return NextResponse.json({ ok: true, email });
}
