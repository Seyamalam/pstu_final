import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireCurrentUser, userSummary } from "./lib/auth";
import { fail } from "./lib/errors";
import { createPayeeQrPayload, parsePayeeQrPayload } from "./lib/qr";
import { payeeQrValidator } from "./lib/validators";

export const mine = query({
  args: {},
  returns: payeeQrValidator,
  handler: async (ctx) => {
    const viewer = await requireCurrentUser(ctx);
    return {
      version: 1 as const,
      kind: "payee" as const,
      payload: createPayeeQrPayload(viewer.handleNormalized),
      payee: userSummary(viewer),
    };
  },
});

export const resolvePayee = query({
  args: { payload: v.string() },
  returns: payeeQrValidator,
  handler: async (ctx, args) => {
    const viewer = await requireCurrentUser(ctx);
    const handleNormalized = parsePayeeQrPayload(args.payload);
    const payee = await ctx.db
      .query("users")
      .withIndex("by_handleNormalized", (q) =>
        q.eq("handleNormalized", handleNormalized),
      )
      .unique();
    if (!payee || payee._id === viewer._id) {
      fail("PAYEE_NOT_FOUND", "This payment code is unavailable.");
    }
    return {
      version: 1 as const,
      kind: "payee" as const,
      payload: createPayeeQrPayload(payee.handleNormalized),
      payee: userSummary(payee),
    };
  },
});
