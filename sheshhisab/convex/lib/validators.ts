import { v } from "convex/values";

export const userSummaryValidator = v.object({
  id: v.id("users"),
  handle: v.string(),
  displayName: v.string(),
  avatarSeed: v.string(),
});

export const accountSummaryValidator = v.object({
  id: v.id("accounts"),
  balancePoisha: v.int64(),
  currency: v.literal("BDT"),
});

export const receiptValidator = v.object({
  transferId: v.id("transfers"),
  publicId: v.string(),
  sender: userSummaryValidator,
  recipient: userSummaryValidator,
  amountPoisha: v.int64(),
  note: v.union(v.string(), v.null()),
  createdAt: v.number(),
  debitEntryId: v.id("ledgerEntries"),
  creditEntryId: v.id("ledgerEntries"),
  debitAmountPoisha: v.int64(),
  creditAmountPoisha: v.int64(),
  ledgerDifferencePoisha: v.int64(),
});

export const activityItemValidator = v.object({
  transferId: v.id("transfers"),
  publicId: v.string(),
  direction: v.union(v.literal("debit"), v.literal("credit")),
  amountPoisha: v.int64(),
  note: v.union(v.string(), v.null()),
  createdAt: v.number(),
  balanceAfterPoisha: v.int64(),
  counterparty: userSummaryValidator,
});

export const payeeQrValidator = v.object({
  version: v.literal(1),
  kind: v.literal("payee"),
  payload: v.string(),
  payee: userSummaryValidator,
});

export const statementDayValidator = v.object({
  dayStart: v.number(),
  entryCount: v.number(),
  creditTotalPoisha: v.int64(),
  debitTotalPoisha: v.int64(),
  netPoisha: v.int64(),
});

export const statementSummaryValidator = v.object({
  fromInclusive: v.number(),
  toExclusive: v.number(),
  entryCount: v.number(),
  creditCount: v.number(),
  debitCount: v.number(),
  creditTotalPoisha: v.int64(),
  debitTotalPoisha: v.int64(),
  netPoisha: v.int64(),
  largestCreditPoisha: v.int64(),
  largestDebitPoisha: v.int64(),
  openingBalancePoisha: v.union(v.int64(), v.null()),
  closingBalancePoisha: v.union(v.int64(), v.null()),
});

export const requestStatusValidator = v.union(
  v.literal("pending"),
  v.literal("paid"),
  v.literal("declined"),
  v.literal("cancelled"),
);

export const requestItemValidator = v.object({
  id: v.id("moneyRequests"),
  requester: userSummaryValidator,
  payer: userSummaryValidator,
  amountPoisha: v.int64(),
  note: v.union(v.string(), v.null()),
  status: requestStatusValidator,
  transferPublicId: v.union(v.string(), v.null()),
  createdAt: v.number(),
  resolvedAt: v.union(v.number(), v.null()),
});
