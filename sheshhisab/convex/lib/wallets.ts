import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { fail } from "./errors";

type ReadCtx = QueryCtx | MutationCtx;

export type WalletRole = "owner" | "admin" | "treasurer" | "viewer";

const ORG_SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9_]{1,22}[a-z0-9])$/;

export function normalizeOrganizationName(value: string): string {
  const name = value.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 60) {
    fail("INVALID_ORG_NAME", "Name must be 2 to 60 characters.");
  }
  return name;
}

export function normalizeOrganizationSlug(value: string): string {
  const slug = value.trim().replace(/^@/, "").toLowerCase();
  if (!ORG_SLUG_PATTERN.test(slug)) {
    fail("INVALID_ORG_SLUG", "Use 3 to 24 letters, numbers, or underscores.");
  }
  return slug;
}

export function isOrganization(account: Doc<"accounts">): boolean {
  return account.kind === "organization";
}

export async function getMembership(
  ctx: ReadCtx,
  accountId: Id<"accounts">,
  userId: Id<"users">,
) {
  return await ctx.db
    .query("walletMemberships")
    .withIndex("by_accountId_and_userId", (q) =>
      q.eq("accountId", accountId).eq("userId", userId),
    )
    .unique();
}

export async function requireWalletAccess(
  ctx: ReadCtx,
  accountId: Id<"accounts">,
  userId: Id<"users">,
) {
  const account = await ctx.db.get("accounts", accountId);
  if (!account) {
    fail("WALLET_NOT_FOUND", "Wallet was not found.");
  }

  if (!isOrganization(account)) {
    if (account.userId !== userId) {
      fail("WALLET_NOT_FOUND", "Wallet was not found.");
    }
    return { account, role: "owner" as const, membership: null };
  }

  const membership = await getMembership(ctx, accountId, userId);
  if (!membership) {
    fail("WALLET_NOT_FOUND", "Wallet was not found.");
  }
  return { account, role: membership.role, membership };
}

export async function requireWalletOperator(
  ctx: ReadCtx,
  accountId: Id<"accounts">,
  userId: Id<"users">,
) {
  const access = await requireWalletAccess(ctx, accountId, userId);
  if (access.role === "viewer") {
    fail("WALLET_READ_ONLY", "This wallet is read-only.");
  }
  return access;
}

export async function getActiveWalletAccess(ctx: ReadCtx, user: Doc<"users">) {
  const personal = await ctx.db
    .query("accounts")
    .withIndex("by_userId", (q) => q.eq("userId", user._id))
    .unique();
  if (!personal) {
    fail("ACCOUNT_NOT_FOUND", "Wallet account was not found.");
  }
  if (!user.activeAccountId || user.activeAccountId === personal._id) {
    return { account: personal, role: "owner" as const, membership: null };
  }

  const active = await ctx.db.get("accounts", user.activeAccountId);
  if (!active || !isOrganization(active)) {
    return { account: personal, role: "owner" as const, membership: null };
  }
  const membership = await getMembership(ctx, active._id, user._id);
  if (!membership) {
    return { account: personal, role: "owner" as const, membership: null };
  }
  return { account: active, role: membership.role, membership };
}

export async function requireActiveWalletOperator(
  ctx: ReadCtx,
  user: Doc<"users">,
) {
  const access = await getActiveWalletAccess(ctx, user);
  if (access.role === "viewer") {
    fail("WALLET_READ_ONLY", "This wallet is read-only.");
  }
  return access;
}

export function accountKind(account: Doc<"accounts">) {
  return isOrganization(account)
    ? ("organization" as const)
    : ("personal" as const);
}
