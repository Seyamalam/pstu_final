import { v } from "convex/values";
import { query } from "./_generated/server";
import { activityItemForEntry } from "./lib/activity";
import { requireCurrentUser, userSummary } from "./lib/auth";
import { requestItem } from "./lib/requests";
import { getAccountForUser } from "./lib/transfers";
import {
  accountSummaryValidator,
  activityItemValidator,
  requestItemValidator,
  userSummaryValidator,
} from "./lib/validators";

export const get = query({
  args: {},
  returns: v.object({
    user: userSummaryValidator,
    account: accountSummaryValidator,
    pendingRequests: v.array(requestItemValidator),
    recentActivity: v.array(activityItemValidator),
  }),
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    const account = await getAccountForUser(ctx, user._id);
    const [pendingRequests, recentEntries] = await Promise.all([
      ctx.db
        .query("moneyRequests")
        .withIndex("by_payerId_and_status_and_createdAt", (q) =>
          q.eq("payerId", user._id).eq("status", "pending"),
        )
        .order("desc")
        .take(5),
      ctx.db
        .query("ledgerEntries")
        .withIndex("by_accountId_and_createdAt", (q) =>
          q.eq("accountId", account._id),
        )
        .order("desc")
        .take(8),
    ]);
    const [pendingRequestItems, recentActivity] = await Promise.all([
      Promise.all(pendingRequests.map((request) => requestItem(ctx, request))),
      Promise.all(
        recentEntries.map((entry) => activityItemForEntry(ctx, entry)),
      ),
    ]);
    return {
      user: userSummary(user),
      account: {
        id: account._id,
        balancePoisha: account.balancePoisha,
        currency: account.currency,
      },
      pendingRequests: pendingRequestItems,
      recentActivity,
    };
  },
});
