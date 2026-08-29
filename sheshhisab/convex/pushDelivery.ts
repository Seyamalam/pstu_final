"use node";

import { v } from "convex/values";
import webpush from "web-push";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { type ActionCtx, env, internalAction } from "./_generated/server";
import { pushCopy, pushTag, webPushUrl } from "./lib/push";

type DeliveryPayload = {
  kind: "rail" | "member" | "transfer" | "request";
  eventKey: string;
  referenceId: string;
  endpoints: Array<{
    id: Id<"notificationEndpoints">;
    platform: "web" | "android" | "ios";
    endpoint: string;
    p256dh: string | null;
    auth: string | null;
  }>;
};

async function revoke(ctx: ActionCtx, endpointId: Id<"notificationEndpoints">) {
  await ctx.runMutation(internal.notifications.revokeInvalidEndpoint, {
    endpointId,
  });
}

export const deliver = internalAction({
  args: { notificationId: v.id("notificationInbox") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const delivery: DeliveryPayload | null = await ctx.runQuery(
      internal.notifications.getDeliveryPayload,
      args,
    );
    if (!delivery) return null;

    const copy = pushCopy(delivery.kind, delivery.eventKey);
    const url = webPushUrl(
      delivery.kind,
      delivery.eventKey,
      delivery.referenceId,
    );
    const tag = pushTag(delivery.kind, delivery.referenceId);
    const webPayload = JSON.stringify({ ...copy, url, tag });
    const vapidSubject = env.PUSH_VAPID_SUBJECT;
    const vapidPublicKey = env.PUSH_VAPID_PUBLIC_KEY;
    const vapidPrivateKey = env.PUSH_VAPID_PRIVATE_KEY;
    const vapidReady = Boolean(
      vapidSubject && vapidPublicKey && vapidPrivateKey,
    );
    if (vapidSubject && vapidPublicKey && vapidPrivateKey) {
      webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
    }

    await Promise.allSettled(
      delivery.endpoints.map(async (endpoint) => {
        if (endpoint.platform === "web") {
          if (!vapidReady || !endpoint.p256dh || !endpoint.auth) return;
          try {
            await webpush.sendNotification(
              {
                endpoint: endpoint.endpoint,
                keys: { p256dh: endpoint.p256dh, auth: endpoint.auth },
              },
              webPayload,
              { TTL: 60 * 60, urgency: "normal" },
            );
          } catch (error) {
            const statusCode =
              typeof error === "object" &&
              error !== null &&
              "statusCode" in error
                ? Number(error.statusCode)
                : 0;
            if (statusCode === 404 || statusCode === 410) {
              await revoke(ctx, endpoint.id);
            }
          }
          return;
        }

        const response = await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(env.EXPO_ACCESS_TOKEN
              ? { Authorization: `Bearer ${env.EXPO_ACCESS_TOKEN}` }
              : {}),
          },
          body: JSON.stringify({
            to: endpoint.endpoint,
            title: copy.title,
            body: copy.body,
            data: {
              kind: delivery.kind,
              eventKey: delivery.eventKey,
              referenceId: delivery.referenceId,
            },
            sound: "default",
            channelId: "wallet",
          }),
        });
        if (!response.ok) return;
        const result = (await response.json()) as {
          data?: { status?: string; details?: { error?: string } };
        };
        if (result.data?.details?.error === "DeviceNotRegistered") {
          await revoke(ctx, endpoint.id);
        }
      }),
    );
    return null;
  },
});
