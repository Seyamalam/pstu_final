import nodemailer from "nodemailer";

import {
  isRelayAuthorized,
  MAX_AUTH_EMAIL_BODY_BYTES,
  parseAuthEmailPayload,
  parseSmtpConfig,
  renderAuthEmail,
} from "@/lib/auth-email-relay";

function jsonError(message: string, status: number) {
  return Response.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  if (
    !isRelayAuthorized(
      request.headers.get("authorization"),
      process.env.AUTH_EMAIL_RELAY_SECRET,
    )
  ) {
    return jsonError("Unauthorized.", 401);
  }

  const contentType = request.headers.get("content-type") ?? "";
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (
    !contentType.toLowerCase().startsWith("application/json") ||
    !Number.isFinite(contentLength) ||
    contentLength > MAX_AUTH_EMAIL_BODY_BYTES
  ) {
    return jsonError("Invalid request.", 400);
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return jsonError("Invalid request.", 400);
  }
  if (
    new TextEncoder().encode(rawBody).byteLength > MAX_AUTH_EMAIL_BODY_BYTES
  ) {
    return jsonError("Invalid request.", 400);
  }

  let decoded: unknown;
  try {
    decoded = JSON.parse(rawBody);
  } catch {
    return jsonError("Invalid request.", 400);
  }
  const payload = parseAuthEmailPayload(decoded);
  if (!payload) return jsonError("Invalid request.", 400);

  const smtp = parseSmtpConfig(process.env);
  if (!smtp) return jsonError("Email delivery is unavailable.", 503);

  const transport = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === 465,
    requireTLS: smtp.port !== 465,
    auth: { user: smtp.user, pass: smtp.password },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
    tls: { minVersion: "TLSv1.2", servername: smtp.host },
  });
  const content = renderAuthEmail(payload);
  try {
    await transport.sendMail({
      from: smtp.from,
      to: payload.to,
      subject: payload.subject,
      text: content.text,
      html: content.html,
      disableFileAccess: true,
      disableUrlAccess: true,
    });
  } catch {
    return jsonError("Email delivery is unavailable.", 503);
  } finally {
    transport.close();
  }

  return Response.json(
    { ok: true },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}
