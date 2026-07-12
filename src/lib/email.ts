import "server-only";

// TransactMail client. Server-side only — the API key must never reach the
// browser. Configure via env: TRANSACTMAIL_API_KEY (required),
// TRANSACTMAIL_BASE_URL, TRANSACTMAIL_SENDER.

const BASE_URL =
  process.env.TRANSACTMAIL_BASE_URL ??
  "https://email-service.airpayglobal.com/v1";

export type SendEmailInput = {
  to: string;
  subject: string;
  htmlContent: string;
  senderEmail?: string;
};

export async function sendEmail({
  to,
  subject,
  htmlContent,
  senderEmail,
}: SendEmailInput): Promise<void> {
  const apiKey = process.env.TRANSACTMAIL_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Email is not configured (TRANSACTMAIL_API_KEY is not set)."
    );
  }
  const sender =
    senderEmail ?? process.env.TRANSACTMAIL_SENDER ?? "no-reply@airpayglobal.com";

  const res = await fetch(`${BASE_URL}/emails/send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to,
      subject,
      htmlContent,
      senderEmail: sender,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Email provider returned ${res.status}${detail ? `: ${detail.slice(0, 300)}` : ""}`
    );
  }
}
