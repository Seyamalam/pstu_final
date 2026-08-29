import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { env, mutation, query } from "./_generated/server";
import { requireCurrentUser } from "./lib/auth";
import { fail } from "./lib/errors";
import { createInboxNotification } from "./lib/notifications";
import {
  assertIdempotentRailIntent,
  DAILY_RAIL_LIMIT_POISHA,
  MAX_WALLET_BALANCE_POISHA,
  normalizeRailIntent,
  RAIL_PROVIDERS,
  type RailDirection,
} from "./lib/rails";
import { limitExternalRail } from "./lib/rateLimits";
import { requireWalletAccess, requireWalletOperator } from "./lib/wallets";

const DAY_MS = 24 * 60 * 60 * 1_000;

const providerValidator = v.object({
  id: v.string(),
  kind: v.union(v.literal("mfs"), v.literal("bank"), v.literal("card")),
  name: v.string(),
});

const transactionValidator = v.object({
  id: v.id("externalRailTransactions"),
  accountId: v.id("accounts"),
  direction: v.union(v.literal("cash_in"), v.literal("cash_out")),
  provider: providerValidator,
  amountPoisha: v.int64(),
  referenceMasked: v.string(),
  status: v.literal("completed"),
  balanceAfterPoisha: v.int64(),
  createdAt: v.number(),
});

function providerForRecord(transaction: Doc<"externalRailTransactions">) {
  const provider = RAIL_PROVIDERS.find(
    (item) => item.id === transaction.provider,
  );
  if (!provider || provider.kind !== transaction.providerKind) {
    fail("RAIL_CORRUPT", "Rail provider could not be loaded.");
  }
  return provider;
}

function transactionSummary(transaction: Doc<"externalRailTransactions">) {
  return {
    id: transaction._id,
    accountId: transaction.accountId,
    direction: transaction.direction,
    provider: providerForRecord(transaction),
    amountPoisha: transaction.amountPoisha,
    referenceMasked: transaction.referenceMasked,
    status: transaction.status,
    balanceAfterPoisha: transaction.balanceAfterPoisha,
    createdAt: transaction.createdAt,
  };
}

async function fingerprintReference(value: string): Promise<string> {
  const pepper = env.RAIL_REFERENCE_PEPPER;
  if (!pepper || pepper.length < 32) {
    fail("RAIL_UNAVAILABLE", "This payment method is temporarily unavailable.");
  }
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pepper),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function commitRailTransaction(
  ctx: MutationCtx,
  input: {
    accountId: Doc<"accounts">["_id"];
    provider: string;
    amountPoisha: bigint;
    reference: string;
    idempotencyKey: string;
    direction: RailDirection;
  },
) {
  const actor = await requireCurrentUser(ctx);
  const access = await requireWalletOperator(ctx, input.accountId, actor._id);
  const intent = normalizeRailIntent(input);
  const referenceFingerprint = await fingerprintReference(
    `${intent.provider.id}\0${intent.reference.normalized}`,
  );

  const existing = await ctx.db
    .query("externalRailTransactions")
    .withIndex("by_actorUserId_and_idempotencyKey", (q) =>
      q
        .eq("actorUserId", actor._id)
        .eq("idempotencyKey", intent.idempotencyKey),
    )
    .unique();
  if (existing) {
    assertIdempotentRailIntent(existing, {
      accountId: input.accountId,
      direction: input.direction,
      provider: intent.provider,
      amountPoisha: intent.amountPoisha,
      referenceFingerprint,
    });
    return transactionSummary(existing);
  }

  await limitExternalRail(
    ctx,
    `${String(input.accountId)}:${String(actor._id)}`,
  );
  const createdAt = Date.now();
  const dayStart = Math.floor(createdAt / DAY_MS) * DAY_MS;
  const today = await ctx.db
    .query("externalRailTransactions")
    .withIndex("by_accountId_and_createdAt", (q) =>
      q.eq("accountId", input.accountId).gte("createdAt", dayStart),
    )
    .take(101);
  if (today.length > 100) {
    fail("RAIL_DAILY_LIMIT", "Daily rail limit reached.");
  }
  const dailyTotal = today.reduce(
    (sum, transaction) => sum + transaction.amountPoisha,
    0n,
  );
  if (dailyTotal + intent.amountPoisha > DAILY_RAIL_LIMIT_POISHA) {
    fail("RAIL_DAILY_LIMIT", "Daily rail limit reached.");
  }

  const balanceAfterPoisha =
    input.direction === "cash_in"
      ? access.account.balancePoisha + intent.amountPoisha
      : access.account.balancePoisha - intent.amountPoisha;
  if (input.direction === "cash_out" && balanceAfterPoisha < 0n) {
    fail("INSUFFICIENT_FUNDS", "The wallet does not have enough funds.");
  }
  if (balanceAfterPoisha > MAX_WALLET_BALANCE_POISHA) {
    fail("ACCOUNT_LIMIT", "The wallet cannot hold this amount.");
  }

  const transactionId = await ctx.db.insert("externalRailTransactions", {
    accountId: input.accountId,
    actorUserId: actor._id,
    direction: input.direction,
    provider: intent.provider.id,
    providerKind: intent.provider.kind,
    amountPoisha: intent.amountPoisha,
    balanceAfterPoisha,
    referenceFingerprint,
    referenceMasked: intent.reference.masked,
    idempotencyKey: intent.idempotencyKey,
    status: "completed",
    createdAt,
  });
  await ctx.db.patch("accounts", input.accountId, {
    balancePoisha: balanceAfterPoisha,
  });
  await ctx.db.insert("externalRailLedgerEntries", {
    transactionId,
    accountId: input.accountId,
    direction: input.direction === "cash_in" ? "credit" : "debit",
    amountPoisha: intent.amountPoisha,
    balanceAfterPoisha,
    createdAt,
  });
  await createInboxNotification(ctx, {
    recipientUserId: actor._id,
    kind: "rail",
    eventKey: input.direction,
    referenceId: String(transactionId),
    createdAt,
  });
  const transaction = await ctx.db.get(
    "externalRailTransactions",
    transactionId,
  );
  if (!transaction) {
    fail("RAIL_CORRUPT", "Rail transaction could not be loaded.");
  }
  return transactionSummary(transaction);
}

const railArgs = {
  accountId: v.id("accounts"),
  provider: v.string(),
  amountPoisha: v.int64(),
  reference: v.string(),
  idempotencyKey: v.string(),
};

export const listProviders = query({
  args: {},
  returns: v.array(providerValidator),
  handler: async (ctx) => {
    await requireCurrentUser(ctx);
    return [...RAIL_PROVIDERS];
  },
});

export const cashIn = mutation({
  args: railArgs,
  returns: transactionValidator,
  handler: async (ctx, args) =>
    await commitRailTransaction(ctx, { ...args, direction: "cash_in" }),
});

export const cashOut = mutation({
  args: railArgs,
  returns: transactionValidator,
  handler: async (ctx, args) =>
    await commitRailTransaction(ctx, { ...args, direction: "cash_out" }),
});

export const list = query({
  args: { accountId: v.id("accounts"), limit: v.optional(v.number()) },
  returns: v.array(transactionValidator),
  handler: async (ctx, args) => {
    const viewer = await requireCurrentUser(ctx);
    await requireWalletAccess(ctx, args.accountId, viewer._id);
    const limit = args.limit ?? 30;
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 50) {
      fail("INVALID_LIMIT", "Limit must be between 1 and 50.");
    }
    const transactions = await ctx.db
      .query("externalRailTransactions")
      .withIndex("by_accountId_and_createdAt", (q) =>
        q.eq("accountId", args.accountId),
      )
      .order("desc")
      .take(limit);
    return transactions.map(transactionSummary);
  },
});
