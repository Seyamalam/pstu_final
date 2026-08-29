import { describe, expect, it } from "vitest";

import {
  isRelayAuthorized,
  parseAuthEmailPayload,
  parseSmtpConfig,
  renderAuthEmail,
} from "../src/lib/auth-email-relay";

const payload = {
  to: "person@example.com",
  subject: "Reset your password",
  preview: "Reset your password",
  actionLabel: "Reset password",
  actionUrl: "https://wallet.example.com/reset-password?token=secret",
};

describe("auth email relay", () => {
  it("accepts the fixed payload schema", () => {
    expect(parseAuthEmailPayload(payload)).toEqual(payload);
    expect(parseAuthEmailPayload({ ...payload, extra: true })).toBeNull();
  });

  it("rejects unsafe recipients, headers, and links", () => {
    expect(
      parseAuthEmailPayload({ ...payload, to: "not-an-email" }),
    ).toBeNull();
    expect(
      parseAuthEmailPayload({
        ...payload,
        subject: "Hello\nBcc: x@example.com",
      }),
    ).toBeNull();
    expect(
      parseAuthEmailPayload({ ...payload, actionUrl: "javascript:alert(1)" }),
    ).toBeNull();
    expect(
      parseAuthEmailPayload({
        ...payload,
        actionUrl: "http://wallet.example.com/reset",
      }),
    ).toBeNull();
  });

  it("requires a strong exact bearer secret", () => {
    const secret = "a".repeat(32);
    expect(isRelayAuthorized(`Bearer ${secret}`, secret)).toBe(true);
    expect(isRelayAuthorized(`Bearer ${"b".repeat(32)}`, secret)).toBe(false);
    expect(isRelayAuthorized(`Basic ${secret}`, secret)).toBe(false);
    expect(isRelayAuthorized(`Bearer short`, "short")).toBe(false);
  });

  it("validates the Brevo SMTP configuration", () => {
    const config = {
      BREVO_SMTP_HOST: "smtp-relay.brevo.com",
      BREVO_SMTP_PORT: "587",
      BREVO_SMTP_USER: "relay-user@example.com",
      BREVO_SMTP_PASSWORD: "smtp-key",
      AUTH_EMAIL_FROM: "SheshHisab <wallet@example.com>",
    };
    expect(parseSmtpConfig(config)).toEqual({
      host: "smtp-relay.brevo.com",
      port: 587,
      user: "relay-user@example.com",
      password: "smtp-key",
      from: "SheshHisab <wallet@example.com>",
    });
    expect(parseSmtpConfig({ ...config, BREVO_SMTP_PORT: "70000" })).toBeNull();
    expect(
      parseSmtpConfig({ ...config, AUTH_EMAIL_FROM: "bad sender" }),
    ).toBeNull();
  });

  it("escapes user-visible fields in HTML", () => {
    const rendered = renderAuthEmail({
      ...payload,
      preview: "Reset <now>",
      actionLabel: 'Reset "now"',
    });
    expect(rendered.html).toContain("Reset &lt;now&gt;");
    expect(rendered.html).toContain("Reset &quot;now&quot;");
    expect(rendered.html).not.toContain("Reset <now>");
  });
});
