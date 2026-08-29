import { v } from "convex/values";
import { query } from "./_generated/server";
import { getCurrentUser, userSummary } from "./lib/auth";
import { fail } from "./lib/errors";
import {
  accountSummaryValidator,
  userSummaryValidator,
} from "./lib/validators";

export const get = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      user: userSummaryValidator,
      account: accountSummaryValidator,
      capabilities: v.object({
        canSend: v.boolean(),
        canRequest: v.boolean(),
      }),
    }),
  ),
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return null;
    }
    const account = await ctx.db
      .query("accounts")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();
    if (!account) {
      fail("ACCOUNT_NOT_FOUND", "Wallet account was not found.");
    }
    return {
      user: userSummary(user),
      account: {
        id: account._id,
        balancePoisha: account.balancePoisha,
        currency: account.currency,
      },
      capabilities: { canSend: true, canRequest: true },
    };
  },
});
