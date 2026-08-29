import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { userSummary } from "./auth";
import { normalizeBudgetCategory, recordBudgetSpend } from "./budgets";
import { fail } from "./errors";
import {
  assertAmount,
  calculateTransferBalances,
  normalizeIdempotencyKey,
  normalizeNote,
} from "./money";
import { createInboxNotification } from "./notifications";

type ReadCtx = QueryCtx | MutationCtx;

type CommitTransferArgs = {
  sender: Doc<"users">;
  senderAccount?: Doc<"accounts">;
  recipient: Doc<"users">;
  recipientAccount?: Doc<"accounts">;
  amountPoisha: bigint;
  note?: string;
  category?: string;
  idempotencyKey: string;
  requestId?: Id<"moneyRequests">;
};

export async function findIdempotentTransfer(
  ctx: ReadCtx,
  input: CommitTransferArgs,
): Promise<Doc<"transfers"> | null> {
  const note = normalizeNote(input.note);
  const category = input.category
    ? normalizeBudgetCategory(input.category)
    : undefined;
  const idempotencyKey = normalizeIdempotencyKey(input.idempotencyKey);
  const existing = await ctx.db
    .query("transfers")
    .withIndex("by_senderId_and_idempotencyKey", (q) =>
      q.eq("senderId", input.sender._id).eq("idempotencyKey", idempotencyKey),
    )
    .unique();
  if (!existing) {
    return null;
  }
  const intendedSenderAccount =
    input.senderAccount ?? (await getAccountForUser(ctx, input.sender._id));
  const existingSenderAccountId =
    existing.senderAccountId ??
    (await getAccountForUser(ctx, existing.senderId))._id;
  const intendedRecipientAccount =
    input.recipientAccount ??
    (await getAccountForUser(ctx, input.recipient._id));
  const existingRecipientAccountId =
    existing.recipientAccountId ??
    (await getAccountForUser(ctx, existing.recipientId))._id;
  const sameIntent =
    existing.recipientId === input.recipient._id &&
    existingSenderAccountId === intendedSenderAccount._id &&
    existingRecipientAccountId === intendedRecipientAccount._id &&
    existing.amountPoisha === input.amountPoisha &&
    existing.note === note &&
    existing.category === category &&
    existing.requestId === input.requestId;
  if (!sameIntent) {
    fail(
      "IDEMPOTENCY_CONFLICT",
      "This payment key was already used for a different payment.",
    );
  }
  return existing;
}

export async function getAccountForUser(ctx: ReadCtx, userId: Id<"users">) {
  const account = await ctx.db
    .query("accounts")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique();
  if (!account) {
    fail("ACCOUNT_NOT_FOUND", "Wallet account was not found.");
  }
  return account;
}

export async function receiptForTransfer(
  ctx: ReadCtx,
  transfer: Doc<"transfers">,
) {
  const [
    sender,
    recipient,
    legacySenderAccount,
    legacyRecipientAccount,
    entries,
  ] = await Promise.all([
    ctx.db.get("users", transfer.senderId),
    ctx.db.get("users", transfer.recipientId),
    getAccountForUser(ctx, transfer.senderId),
    getAccountForUser(ctx, transfer.recipientId),
    ctx.db
      .query("ledgerEntries")
      .withIndex("by_transferId", (q) => q.eq("transferId", transfer._id))
      .take(3),
  ]);
  if (!sender || !recipient) {
    fail("RECEIPT_CORRUPT", "The receipt participants could not be loaded.");
  }
  const senderAccountId = transfer.senderAccountId ?? legacySenderAccount._id;
  const recipientAccountId =
    transfer.recipientAccountId ?? legacyRecipientAccount._id;
  const debit = entries.find((entry) => entry.direction === "debit");
  const credit = entries.find((entry) => entry.direction === "credit");
  if (
    !debit ||
    !credit ||
    entries.length !== 2 ||
    debit.accountId !== senderAccountId ||
    credit.accountId !== recipientAccountId ||
    debit.amountPoisha !== transfer.amountPoisha ||
    credit.amountPoisha !== transfer.amountPoisha
  ) {
    fail("RECEIPT_CORRUPT", "The receipt ledger is not balanced.");
  }
  return {
    transferId: transfer._id,
    publicId: transfer.publicId,
    sender: userSummary(sender),
    recipient: userSummary(recipient),
    amountPoisha: transfer.amountPoisha,
    note: transfer.note ?? null,
    category: transfer.category ?? null,
    createdAt: transfer.createdAt,
    debitEntryId: debit._id,
    creditEntryId: credit._id,
    debitAmountPoisha: debit.amountPoisha,
    creditAmountPoisha: credit.amountPoisha,
    ledgerDifferencePoisha: credit.amountPoisha - debit.amountPoisha,
  };
}

export async function commitTransfer(
  ctx: MutationCtx,
  input: CommitTransferArgs,
) {
  assertAmount(input.amountPoisha);
  const note = normalizeNote(input.note);
  const category = input.category
    ? normalizeBudgetCategory(input.category)
    : undefined;
  const idempotencyKey = normalizeIdempotencyKey(input.idempotencyKey);

  if (
    input.sender._id === input.recipient._id &&
    input.senderAccount?.kind !== "organization"
  ) {
    fail("SELF_TRANSFER", "Choose another person as the recipient.");
  }

  const existing = await findIdempotentTransfer(ctx, input);
  if (existing) {
    return await receiptForTransfer(ctx, existing);
  }

  const [senderAccount, recipientAccount] = await Promise.all([
    input.senderAccount ?? getAccountForUser(ctx, input.sender._id),
    input.recipientAccount ?? getAccountForUser(ctx, input.recipient._id),
  ]);
  const createdAt = Date.now();
  const { senderBalanceAfterPoisha, recipientBalanceAfterPoisha } =
    calculateTransferBalances(
      senderAccount.balancePoisha,
      recipientAccount.balancePoisha,
      input.amountPoisha,
    );
  const transferId = await ctx.db.insert("transfers", {
    publicId: "",
    idempotencyKey,
    senderId: input.sender._id,
    recipientId: input.recipient._id,
    senderAccountId: senderAccount._id,
    recipientAccountId: recipientAccount._id,
    amountPoisha: input.amountPoisha,
    ...(note ? { note } : {}),
    ...(category ? { category } : {}),
    ...(input.requestId ? { requestId: input.requestId } : {}),
    createdAt,
  });
  const publicId = String(transferId);

  await ctx.db.patch("transfers", transferId, { publicId });
  await ctx.db.patch("accounts", senderAccount._id, {
    balancePoisha: senderBalanceAfterPoisha,
  });
  await ctx.db.patch("accounts", recipientAccount._id, {
    balancePoisha: recipientBalanceAfterPoisha,
  });
  await recordBudgetSpend(ctx, {
    accountId: senderAccount._id,
    category,
    amountPoisha: input.amountPoisha,
    createdAt,
  });
  const debitEntryId = await ctx.db.insert("ledgerEntries", {
    transferId,
    accountId: senderAccount._id,
    direction: "debit",
    amountPoisha: input.amountPoisha,
    balanceAfterPoisha: senderBalanceAfterPoisha,
    createdAt,
  });
  const creditEntryId = await ctx.db.insert("ledgerEntries", {
    transferId,
    accountId: recipientAccount._id,
    direction: "credit",
    amountPoisha: input.amountPoisha,
    balanceAfterPoisha: recipientBalanceAfterPoisha,
    createdAt,
  });
  await createInboxNotification(ctx, {
    recipientUserId: input.recipient._id,
    kind: "transfer",
    eventKey: "transfer.received",
    referenceId: publicId,
    createdAt,
  });

  return {
    transferId,
    publicId,
    sender: userSummary(input.sender),
    recipient: userSummary(input.recipient),
    amountPoisha: input.amountPoisha,
    note: note ?? null,
    category: category ?? null,
    createdAt,
    debitEntryId,
    creditEntryId,
    debitAmountPoisha: input.amountPoisha,
    creditAmountPoisha: input.amountPoisha,
    ledgerDifferencePoisha: BigInt(0),
  };
}
