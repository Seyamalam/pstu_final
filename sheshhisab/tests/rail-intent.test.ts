import { describe, expect, it } from "vitest";

import { railIntent, railIntentFingerprint } from "../src/lib/rail-intent";

describe("rail payment intent", () => {
  const input = {
    accountId: "account-1",
    direction: "cash_in" as const,
    provider: "bkash",
    amountPoisha: 12_500n,
    reference: "01700000000",
  };

  it("keeps the key when an unchanged payment is retried", () => {
    const fingerprint = railIntentFingerprint(input);
    const first = railIntent(null, fingerprint, () => "key-1");
    const retry = railIntent(first, fingerprint, () => "key-2");

    expect(retry.idempotencyKey).toBe("key-1");
  });

  it("changes the key when any payment field changes", () => {
    const first = railIntent(null, railIntentFingerprint(input), () => "key-1");
    const changed = railIntent(
      first,
      railIntentFingerprint({ ...input, direction: "cash_out" }),
      () => "key-2",
    );

    expect(changed.idempotencyKey).toBe("key-2");
  });

  it("does not collapse fields that contain separators", () => {
    const first = railIntentFingerprint(input);
    const second = railIntentFingerprint({
      ...input,
      provider: `${input.provider}\0${input.amountPoisha}`,
      amountPoisha: 0n,
    });

    expect(first).not.toBe(second);
  });
});
