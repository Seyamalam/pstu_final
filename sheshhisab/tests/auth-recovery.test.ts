import { describe, expect, it } from "vitest";

import {
  normalizeRecoveryEmail,
  validateNewPassword,
  validResetToken,
} from "../src/lib/auth-recovery";

describe("auth recovery validation", () => {
  it("normalizes valid email without accepting malformed input", () => {
    expect(normalizeRecoveryEmail(" Person@Example.COM ")).toBe(
      "person@example.com",
    );
    expect(normalizeRecoveryEmail("person@example")).toBeNull();
  });

  it("validates password length and confirmation", () => {
    expect(validateNewPassword("short", "short")).toBe(
      "Use at least 8 characters.",
    );
    expect(validateNewPassword("long-enough", "different")).toBe(
      "Passwords do not match.",
    );
    expect(validateNewPassword("long-enough", "long-enough")).toBeNull();
  });

  it("bounds reset tokens before sending them to auth", () => {
    expect(validResetToken("short")).toBe(false);
    expect(validResetToken("a".repeat(32))).toBe(true);
    expect(validResetToken("a".repeat(4097))).toBe(false);
  });
});
