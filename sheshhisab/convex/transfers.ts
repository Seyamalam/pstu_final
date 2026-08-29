import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireCurrentUser } from "./lib/auth";
import { fail } from "./lib/errors";
import {
  assertAmount,
  normalizeHandle,
  normalizeIdempotencyKey,
} from "./lib/money";
import { limitTransfer } from "./lib/rateLimits";
import {
  commitTransfer,
  findIdempotentTransfer,
  receiptForTransfer,
} from "./lib/transfers";
import { receiptValidator } from "./lib/validators";

export const send = mutation({
  args: {
    recipientHandle: v.string(),
    amountPoisha: v.int64(),
    note: v.optional(v.string()),
    idempotencyKey: v.string(),
  },
  returns: receiptValidator,
  handler: async (ctx, args) => {
    const sender = await requireCurrentUser(ctx);
    const recipientHandle = normalizeHandle(args.recipientHandle);
    const recipient = await ctx.db
      .query("users")
      .withIndex("by_handleNormalized", (q) =>
        q.eq("handleNormalized", recipientHandle),
      )
      .unique();
    if (!recipient) {
      fail("RECIPIENT_NOT_FOUND", "No wallet uses that handle.");
    }
    assertAmount(args.amountPoisha);
    if (recipient._id === sender._id) {
      fail("SELF_TRANSFER", "Choose another person as the recipient.");
    }
    const existing = await findIdempotentTransfer(ctx, {
      sender,
      recipient,
      amountPoisha: args.amountPoisha,
      note: args.note,
      idempotencyKey: args.idempotencyKey,
    });
    if (existing) {
      return await receiptForTransfer(ctx, existing);
    }
    await limitTransfer(ctx, String(sender._id));
    return await commitTransfer(ctx, {
      sender,
      recipient,
      amountPoisha: args.amountPoisha,
      note: args.note,
      idempotencyKey: args.idempotencyKey,
    });
  },
});

export const getByIdempotencyKey = query({
  args: { idempotencyKey: v.string() },
  returns: v.union(receiptValidator, v.null()),
  handler: async (ctx, args) => {
    const sender = await requireCurrentUser(ctx);
    const idempotencyKey = normalizeIdempotencyKey(args.idempotencyKey);
    const transfer = await ctx.db
      .query("transfers")
      .withIndex("by_senderId_and_idempotencyKey", (q) =>
        q.eq("senderId", sender._id).eq("idempotencyKey", idempotencyKey),
      )
      .unique();
    return transfer ? await receiptForTransfer(ctx, transfer) : null;
  },
});
