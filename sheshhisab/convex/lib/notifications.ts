import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

export async function createInboxNotification(
  ctx: MutationCtx,
  input: {
    recipientUserId: Id<"users">;
    kind: "rail" | "member" | "transfer" | "request";
    eventKey: string;
    referenceId: string;
    createdAt: number;
  },
) {
  const notificationId = await ctx.db.insert("notificationInbox", input);
  await ctx.scheduler.runAfter(0, internal.pushDelivery.deliver, {
    notificationId,
  });
  return notificationId;
}
