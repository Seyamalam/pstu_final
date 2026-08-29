import { createHash, timingSafeEqual } from "node:crypto";

export const MAX_AUTH_EMAIL_BODY_BYTES = 8_192;

export type AuthEmailPayload = {
  to: string;
  subject: string;
  preview: string;
  actionLabel: string;
  actionUrl: string;
};

export type SmtpConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  from: string;
};

const PAYLOAD_KEYS = [
  "actionLabel",
  "actionUrl",
  "preview",
  "subject",
  "to",
] as const;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function boundedLine(value: unknown, maxLength: number): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= maxLength &&
    !/[\r\n\0]/.test(value)
  );
}

function validMailbox(value: string): boolean {
  return value.length <= 254 && /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(value);
}

function validFrom(value: string): boolean {
  if (!boundedLine(value, 320)) return false;
  const displayMatch = value.match(/^[^<>]{1,64}<([^<>]+)>$/);
  return validMailbox(displayMatch?.[1]?.trim() ?? value);
}

function validActionUrl(value: string): boolean {
  if (value.length > 2_048) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function parseAuthEmailPayload(value: unknown): AuthEmailPayload | null {
  if (!isPlainObject(value)) return null;
  const keys = Object.keys(value).sort();
  if (
    keys.length !== PAYLOAD_KEYS.length ||
    keys.some((key, index) => key !== PAYLOAD_KEYS[index])
  ) {
    return null;
  }
  if (
    !boundedLine(value.to, 254) ||
    !validMailbox(value.to) ||
    !boundedLine(value.subject, 140) ||
    !boundedLine(value.preview, 160) ||
    !boundedLine(value.actionLabel, 48) ||
    typeof value.actionUrl !== "string" ||
    !validActionUrl(value.actionUrl)
  ) {
    return null;
  }
  return {
    to: value.to,
    subject: value.subject,
    preview: value.preview,
    actionLabel: value.actionLabel,
    actionUrl: value.actionUrl,
  };
}

export function parseSmtpConfig(
  values: Record<string, string | undefined>,
): SmtpConfig | null {
  const host = values.BREVO_SMTP_HOST;
  const port = Number(values.BREVO_SMTP_PORT);
  const user = values.BREVO_SMTP_USER;
  const password = values.BREVO_SMTP_PASSWORD;
  const from = values.AUTH_EMAIL_FROM;
  if (
    !host ||
    host.length > 253 ||
    !/^[a-z0-9.-]+$/i.test(host) ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65_535 ||
    !boundedLine(user, 320) ||
    !password ||
    password.length > 1_024 ||
    !from ||
    !validFrom(from)
  ) {
    return null;
  }
  return { host, port, user, password, from };
}

export function isRelayAuthorized(
  authorization: string | null,
  expectedSecret: string | undefined,
): boolean {
  if (!expectedSecret || expectedSecret.length < 32 || !authorization) {
    return false;
  }
  const match = authorization.match(/^Bearer ([^\s]+)$/);
  if (!match) return false;
  const supplied = createHash("sha256").update(match[1]).digest();
  const expected = createHash("sha256").update(expectedSecret).digest();
  return timingSafeEqual(supplied, expected);
}

function escapeHtml(value: string): string {
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

export function renderAuthEmail(payload: AuthEmailPayload): {
  text: string;
  html: string;
} {
  return {
    text: `${payload.preview}: ${payload.actionUrl}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:32px"><h1 style="font-size:24px">${escapeHtml(payload.preview)}</h1><p><a href="${escapeHtml(payload.actionUrl)}" style="display:inline-block;padding:12px 18px;border-radius:12px;background:#087a55;color:#fff;text-decoration:none">${escapeHtml(payload.actionLabel)}</a></p><p style="color:#607077;font-size:13px">This link expires soon. Ignore this email if you did not request it.</p></div>`,
  };
}
