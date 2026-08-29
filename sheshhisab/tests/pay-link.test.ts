import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { createPayLink, parsePayLink } from "../src/lib/pay-link";

const origin = "https://wallet.example";

describe("pay links", () => {
  it("round trips web and app links", () => {
    assert.equal(
      parsePayLink(createPayLink(origin, "alice_7"), origin),
      "alice_7",
    );
    assert.equal(
      parsePayLink("sheshhisab://pay/v1/alice_7", origin),
      "alice_7",
    );
  });

  it("rejects foreign, malformed, and ambiguous payloads", () => {
    const invalid = [
      "https://evil.example/pay/alice_7?v=1",
      "https://wallet.example/pay/alice_7?v=2",
      "https://wallet.example/pay/alice_7?v=1&amount=1",
      "https://wallet.example/pay/ALICE?v=1",
      "https://wallet.example/pay/alice?v=1&v=1",
      "not a url",
      `https://wallet.example/pay/${"a".repeat(600)}?v=1`,
    ];
    for (const value of invalid)
      assert.equal(parsePayLink(value, origin), null);
  });
});
