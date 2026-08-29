import { describe, expect, it } from "vitest";

import {
  decodeVapidPublicKey,
  resolvePushAvailability,
  supportsWebPush,
  toPushSubscriptionPayload,
} from "../src/lib/pwa";

describe("web push support", () => {
  it("requires a secure context and every browser API", () => {
    expect(
      supportsWebPush({
        secureContext: true,
        serviceWorker: true,
        pushManager: true,
        notifications: true,
      }),
    ).toBe(true);

    expect(
      supportsWebPush({
        secureContext: false,
        serviceWorker: true,
        pushManager: true,
        notifications: true,
      }),
    ).toBe(false);

    for (const missing of [
      "serviceWorker",
      "pushManager",
      "notifications",
    ] as const) {
      expect(
        supportsWebPush({
          secureContext: true,
          serviceWorker: missing !== "serviceWorker",
          pushManager: missing !== "pushManager",
          notifications: missing !== "notifications",
        }),
      ).toBe(false);
    }
  });

  it("keeps blocked and unconfigured states distinct", () => {
    expect(
      resolvePushAvailability({
        supported: true,
        permission: "denied",
        configured: true,
        subscribed: false,
      }),
    ).toBe("blocked");
    expect(
      resolvePushAvailability({
        supported: true,
        permission: "default",
        configured: false,
        subscribed: false,
      }),
    ).toBe("unconfigured");
  });

  it("prefers an existing subscription over current configuration", () => {
    expect(
      resolvePushAvailability({
        supported: true,
        permission: "granted",
        configured: false,
        subscribed: true,
      }),
    ).toBe("subscribed");
  });
});

describe("push payload helpers", () => {
  it("decodes URL-safe VAPID public keys", () => {
    expect(Array.from(decodeVapidPublicKey("AQID-_8"))).toEqual([
      1, 2, 3, 251, 255,
    ]);
  });

  it("rejects malformed VAPID public keys", () => {
    expect(() => decodeVapidPublicKey("not a key")).toThrow(
      "Invalid VAPID public key",
    );
    expect(() => decodeVapidPublicKey("")).toThrow("Invalid VAPID public key");
  });

  it("serializes only the fields needed for delivery", () => {
    expect(
      toPushSubscriptionPayload({
        endpoint: "https://push.example/subscription-id",
        expirationTime: null,
        keys: { auth: "auth-key", p256dh: "public-key" },
        ignored: "value",
      }),
    ).toEqual({
      endpoint: "https://push.example/subscription-id",
      expirationTime: null,
      keys: { auth: "auth-key", p256dh: "public-key" },
    });
  });

  it("rejects incomplete or insecure subscription payloads", () => {
    expect(() =>
      toPushSubscriptionPayload({
        endpoint: "http://push.example/subscription-id",
        expirationTime: null,
        keys: { auth: "auth-key", p256dh: "public-key" },
      }),
    ).toThrow("Invalid push subscription");
    expect(() =>
      toPushSubscriptionPayload({
        endpoint: "https://",
        expirationTime: null,
        keys: { auth: "auth-key", p256dh: "public-key" },
      }),
    ).toThrow("Invalid push subscription");
    expect(() =>
      toPushSubscriptionPayload({
        endpoint: "https://push.example/subscription-id",
        expirationTime: null,
        keys: { auth: "", p256dh: "public-key" },
      }),
    ).toThrow("Invalid push subscription");
  });
});
