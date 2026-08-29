import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, mutation, query } from "./_generated/server";
import { requireCurrentUser, userSummary } from "./lib/auth";
import { normalizeBudgetCategory } from "./lib/budgets";
import { fail } from "./lib/errors";
import {
  assertAmount,
  normalizeHandle,
  normalizeIdempotencyKey,
  normalizeNote,
} from "./lib/money";
import { limitFeatureCreation } from "./lib/rateLimits";
import { commitTransfer, getAccountForUser } from "./lib/transfers";
import {
  getActiveWalletAccess,
  getMembership,
  isOrganization,
} from "./lib/wallets";

const MIN_SCHEDULE_DELAY_MS = 60_000;
const MAX_SCHEDULE_AHEAD_MS = 366 * 24 * 60 * 60 * 1_000;
const MAX_PENDING_SCHEDULES = 25;
const EXPECTED_EXECUTION_FAILURES = new Set([
  "INVALID_AMOUNT",
  "AMOUNT_TOO_LARGE",
  "INSUFFICIENT_FUNDS",
  "ACCOUNT_LIMIT",
  "SELF_TRANSFER",
  "SAME_ACCOUNT",
  "IDEMPOTENCY_CONFLICT",
  "INVALID_CATEGORY",
  "NOTE_TOO_LONG",
  "ACCOUNT_NOT_FOUND",
]);

const statusValidator = v.union(
  v.literal("pending"),
  v.literal("completed"),
  v.literal("cancelled"),
  v.literal("failed"),
);

const scheduleValidator = v.object({
  id: v.id("scheduledTransfers"),
  sourceAccountId: v.id("accounts"),
  recipient: v.object({
    id: v.id("users"),
    handle: v.string(),
    displayName: v.string(),
    avatarSeed: v.string(),
  }),
  amountPoisha: v.int64(),
  note: v.union(v.string(), v.null()),
  category: v.union(v.string(), v.null()),
  executeAt: v.number(),
  status: statusValidator,
  transferPublicId: v.union(v.string(), v.null()),
  failureCode: v.union(v.string(), v.null()),
  createdAt: v.number(),
  resolvedAt: v.union(v.number(), v.null()),
});

async function summary(
  ctx: Parameters<typeof requireCurrentUser>[0],
  scheduled: Doc<"scheduledTransfers">,
) {
  const [recipient, transfer] = await Promise.all([
    ctx.db.get("users", scheduled.recipientUserId),
    scheduled.transferId
      ? ctx.db.get("transfers", scheduled.transferId)
      : Promise.resolve(null),
  ]);
  if (!recipient) fail("SCHEDULE_CORRUPT", "Recipient could not be loaded.");
  return {
    id: scheduled._id,
    sourceAccountId: scheduled.sourceAccountId,
    recipient: userSummary(recipient),
    amountPoisha: scheduled.amountPoisha,
    note: scheduled.note ?? null,
    category: scheduled.category ?? null,
    executeAt: scheduled.executeAt,
    status: scheduled.status,
    transferPublicId: transfer?.publicId ?? null,
    failureCode: scheduled.failureCode ?? null,
    createdAt: scheduled.createdAt,
    resolvedAt: scheduled.resolvedAt ?? null,
  };
}

export const create = mutation({
  args: {
    recipientHandle: v.string(),
    amountPoisha: v.int64(),
    note: v.optional(v.string()),
    category: v.optional(v.string()),
    executeAt: v.number(),
    idempotencyKey: v.string(),
  },
  returns: scheduleValidator,
  handler: async (ctx, args) => {
    const creator = await requireCurrentUser(ctx);
    const { account } = await getActiveWalletAccess(ctx, creator);
    if (
      isOrganization(account) &&
      (await getMembership(ctx, account._id, creator._id))?.role === "viewer"
    ) {
      fail("WALLET_READ_ONLY", "This wallet is read-only.");
    }
    assertAmount(args.amountPoisha);
    const note = normalizeNote(args.note);
    const category = args.category
      ? normalizeBudgetCategory(args.category)
      : undefined;
    const idempotencyKey = normalizeIdempotencyKey(args.idempotencyKey);
    const recipientHandle = normalizeHandle(args.recipientHandle);
    const recipient = await ctx.db
      .query("users")
      .withIndex("by_handleNormalized", (q) =>
        q.eq("handleNormalized", recipientHandle),
      )
      .unique();
    if (!recipient) fail("RECIPIENT_NOT_FOUND", "Recipient was not found.");
    if (recipient._id === creator._id && !isOrganization(account)) {
      fail("SELF_TRANSFER", "Choose another person as the recipient.");
    }
    if (!Number.isSafeInteger(args.executeAt)) {
      fail("INVALID_SCHEDULE_TIME", "Choose a valid schedule time.");
    }

    const existing = await ctx.db
      .query("scheduledTransfers")
      .withIndex("by_creatorUserId_and_idempotencyKey", (q) =>
        q.eq("creatorUserId", creator._id).eq("idempotencyKey", idempotencyKey),
      )
      .unique();
    if (existing) {
      const sameIntent =
        existing.sourceAccountId === account._id &&
        existing.recipientUserId === recipient._id &&
        existing.amountPoisha === args.amountPoisha &&
        existing.note === note &&
        existing.category === category &&
        existing.executeAt === args.executeAt;
      if (!sameIntent) {
        fail(
          "IDEMPOTENCY_CONFLICT",
          "Schedule key belongs to another transfer.",
        );
      }
      return await summary(ctx, existing);
    }

    const now = Date.now();
    if (
      args.executeAt < now + MIN_SCHEDULE_DELAY_MS ||
      args.executeAt > now + MAX_SCHEDULE_AHEAD_MS
    ) {
      fail(
        "INVALID_SCHEDULE_TIME",
        "Schedule between one minute and one year ahead.",
      );
    }
    const pending = await ctx.db
      .query("scheduledTransfers")
      .withIndex("by_sourceAccountId_and_status_and_executeAt", (q) =>
        q.eq("sourceAccountId", account._id).eq("status", "pending"),
      )
      .take(MAX_PENDING_SCHEDULES);
    if (pending.length >= MAX_PENDING_SCHEDULES) {
      fail("SCHEDULE_LIMIT", "Pending schedule limit reached.");
    }
    await limitFeatureCreation(ctx, String(creator._id));
    const scheduledTransferId = await ctx.db.insert("scheduledTransfers", {
      creatorUserId: creator._id,
      sourceAccountId: account._id,
      recipientUserId: recipient._id,
      amountPoisha: args.amountPoisha,
      ...(note ? { note } : {}),
      ...(category ? { category } : {}),
      executeAt: args.executeAt,
      idempotencyKey,
      status: "pending",
      createdAt: now,
    });
    const scheduledFunctionId: Id<"_scheduled_functions"> =
      await ctx.scheduler.runAt(
        args.executeAt,
        internal.scheduledTransfers.execute,
        {
          scheduledTransferId,
        },
      );
    await ctx.db.patch("scheduledTransfers", scheduledTransferId, {
      scheduledFunctionId,
    });
    const scheduled = await ctx.db.get(
      "scheduledTransfers",
      scheduledTransferId,
    );
    if (!scheduled) fail("SCHEDULE_NOT_FOUND", "Schedule was not found.");
    return await summary(ctx, scheduled);
  },
});

export const list = query({
  args: { status: v.optional(statusValidator), limit: v.optional(v.number()) },
  returns: v.array(scheduleValidator),
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const { account } = await getActiveWalletAccess(ctx, user);
    const limit = args.limit ?? 30;
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 50) {
      fail("INVALID_LIMIT", "Limit must be between 1 and 50.");
    }
    const status = args.status;
    const schedules = status
      ? await ctx.db
          .query("scheduledTransfers")
          .withIndex("by_sourceAccountId_and_status_and_executeAt", (q) =>
            q.eq("sourceAccountId", account._id).eq("status", status),
          )
          .order("desc")
          .take(limit)
      : await ctx.db
          .query("scheduledTransfers")
          .withIndex("by_sourceAccountId_and_executeAt", (q) =>
            q.eq("sourceAccountId", account._id),
          )
          .order("desc")
          .take(limit);
    return await Promise.all(
      schedules.map((scheduled) => summary(ctx, scheduled)),
    );
  },
});

export const cancel = mutation({
  args: { scheduledTransferId: v.id("scheduledTransfers") },
  returns: scheduleValidator,
  handler: async (ctx, args) => {
    const actor = await requireCurrentUser(ctx);
    const scheduled = await ctx.db.get(
      "scheduledTransfers",
      args.scheduledTransferId,
    );
    if (!scheduled) fail("SCHEDULE_NOT_FOUND", "Schedule was not found.");
    const account = await ctx.db.get("accounts", scheduled.sourceAccountId);
    if (!account) fail("SCHEDULE_NOT_FOUND", "Schedule was not found.");
    const membership = isOrganization(account)
      ? await getMembership(ctx, account._id, actor._id)
      : null;
    const authorized = isOrganization(account)
      ? membership?.role === "owner" ||
        membership?.role === "admin" ||
        Boolean(
          scheduled.creatorUserId === actor._id &&
            membership &&
            membership.role !== "viewer",
        )
      : scheduled.creatorUserId === actor._id && account.userId === actor._id;
    if (!authorized) fail("SCHEDULE_NOT_FOUND", "Schedule was not found.");
    if (scheduled.status !== "pending") {
      fail(
        "INVALID_SCHEDULE_STATE",
        "Only pending transfers can be cancelled.",
      );
    }
    if (scheduled.scheduledFunctionId) {
      await ctx.scheduler.cancel(scheduled.scheduledFunctionId);
    }
    const resolvedAt = Date.now();
    await ctx.db.patch("scheduledTransfers", scheduled._id, {
      status: "cancelled",
      resolvedAt,
    });
    const updated = await ctx.db.get("scheduledTransfers", scheduled._id);
    if (!updated) fail("SCHEDULE_NOT_FOUND", "Schedule was not found.");
    return await summary(ctx, updated);
  },
});

export const performExecutionTransfer = internalMutation({
  args: { scheduledTransferId: v.id("scheduledTransfers") },
  returns: v.object({ transferId: v.id("transfers"), createdAt: v.number() }),
  handler: async (ctx, args) => {
    const scheduled = await ctx.db.get(
      "scheduledTransfers",
      args.scheduledTransferId,
    );
    if (!scheduled || scheduled.status !== "pending") {
      fail("INVALID_SCHEDULE_STATE", "Schedule is no longer pending.");
    }
    const [creator, sourceAccount, recipient] = await Promise.all([
      ctx.db.get("users", scheduled.creatorUserId),
      ctx.db.get("accounts", scheduled.sourceAccountId),
      ctx.db.get("users", scheduled.recipientUserId),
    ]);
    if (!creator || !sourceAccount || !recipient) {
      fail("ACCOUNT_NOT_FOUND", "Scheduled transfer data is unavailable.");
    }
    const recipientAccount = await getAccountForUser(ctx, recipient._id);
    const receipt = await commitTransfer(ctx, {
      sender: creator,
      senderAccount: sourceAccount,
      recipient,
      recipientAccount,
      amountPoisha: scheduled.amountPoisha,
      note: scheduled.note,
      category: scheduled.category,
      idempotencyKey: `schedule:${String(scheduled._id)}`,
      operationKind: "schedule",
    });
    return { transferId: receipt.transferId, createdAt: receipt.createdAt };
  },
});

export const execute = internalMutation({
  args: { scheduledTransferId: v.id("scheduledTransfers") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const scheduled = await ctx.db.get(
      "scheduledTransfers",
      args.scheduledTransferId,
    );
    if (!scheduled || scheduled.status !== "pending") return null;
    const resolvedAt = Date.now();
    if (resolvedAt < scheduled.executeAt) return null;
    const [creator, sourceAccount, recipient] = await Promise.all([
      ctx.db.get("users", scheduled.creatorUserId),
      ctx.db.get("accounts", scheduled.sourceAccountId),
      ctx.db.get("users", scheduled.recipientUserId),
    ]);
    if (!creator || !sourceAccount || !recipient) {
      await ctx.db.patch("scheduledTransfers", scheduled._id, {
        status: "failed",
        failureCode: "MISSING_DATA",
        resolvedAt,
      });
      return null;
    }
    const membership = isOrganization(sourceAccount)
      ? await getMembership(ctx, sourceAccount._id, creator._id)
      : null;
    const canDebit = isOrganization(sourceAccount)
      ? Boolean(membership && membership.role !== "viewer")
      : sourceAccount.userId === creator._id;
    if (!canDebit) {
      await ctx.db.patch("scheduledTransfers", scheduled._id, {
        status: "failed",
        failureCode: "ACCESS_REVOKED",
        resolvedAt,
      });
      return null;
    }
    let receipt: { transferId: Id<"transfers">; createdAt: number };
    try {
      receipt = await ctx.runMutation(
        internal.scheduledTransfers.performExecutionTransfer,
        { scheduledTransferId: scheduled._id },
      );
    } catch (error) {
      const code =
        error instanceof ConvexError &&
        typeof error.data === "object" &&
        error.data !== null &&
        "code" in error.data &&
        typeof error.data.code === "string"
          ? error.data.code
          : null;
      if (!code || !EXPECTED_EXECUTION_FAILURES.has(code)) throw error;
      await ctx.db.patch("scheduledTransfers", scheduled._id, {
        status: "failed",
        failureCode: code,
        resolvedAt,
      });
      return null;
    }
    await ctx.db.patch("scheduledTransfers", scheduled._id, {
      status: "completed",
      transferId: receipt.transferId,
      resolvedAt: receipt.createdAt,
    });
    return null;
  },
});
