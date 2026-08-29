import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { activityItemForEntry } from "./lib/activity";
import { requireCurrentUser } from "./lib/auth";
import { fail } from "./lib/errors";
import {
  activityItemValidator,
  statementDayValidator,
  statementSummaryValidator,
} from "./lib/validators";
import { getActiveWalletAccess } from "./lib/wallets";

const DAY_MS = 24 * 60 * 60 * 1_000;
export const MAX_STATEMENT_RANGE_MS = 93 * DAY_MS;
export const MAX_STATEMENT_ENTRIES = 250;

type StatementTotals = {
  entryCount: number;
  creditCount: number;
  debitCount: number;
  creditTotalPoisha: bigint;
  debitTotalPoisha: bigint;
  largestCreditPoisha: bigint;
  largestDebitPoisha: bigint;
};

function emptyTotals(): StatementTotals {
  return {
    entryCount: 0,
    creditCount: 0,
    debitCount: 0,
    creditTotalPoisha: 0n,
    debitTotalPoisha: 0n,
    largestCreditPoisha: 0n,
    largestDebitPoisha: 0n,
  };
}

function addEntry(totals: StatementTotals, entry: Doc<"ledgerEntries">) {
  totals.entryCount += 1;
  if (entry.direction === "credit") {
    totals.creditCount += 1;
    totals.creditTotalPoisha += entry.amountPoisha;
    if (entry.amountPoisha > totals.largestCreditPoisha) {
      totals.largestCreditPoisha = entry.amountPoisha;
    }
  } else {
    totals.debitCount += 1;
    totals.debitTotalPoisha += entry.amountPoisha;
    if (entry.amountPoisha > totals.largestDebitPoisha) {
      totals.largestDebitPoisha = entry.amountPoisha;
    }
  }
}

function startOfUtcDay(timestamp: number): number {
  return Math.floor(timestamp / DAY_MS) * DAY_MS;
}

export const get = query({
  args: {
    fromInclusive: v.number(),
    toExclusive: v.number(),
  },
  returns: v.object({
    summary: statementSummaryValidator,
    days: v.array(statementDayValidator),
    entries: v.array(activityItemValidator),
  }),
  handler: async (ctx, args) => {
    if (
      !Number.isSafeInteger(args.fromInclusive) ||
      !Number.isSafeInteger(args.toExclusive) ||
      args.fromInclusive < 0 ||
      args.toExclusive <= args.fromInclusive
    ) {
      fail("INVALID_STATEMENT_RANGE", "Choose a valid statement period.");
    }
    if (args.toExclusive - args.fromInclusive > MAX_STATEMENT_RANGE_MS) {
      fail(
        "STATEMENT_RANGE_TOO_LARGE",
        "Statement periods can cover up to 93 days.",
      );
    }

    const viewer = await requireCurrentUser(ctx);
    const { account } = await getActiveWalletAccess(ctx, viewer);
    const ledgerEntries = await ctx.db
      .query("ledgerEntries")
      .withIndex("by_accountId_and_createdAt", (q) =>
        q
          .eq("accountId", account._id)
          .gte("createdAt", args.fromInclusive)
          .lt("createdAt", args.toExclusive),
      )
      .order("asc")
      .take(MAX_STATEMENT_ENTRIES + 1);

    if (ledgerEntries.length > MAX_STATEMENT_ENTRIES) {
      fail(
        "STATEMENT_TOO_LARGE",
        "Choose a shorter period to view every transaction.",
      );
    }

    const totals = emptyTotals();
    const totalsByDay = new Map<number, StatementTotals>();
    for (const entry of ledgerEntries) {
      addEntry(totals, entry);
      const dayStart = startOfUtcDay(entry.createdAt);
      const dayTotals = totalsByDay.get(dayStart) ?? emptyTotals();
      addEntry(dayTotals, entry);
      totalsByDay.set(dayStart, dayTotals);
    }

    const firstEntry = ledgerEntries[0] ?? null;
    const lastEntry = ledgerEntries.at(-1) ?? null;
    const openingBalancePoisha = firstEntry
      ? firstEntry.direction === "credit"
        ? firstEntry.balanceAfterPoisha - firstEntry.amountPoisha
        : firstEntry.balanceAfterPoisha + firstEntry.amountPoisha
      : null;
    const entries = await Promise.all(
      [...ledgerEntries]
        .reverse()
        .map((entry) => activityItemForEntry(ctx, entry)),
    );

    return {
      summary: {
        fromInclusive: args.fromInclusive,
        toExclusive: args.toExclusive,
        entryCount: totals.entryCount,
        creditCount: totals.creditCount,
        debitCount: totals.debitCount,
        creditTotalPoisha: totals.creditTotalPoisha,
        debitTotalPoisha: totals.debitTotalPoisha,
        netPoisha: totals.creditTotalPoisha - totals.debitTotalPoisha,
        largestCreditPoisha: totals.largestCreditPoisha,
        largestDebitPoisha: totals.largestDebitPoisha,
        openingBalancePoisha,
        closingBalancePoisha: lastEntry?.balanceAfterPoisha ?? null,
      },
      days: [...totalsByDay.entries()].map(([dayStart, dayTotals]) => ({
        dayStart,
        entryCount: dayTotals.entryCount,
        creditTotalPoisha: dayTotals.creditTotalPoisha,
        debitTotalPoisha: dayTotals.debitTotalPoisha,
        netPoisha: dayTotals.creditTotalPoisha - dayTotals.debitTotalPoisha,
      })),
      entries,
    };
  },
});
