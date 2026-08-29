import { env } from "../_generated/server";
import { fail } from "./errors";

function validRelayUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

export async function sendAuthEmail(input: {
  to: string;
  subject: string;
  preview: string;
  actionLabel: string;
  actionUrl: string;
}) {
  const relayUrl = env.AUTH_EMAIL_RELAY_URL;
  const relaySecret = env.AUTH_EMAIL_RELAY_SECRET;
  if (
    !relayUrl ||
    !validRelayUrl(relayUrl) ||
    !relaySecret ||
    relaySecret.length < 32
  ) {
    fail("EMAIL_UNAVAILABLE", "Email delivery is not configured.");
  }

  let response: Response;
  try {
    response = await fetch(relayUrl, {
      method: "POST",
      redirect: "error",
      headers: {
        Authorization: `Bearer ${relaySecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });
  } catch {
    fail("EMAIL_UNAVAILABLE", "Email delivery is temporarily unavailable.");
  }
  if (!response.ok) {
    fail("EMAIL_UNAVAILABLE", "Email delivery is temporarily unavailable.");
  }
}
