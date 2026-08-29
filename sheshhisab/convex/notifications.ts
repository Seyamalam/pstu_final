import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { requireCurrentUser } from "./lib/auth";
import { fail } from "./lib/errors";

const notificationValidator = v.object({
  id: v.id("notificationInbox"),
  kind: v.union(
    v.literal("rail"),
    v.literal("member"),
    v.literal("transfer"),
    v.literal("request"),
  ),
  eventKey: v.string(),
  referenceId: v.string(),
  readAt: v.union(v.number(), v.null()),
  createdAt: v.number(),
});

const endpointValidator = v.object({
  id: v.id("notificationEndpoints"),
  platform: v.union(v.literal("web"), v.literal("android"), v.literal("ios")),
  deviceLabel: v.union(v.string(), v.null()),
  enabled: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

function normalizeDeviceLabel(value: string | undefined) {
  if (value === undefined) return undefined;
  const label = value.trim().replace(/\s+/g, " ");
  if (label.length > 40) {
    fail("INVALID_DEVICE_LABEL", "Device label is too long.");
  }
  return label || undefined;
}

function normalizeEndpoint(input: {
  platform: string;
  endpoint: string;
  p256dh?: string;
  auth?: string;
}): {
  platform: "web" | "android" | "ios";
  endpoint: string;
  p256dh?: string;
  auth?: string;
} {
  const endpoint = input.endpoint.trim();
  if (input.platform === "web") {
    let url: URL;
    try {
      url = new URL(endpoint);
    } catch {
      fail("INVALID_PUSH_ENDPOINT", "Push endpoint is invalid.");
    }
    if (url.protocol !== "https:" || endpoint.length > 2_048) {
      fail("INVALID_PUSH_ENDPOINT", "Push endpoint is invalid.");
    }
    const p256dh = input.p256dh?.trim();
    const auth = input.auth?.trim();
    if (!p256dh || !auth || p256dh.length > 256 || auth.length > 256) {
      fail("INVALID_PUSH_KEYS", "Push keys are invalid.");
    }
    return { platform: "web" as const, endpoint, p256dh, auth };
  }
  if (input.platform !== "android" && input.platform !== "ios") {
    fail("INVALID_PUSH_PLATFORM", "Push platform is invalid.");
  }
  if (
    endpoint.length > 256 ||
    !/^(?:ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/.test(endpoint)
  ) {
    fail("INVALID_PUSH_ENDPOINT", "Push endpoint is invalid.");
  }
  return {
    platform: input.platform as "android" | "ios",
    endpoint,
    p256dh: undefined,
    auth: undefined,
  };
}

export const list = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(notificationValidator),
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const limit = args.limit ?? 30;
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 50) {
      fail("INVALID_LIMIT", "Limit must be between 1 and 50.");
    }
    const notifications = await ctx.db
      .query("notificationInbox")
      .withIndex("by_recipientUserId_and_createdAt", (q) =>
        q.eq("recipientUserId", user._id),
      )
      .order("desc")
      .take(limit);
    return notifications.map((notification) => ({
      id: notification._id,
      kind: notification.kind,
      eventKey: notification.eventKey,
      referenceId: notification.referenceId,
      readAt: notification.readAt ?? null,
      createdAt: notification.createdAt,
    }));
  },
});

export const markRead = mutation({
  args: { notificationId: v.id("notificationInbox") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const notification = await ctx.db.get(
      "notificationInbox",
      args.notificationId,
    );
    if (!notification || notification.recipientUserId !== user._id) {
      fail("NOTIFICATION_NOT_FOUND", "Notification was not found.");
    }
    if (!notification.readAt) {
      await ctx.db.patch("notificationInbox", notification._id, {
        readAt: Date.now(),
      });
    }
    return null;
  },
});

export const registerEndpoint = mutation({
  args: {
    platform: v.string(),
    endpoint: v.string(),
    p256dh: v.optional(v.string()),
    auth: v.optional(v.string()),
    deviceLabel: v.optional(v.string()),
  },
  returns: endpointValidator,
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const normalized = normalizeEndpoint(args);
    const deviceLabel = normalizeDeviceLabel(args.deviceLabel);
    const existing = await ctx.db
      .query("notificationEndpoints")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", normalized.endpoint))
      .unique();
    if (existing && existing.userId !== user._id) {
      fail("ENDPOINT_IN_USE", "Push endpoint is already registered.");
    }
    const updatedAt = Date.now();
    if (existing) {
      await ctx.db.patch("notificationEndpoints", existing._id, {
        platform: normalized.platform,
        p256dh: normalized.p256dh,
        auth: normalized.auth,
        deviceLabel,
        updatedAt,
        revokedAt: undefined,
      });
      return {
        id: existing._id,
        platform: normalized.platform,
        deviceLabel: deviceLabel ?? null,
        enabled: true,
        createdAt: existing.createdAt,
        updatedAt,
      };
    }
    const endpoints = await ctx.db
      .query("notificationEndpoints")
      .withIndex("by_userId_and_createdAt", (q) => q.eq("userId", user._id))
      .take(10);
    if (endpoints.length >= 10) {
      fail("ENDPOINT_LIMIT", "Device limit reached.");
    }
    const id = await ctx.db.insert("notificationEndpoints", {
      userId: user._id,
      platform: normalized.platform,
      endpoint: normalized.endpoint,
      ...(normalized.p256dh ? { p256dh: normalized.p256dh } : {}),
      ...(normalized.auth ? { auth: normalized.auth } : {}),
      ...(deviceLabel ? { deviceLabel } : {}),
      createdAt: updatedAt,
      updatedAt,
    });
    return {
      id,
      platform: normalized.platform,
      deviceLabel: deviceLabel ?? null,
      enabled: true,
      createdAt: updatedAt,
      updatedAt,
    };
  },
});

export const unregisterEndpoint = mutation({
  args: { endpointId: v.id("notificationEndpoints") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const endpoint = await ctx.db.get("notificationEndpoints", args.endpointId);
    if (!endpoint || endpoint.userId !== user._id) {
      fail("ENDPOINT_NOT_FOUND", "Push endpoint was not found.");
    }
    if (!endpoint.revokedAt) {
      const revokedAt = Date.now();
      await ctx.db.patch("notificationEndpoints", endpoint._id, {
        revokedAt,
        updatedAt: revokedAt,
      });
    }
    return null;
  },
});

export const listEndpoints = query({
  args: {},
  returns: v.array(endpointValidator),
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    const endpoints = await ctx.db
      .query("notificationEndpoints")
      .withIndex("by_userId_and_createdAt", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(25);
    return endpoints.map((endpoint) => ({
      id: endpoint._id,
      platform: endpoint.platform,
      deviceLabel: endpoint.deviceLabel ?? null,
      enabled: endpoint.revokedAt === undefined,
      createdAt: endpoint.createdAt,
      updatedAt: endpoint.updatedAt,
    }));
  },
});

export const getDeliveryPayload = internalQuery({
  args: { notificationId: v.id("notificationInbox") },
  returns: v.union(
    v.null(),
    v.object({
      kind: v.union(
        v.literal("rail"),
        v.literal("member"),
        v.literal("transfer"),
        v.literal("request"),
      ),
      endpoints: v.array(
        v.object({
          id: v.id("notificationEndpoints"),
          platform: v.union(
            v.literal("web"),
            v.literal("android"),
            v.literal("ios"),
          ),
          endpoint: v.string(),
          p256dh: v.union(v.string(), v.null()),
          auth: v.union(v.string(), v.null()),
        }),
      ),
    }),
  ),
  handler: async (ctx, args) => {
    const notification = await ctx.db.get(
      "notificationInbox",
      args.notificationId,
    );
    if (!notification) return null;
    const endpoints = await ctx.db
      .query("notificationEndpoints")
      .withIndex("by_userId_and_createdAt", (q) =>
        q.eq("userId", notification.recipientUserId),
      )
      .order("desc")
      .take(25);
    return {
      kind: notification.kind,
      endpoints: endpoints
        .filter((endpoint) => endpoint.revokedAt === undefined)
        .map((endpoint) => ({
          id: endpoint._id,
          platform: endpoint.platform,
          endpoint: endpoint.endpoint,
          p256dh: endpoint.p256dh ?? null,
          auth: endpoint.auth ?? null,
        })),
    };
  },
});

export const revokeInvalidEndpoint = internalMutation({
  args: { endpointId: v.id("notificationEndpoints") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const endpoint = await ctx.db.get("notificationEndpoints", args.endpointId);
    if (endpoint && endpoint.revokedAt === undefined) {
      const revokedAt = Date.now();
      await ctx.db.patch("notificationEndpoints", endpoint._id, {
        revokedAt,
        updatedAt: revokedAt,
      });
    }
    return null;
  },
});
