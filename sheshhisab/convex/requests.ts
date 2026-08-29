import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireCurrentUser } from "./lib/auth";
import { fail } from "./lib/errors";
import {
  assertAmount,
  normalizeHandle,
  normalizeIdempotencyKey,
  normalizeNote,
} from "./lib/money";
import { limitRequestCreation, limitTransfer } from "./lib/rateLimits";
import { assertRequestTransition } from "./lib/requestState";
import { requestItem } from "./lib/requests";
import { commitTransfer, receiptForTransfer } from "./lib/transfers";
import {
  receiptValidator,
  requestItemValidator,
  requestStatusValidator,
} from "./lib/validators";

export const create = mutation({
  args: {
    payerHandle: v.string(),
    amountPoisha: v.int64(),
    note: v.optional(v.string()),
  },
  returns: requestItemValidator,
  handler: async (ctx, args) => {
    const requester = await requireCurrentUser(ctx);
    await limitRequestCreation(ctx, String(requester._id));
    assertAmount(args.amountPoisha);
    const payerHandle = normalizeHandle(args.payerHandle);
    const note = normalizeNote(args.note);
    const payer = await ctx.db
      .query("users")
      .withIndex("by_handleNormalized", (q) =>
        q.eq("handleNormalized", payerHandle),
      )
      .unique();
    if (!payer) {
      fail("PAYER_NOT_FOUND", "No wallet uses that handle.");
    }
    if (payer._id === requester._id) {
      fail("SELF_REQUEST", "Choose another person as the payer.");
    }
    const requestId = await ctx.db.insert("moneyRequests", {
      requesterId: requester._id,
      payerId: payer._id,
      amountPoisha: args.amountPoisha,
      ...(note ? { note } : {}),
      status: "pending",
      createdAt: Date.now(),
    });
    const request = await ctx.db.get("moneyRequests", requestId);
    if (!request) {
      fail("REQUEST_NOT_FOUND", "Money request was not found.");
    }
    return await requestItem(ctx, request);
  },
});

export const accept = mutation({
  args: {
    requestId: v.id("moneyRequests"),
    idempotencyKey: v.string(),
  },
  returns: receiptValidator,
  handler: async (ctx, args) => {
    const idempotencyKey = normalizeIdempotencyKey(args.idempotencyKey);
    const payer = await requireCurrentUser(ctx);
    const request = await ctx.db.get("moneyRequests", args.requestId);
    if (!request) {
      fail("REQUEST_NOT_FOUND", "Money request was not found.");
    }
    if (request.payerId !== payer._id) {
      fail("FORBIDDEN", "Only the requested payer can accept this request.");
    }
    if (request.status === "paid" && request.transferId) {
      const existing = await ctx.db.get("transfers", request.transferId);
      if (
        !existing ||
        existing.senderId !== payer._id ||
        existing.recipientId !== request.requesterId ||
        existing.requestId !== request._id
      ) {
        fail("REQUEST_CORRUPT", "The request payment could not be loaded.");
      }
      if (existing.idempotencyKey !== idempotencyKey) {
        fail(
          "IDEMPOTENCY_CONFLICT",
          "This request was paid with a different payment key.",
        );
      }
      return await receiptForTransfer(ctx, existing);
    }
    assertRequestTransition(request.status, "paid");
    const requester = await ctx.db.get("users", request.requesterId);
    if (!requester) {
      fail("REQUEST_CORRUPT", "The requester could not be loaded.");
    }
    await limitTransfer(ctx, String(payer._id));
    const receipt = await commitTransfer(ctx, {
      sender: payer,
      recipient: requester,
      amountPoisha: request.amountPoisha,
      note: request.note,
      idempotencyKey,
      requestId: request._id,
    });
    await ctx.db.patch("moneyRequests", request._id, {
      status: "paid",
      transferId: receipt.transferId,
      resolvedAt: receipt.createdAt,
    });
    return receipt;
  },
});

export const decline = mutation({
  args: { requestId: v.id("moneyRequests") },
  returns: requestItemValidator,
  handler: async (ctx, args) => {
    const payer = await requireCurrentUser(ctx);
    const request = await ctx.db.get("moneyRequests", args.requestId);
    if (!request) {
      fail("REQUEST_NOT_FOUND", "Money request was not found.");
    }
    if (request.payerId !== payer._id) {
      fail("FORBIDDEN", "Only the requested payer can decline this request.");
    }
    assertRequestTransition(request.status, "declined");
    await ctx.db.patch("moneyRequests", request._id, {
      status: "declined",
      resolvedAt: Date.now(),
    });
    const updated = await ctx.db.get("moneyRequests", request._id);
    if (!updated) {
      fail("REQUEST_NOT_FOUND", "Money request was not found.");
    }
    return await requestItem(ctx, updated);
  },
});

export const cancel = mutation({
  args: { requestId: v.id("moneyRequests") },
  returns: requestItemValidator,
  handler: async (ctx, args) => {
    const requester = await requireCurrentUser(ctx);
    const request = await ctx.db.get("moneyRequests", args.requestId);
    if (!request) {
      fail("REQUEST_NOT_FOUND", "Money request was not found.");
    }
    if (request.requesterId !== requester._id) {
      fail("FORBIDDEN", "Only the requester can cancel this request.");
    }
    assertRequestTransition(request.status, "cancelled");
    await ctx.db.patch("moneyRequests", request._id, {
      status: "cancelled",
      resolvedAt: Date.now(),
    });
    const updated = await ctx.db.get("moneyRequests", request._id);
    if (!updated) {
      fail("REQUEST_NOT_FOUND", "Money request was not found.");
    }
    return await requestItem(ctx, updated);
  },
});

export const list = query({
  args: {
    role: v.union(v.literal("payer"), v.literal("requester")),
    status: v.optional(requestStatusValidator),
    limit: v.optional(v.number()),
  },
  returns: v.array(requestItemValidator),
  handler: async (ctx, args) => {
    const viewer = await requireCurrentUser(ctx);
    const requestedLimit = args.limit ?? 20;
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(Math.floor(requestedLimit), 1), 50)
      : 20;
    const status = args.status;
    const requests =
      args.role === "payer"
        ? status
          ? await ctx.db
              .query("moneyRequests")
              .withIndex("by_payerId_and_status_and_createdAt", (q) =>
                q.eq("payerId", viewer._id).eq("status", status),
              )
              .order("desc")
              .take(limit)
          : await ctx.db
              .query("moneyRequests")
              .withIndex("by_payerId_and_createdAt", (q) =>
                q.eq("payerId", viewer._id),
              )
              .order("desc")
              .take(limit)
        : status
          ? await ctx.db
              .query("moneyRequests")
              .withIndex("by_requesterId_and_status_and_createdAt", (q) =>
                q.eq("requesterId", viewer._id).eq("status", status),
              )
              .order("desc")
              .take(limit)
          : await ctx.db
              .query("moneyRequests")
              .withIndex("by_requesterId_and_createdAt", (q) =>
                q.eq("requesterId", viewer._id),
              )
              .order("desc")
              .take(limit);
    return await Promise.all(
      requests.map((request) => requestItem(ctx, request)),
    );
  },
});
