import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { fail } from "./errors";

type ReadCtx = QueryCtx | MutationCtx;

export async function getIdentity(ctx: ReadCtx) {
  return await ctx.auth.getUserIdentity();
}

export async function requireIdentity(ctx: ReadCtx) {
  const identity = await getIdentity(ctx);
  if (!identity) {
    fail("UNAUTHENTICATED", "Sign in to continue.");
  }
  return identity;
}

export async function getCurrentUser(
  ctx: ReadCtx,
): Promise<Doc<"users"> | null> {
  const identity = await getIdentity(ctx);
  if (!identity) {
    return null;
  }
  return await ctx.db
    .query("users")
    .withIndex("by_tokenIdentifier", (q) =>
      q.eq("tokenIdentifier", identity.tokenIdentifier),
    )
    .unique();
}

export async function requireCurrentUser(ctx: ReadCtx): Promise<Doc<"users">> {
  const identity = await requireIdentity(ctx);
  const user = await ctx.db
    .query("users")
    .withIndex("by_tokenIdentifier", (q) =>
      q.eq("tokenIdentifier", identity.tokenIdentifier),
    )
    .unique();
  if (!user) {
    fail("ONBOARDING_REQUIRED", "Create your wallet before continuing.");
  }
  return user;
}

export function userSummary(user: Doc<"users">) {
  return {
    id: user._id,
    handle: user.handle,
    displayName: user.displayName,
    avatarSeed: user.avatarSeed,
  };
}
