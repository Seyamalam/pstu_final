import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireCurrentUser, userSummary } from "./lib/auth";
import { fail } from "./lib/errors";
import { normalizeHandle } from "./lib/money";

const MAX_FAVORITES = 20;

const favoriteValidator = v.object({
  recipient: v.object({
    id: v.id("users"),
    handle: v.string(),
    displayName: v.string(),
    avatarSeed: v.string(),
  }),
  createdAt: v.number(),
});

export const toggle = mutation({
  args: { recipientHandle: v.string() },
  returns: v.object({
    favorite: v.boolean(),
    recipient: favoriteValidator.fields.recipient,
    createdAt: v.union(v.number(), v.null()),
  }),
  handler: async (ctx, args) => {
    const owner = await requireCurrentUser(ctx);
    const handle = normalizeHandle(args.recipientHandle);
    const recipient = await ctx.db
      .query("users")
      .withIndex("by_handleNormalized", (q) => q.eq("handleNormalized", handle))
      .unique();
    if (!recipient || recipient._id === owner._id) {
      fail("RECIPIENT_NOT_FOUND", "Recipient was not found.");
    }
    const existing = await ctx.db
      .query("favoriteRecipients")
      .withIndex("by_ownerUserId_and_recipientUserId", (q) =>
        q.eq("ownerUserId", owner._id).eq("recipientUserId", recipient._id),
      )
      .unique();
    if (existing) {
      await ctx.db.delete("favoriteRecipients", existing._id);
      return {
        favorite: false,
        recipient: userSummary(recipient),
        createdAt: null,
      };
    }
    const favorites = await ctx.db
      .query("favoriteRecipients")
      .withIndex("by_ownerUserId_and_createdAt", (q) =>
        q.eq("ownerUserId", owner._id),
      )
      .take(MAX_FAVORITES);
    if (favorites.length >= MAX_FAVORITES) {
      fail("FAVORITE_LIMIT", "Favorite limit reached.");
    }
    const createdAt = Date.now();
    await ctx.db.insert("favoriteRecipients", {
      ownerUserId: owner._id,
      recipientUserId: recipient._id,
      createdAt,
    });
    return { favorite: true, recipient: userSummary(recipient), createdAt };
  },
});

export const list = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(favoriteValidator),
  handler: async (ctx, args) => {
    const owner = await requireCurrentUser(ctx);
    const limit = args.limit ?? MAX_FAVORITES;
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > MAX_FAVORITES) {
      fail("INVALID_LIMIT", `Limit must be between 1 and ${MAX_FAVORITES}.`);
    }
    const favorites = await ctx.db
      .query("favoriteRecipients")
      .withIndex("by_ownerUserId_and_createdAt", (q) =>
        q.eq("ownerUserId", owner._id),
      )
      .order("desc")
      .take(limit);
    return await Promise.all(
      favorites.map(async (favorite) => {
        const recipient = await ctx.db.get("users", favorite.recipientUserId);
        if (!recipient)
          fail("FAVORITE_CORRUPT", "Recipient could not be loaded.");
        return {
          recipient: userSummary(recipient),
          createdAt: favorite.createdAt,
        };
      }),
    );
  },
});
