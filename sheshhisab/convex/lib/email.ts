import { fail } from "./errors";

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    };
    return entities[character] ?? character;
  });
}

export async function sendAuthEmail(input: {
  to: string;
  subject: string;
  preview: string;
  actionLabel: string;
  actionUrl: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.AUTH_EMAIL_FROM;
  if (!apiKey || !from) {
    fail("EMAIL_UNAVAILABLE", "Email delivery is not configured.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      text: `${input.preview}: ${input.actionUrl}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:32px"><h1 style="font-size:24px">${escapeHtml(input.preview)}</h1><p><a href="${escapeHtml(input.actionUrl)}" style="display:inline-block;padding:12px 18px;border-radius:12px;background:#087a55;color:#fff;text-decoration:none">${escapeHtml(input.actionLabel)}</a></p><p style="color:#607077;font-size:13px">This link expires soon. Ignore this email if you did not request it.</p></div>`,
    }),
  });
  if (!response.ok) {
    fail("EMAIL_UNAVAILABLE", "Email delivery is temporarily unavailable.");
  }
}
