import { describe, expect, it } from "vitest";
import {
  assertAmount,
  calculateTransferBalances,
  normalizeHandle,
  normalizeNote,
} from "../convex/lib/money";
import { assertRequestTransition } from "../convex/lib/requestState";

describe("money domain", () => {
  it("moves integer poisha without changing the total", () => {
    const before = BigInt(10_000_000) + BigInt(2_000_000);
    const result = calculateTransferBalances(
      BigInt(10_000_000),
      BigInt(2_000_000),
      BigInt(50_001),
    );

    expect(result.senderBalanceAfterPoisha).toBe(BigInt(9_949_999));
    expect(result.recipientBalanceAfterPoisha).toBe(BigInt(2_050_001));
    expect(
      result.senderBalanceAfterPoisha + result.recipientBalanceAfterPoisha,
    ).toBe(before);
  });

  it("rejects invalid or unaffordable amounts", () => {
    expect(() => assertAmount(BigInt(0))).toThrow();
    expect(() => assertAmount(BigInt(-1))).toThrow();
    expect(() =>
      calculateTransferBalances(BigInt(100), BigInt(0), BigInt(101)),
    ).toThrow();
    expect(() =>
      calculateTransferBalances(
        BigInt(100),
        BigInt("9223372036854775807"),
        BigInt(1),
      ),
    ).toThrow();
  });

  it("normalizes handles and optional notes", () => {
    expect(normalizeHandle(" @Alice_7 ")).toBe("alice_7");
    expect(normalizeNote("  lunch  ")).toBe("lunch");
    expect(normalizeNote("   ")).toBeUndefined();
  });
});

describe("money request state", () => {
  it("allows each terminal transition from pending", () => {
    expect(() => assertRequestTransition("pending", "paid")).not.toThrow();
    expect(() => assertRequestTransition("pending", "declined")).not.toThrow();
    expect(() => assertRequestTransition("pending", "cancelled")).not.toThrow();
  });

  it("does not change a terminal request", () => {
    expect(() => assertRequestTransition("paid", "declined")).toThrow();
    expect(() => assertRequestTransition("declined", "paid")).toThrow();
    expect(() => assertRequestTransition("cancelled", "paid")).toThrow();
  });
});
