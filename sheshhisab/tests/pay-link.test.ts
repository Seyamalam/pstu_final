import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  createPayLink,
  parsePayIntent,
  parsePayLink,
  poishaToInput,
} from "../src/lib/pay-link";

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

  it("round trips an amount and note without floating point money", () => {
    const link = createPayLink(origin, "alice_7", {
      amountPoisha: 12_345n,
      note: "Club dues",
    });

    assert.deepEqual(parsePayIntent(link, origin), {
      handle: "alice_7",
      amountPoisha: 12_345n,
      note: "Club dues",
    });
    assert.equal(poishaToInput(12_345n), "123.45");
  });

  it("rejects duplicate, oversized, zero, and control-character fields", () => {
    const invalid = [
      `${origin}/pay/alice_7?v=1&a=1&a=2`,
      `${origin}/pay/alice_7?v=1&a=0`,
      `${origin}/pay/alice_7?v=1&a=10000000001`,
      `${origin}/pay/alice_7?v=1&n=${encodeURIComponent("bad\nvalue")}`,
      `${origin}/pay/alice_7?v=1&n=${"a".repeat(121)}`,
    ];
    for (const value of invalid) {
      assert.equal(parsePayIntent(value, origin), null);
    }
  });

  it("rejects unsafe creation inputs", () => {
    assert.throws(() => createPayLink(origin, "alice_7", { amountPoisha: 0n }));
    assert.throws(() => createPayLink(origin, "alice_7", { note: " padded " }));
    assert.throws(() => createPayLink("http://evil.example", "alice_7"));
  });
});
