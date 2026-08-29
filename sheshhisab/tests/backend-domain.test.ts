import assert from "node:assert/strict";
import { describe, it } from "node:test";
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

    assert.equal(result.senderBalanceAfterPoisha, BigInt(9_949_999));
    assert.equal(result.recipientBalanceAfterPoisha, BigInt(2_050_001));
    assert.equal(
      result.senderBalanceAfterPoisha + result.recipientBalanceAfterPoisha,
      before,
    );
  });

  it("rejects invalid or unaffordable amounts", () => {
    assert.throws(() => assertAmount(BigInt(0)));
    assert.throws(() => assertAmount(BigInt(-1)));
    assert.throws(() =>
      calculateTransferBalances(BigInt(100), BigInt(0), BigInt(101)),
    );
    assert.throws(() =>
      calculateTransferBalances(
        BigInt(100),
        BigInt("9223372036854775807"),
        BigInt(1),
      ),
    );
  });

  it("normalizes handles and optional notes", () => {
    assert.equal(normalizeHandle(" @Alice_7 "), "alice_7");
    assert.equal(normalizeNote("  lunch  "), "lunch");
    assert.equal(normalizeNote("   "), undefined);
  });
});

describe("money request state", () => {
  it("allows each terminal transition from pending", () => {
    assert.doesNotThrow(() => assertRequestTransition("pending", "paid"));
    assert.doesNotThrow(() => assertRequestTransition("pending", "declined"));
    assert.doesNotThrow(() => assertRequestTransition("pending", "cancelled"));
  });

  it("does not change a terminal request", () => {
    assert.throws(() => assertRequestTransition("paid", "declined"));
    assert.throws(() => assertRequestTransition("declined", "paid"));
    assert.throws(() => assertRequestTransition("cancelled", "paid"));
  });
});
