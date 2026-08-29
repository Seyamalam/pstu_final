import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { query } from "./_generated/server";
import { activityItemForEntry } from "./lib/activity";
import { requireCurrentUser } from "./lib/auth";
import { fail } from "./lib/errors";
import { activityItemValidator } from "./lib/validators";
import { getActiveWalletAccess } from "./lib/wallets";

export const list = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(activityItemValidator),
  handler: async (ctx, args) => {
    if (
      !Number.isFinite(args.paginationOpts.numItems) ||
      args.paginationOpts.numItems < 1 ||
      args.paginationOpts.numItems > 50
    ) {
      fail("INVALID_PAGE_SIZE", "Page size must be between 1 and 50.");
    }
    const viewer = await requireCurrentUser(ctx);
    const { account } = await getActiveWalletAccess(ctx, viewer);
    const result = await ctx.db
      .query("ledgerEntries")
      .withIndex("by_accountId_and_createdAt", (q) =>
        q.eq("accountId", account._id),
      )
      .order("desc")
      .paginate(args.paginationOpts);
    return {
      ...result,
      page: await Promise.all(
        result.page.map((entry) => activityItemForEntry(ctx, entry)),
      ),
    };
  },
});
