import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireCurrentUser } from "./lib/auth";
import { fail } from "./lib/errors";
import { receiptForTransfer } from "./lib/transfers";
import { receiptValidator } from "./lib/validators";
import { getMembership } from "./lib/wallets";

export const getByPublicId = query({
  args: { publicId: v.string() },
  returns: receiptValidator,
  handler: async (ctx, args) => {
    const viewer = await requireCurrentUser(ctx);
    if (args.publicId.length < 1 || args.publicId.length > 128) {
      fail("INVALID_RECEIPT_ID", "Receipt ID is invalid.");
    }
    const transfer = await ctx.db
      .query("transfers")
      .withIndex("by_publicId", (q) => q.eq("publicId", args.publicId))
      .unique();
    if (!transfer) {
      fail("RECEIPT_NOT_FOUND", "Receipt was not found.");
    }
    const organizationMembership = transfer.senderAccountId
      ? await getMembership(ctx, transfer.senderAccountId, viewer._id)
      : null;
    if (
      transfer.senderId !== viewer._id &&
      transfer.recipientId !== viewer._id &&
      !organizationMembership
    ) {
      fail("RECEIPT_NOT_FOUND", "Receipt was not found.");
    }
    return await receiptForTransfer(ctx, transfer);
  },
});
