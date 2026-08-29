import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireCurrentUser, requireIdentity, userSummary } from "./lib/auth";
import { fail } from "./lib/errors";
import {
  normalizeDisplayName,
  normalizeHandle,
  normalizeHandlePrefix,
  OPENING_BALANCE_POISHA,
} from "./lib/money";
import {
  accountSummaryValidator,
  userSummaryValidator,
} from "./lib/validators";

export const ensureCurrent = mutation({
  args: {
    handle: v.string(),
    displayName: v.string(),
  },
  returns: v.object({
    user: userSummaryValidator,
    account: accountSummaryValidator,
    created: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const existing = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();
    if (existing) {
      const account = await ctx.db
        .query("accounts")
        .withIndex("by_userId", (q) => q.eq("userId", existing._id))
        .unique();
      if (!account) {
        fail("ACCOUNT_NOT_FOUND", "Wallet account was not found.");
      }
      return {
        user: userSummary(existing),
        account: {
          id: account._id,
          balancePoisha: account.balancePoisha,
          currency: account.currency,
        },
        created: false,
      };
    }

    const handleNormalized = normalizeHandle(args.handle);
    const displayName = normalizeDisplayName(args.displayName);
    const handleOwner = await ctx.db
      .query("users")
      .withIndex("by_handleNormalized", (q) =>
        q.eq("handleNormalized", handleNormalized),
      )
      .unique();
    if (handleOwner) {
      fail("HANDLE_TAKEN", "That handle is already in use.");
    }

    const createdAt = Date.now();
    const userId = await ctx.db.insert("users", {
      tokenIdentifier: identity.tokenIdentifier,
      handle: handleNormalized,
      handleNormalized,
      displayName,
      avatarSeed: handleNormalized,
      createdAt,
    });
    const accountId = await ctx.db.insert("accounts", {
      userId,
      balancePoisha: OPENING_BALANCE_POISHA,
      currency: "BDT",
      createdAt,
    });

    return {
      user: {
        id: userId,
        handle: handleNormalized,
        displayName,
        avatarSeed: handleNormalized,
      },
      account: {
        id: accountId,
        balancePoisha: OPENING_BALANCE_POISHA,
        currency: "BDT" as const,
      },
      created: true,
    };
  },
});

export const search = query({
  args: { handlePrefix: v.string() },
  returns: v.array(userSummaryValidator),
  handler: async (ctx, args) => {
    const viewer = await requireCurrentUser(ctx);
    const prefix = normalizeHandlePrefix(args.handlePrefix);
    const users = await ctx.db
      .query("users")
      .withIndex("by_handleNormalized", (q) =>
        q
          .gte("handleNormalized", prefix)
          .lt("handleNormalized", `${prefix}\uffff`),
      )
      .take(9);
    return users
      .filter((user) => user._id !== viewer._id)
      .slice(0, 8)
      .map(userSummary);
  },
});
