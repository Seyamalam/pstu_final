import { v } from "convex/values";
import { query } from "./_generated/server";
import { getCurrentUser, userSummary } from "./lib/auth";
import {
  accountSummaryValidator,
  userSummaryValidator,
} from "./lib/validators";
import { getActiveWalletAccess } from "./lib/wallets";

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
    const access = await getActiveWalletAccess(ctx, user);
    const account = access.account;
    return {
      user: userSummary(user),
      account: {
        id: account._id,
        balancePoisha: account.balancePoisha,
        currency: account.currency,
      },
      capabilities: {
        canSend: access.role !== "viewer",
        canRequest: account.kind !== "organization",
      },
    };
  },
});
