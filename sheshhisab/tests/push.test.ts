import { describe, expect, it } from "vitest";

import { pushCopy, pushTag, webPushUrl } from "../convex/lib/push";

describe("push payloads", () => {
  it("routes supported events to focused in-app destinations", () => {
    expect(webPushUrl("transfer", "transfer.received", "receipt_1234")).toBe(
      "/app/receipt/receipt_1234",
    );
    expect(webPushUrl("request", "split.invited", "split_123456")).toBe(
      "/app/splits/split_123456",
    );
    expect(webPushUrl("rail", "cash_in", "rail_1234567")).toBe("/app/money");
    expect(webPushUrl("member", "org.member", "member_12345")).toBe(
      "/app/wallets",
    );
  });

  it("falls back safely when a reference is malformed", () => {
    expect(webPushUrl("transfer", "transfer.received", "../../admin")).toBe(
      "/app/activity",
    );
    expect(webPushUrl("request", "request.created", "bad")).toBe(
      "/app/notifications",
    );
  });

  it("uses concise event copy and bounded tags", () => {
    expect(pushCopy("request", "split.invited")).toEqual({
      title: "Split bill",
      body: "Your share is ready to review.",
    });
    expect(pushTag("transfer", "receipt_1234")).toBe(
      "sheshhisab-transfer-receipt_1234",
    );
    expect(pushTag("rail", "x".repeat(200))).toBe("sheshhisab-rail-update");
  });
});
