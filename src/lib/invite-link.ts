"use client";

import { toast } from "sonner";

/** Fetches someone's Clerk invitation link and copies it, for sending by WhatsApp or your own email. */
export async function copyInviteLink(email: string) {
  const res = await fetch(`/api/team/invite-link?email=${encodeURIComponent(email)}`);
  const json = await res.json().catch(() => ({ ok: false, error: "The server didn't respond." }));
  if (!json.ok) {
    toast.error(json.error ?? "Couldn't get the invitation link.");
    return;
  }
  try {
    await navigator.clipboard.writeText(json.url);
    toast.success(`Invitation link for ${email} copied. Send it to them by WhatsApp or email; it signs them up with this address.`);
  } catch {
    window.prompt(`Copy the invitation link for ${email}:`, json.url);
  }
}
