import { describe, expect, it } from "vitest";
import { safeNextPath } from "../src/lib/safe-next-path";

describe("safe sign-in destinations", () => {
  it("keeps wallet paths and query parameters", () => {
    expect(safeNextPath("/app/send?to=alice_7")).toBe("/app/send?to=alice_7");
  });

  it("rejects external and non-wallet destinations", () => {
    for (const value of [
      "https://evil.example/app",
      "//evil.example/app",
      "/login",
      "/application",
      `/${"a".repeat(600)}`,
    ]) {
      expect(safeNextPath(value)).toBe("/app");
    }
  });
});
