import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { requireCurrentUser } from "./lib/auth";
import { BUDGET_CATEGORIES, normalizeBudgetCategory } from "./lib/budgets";
import { fail } from "./lib/errors";
import { assertAmount } from "./lib/money";
import {
  getActiveWalletAccess,
  requireActiveWalletOperator,
} from "./lib/wallets";

const MAX_BUDGETS = BUDGET_CATEGORIES.length;
const MAX_PERIOD_MS = 366 * 24 * 60 * 60 * 1_000;

const budgetValidator = v.object({
  id: v.id("budgets"),
  accountId: v.id("accounts"),
  category: v.string(),
  limitPoisha: v.int64(),
  spentPoisha: v.int64(),
  periodStart: v.number(),
  periodEnd: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

function summary(budget: Doc<"budgets">) {
  return {
    id: budget._id,
    accountId: budget.accountId,
    category: budget.category,
    limitPoisha: budget.limitPoisha,
    spentPoisha: budget.spentPoisha,
    periodStart: budget.periodStart,
    periodEnd: budget.periodEnd,
    createdAt: budget.createdAt,
    updatedAt: budget.updatedAt,
  };
}

export const listCategories = query({
  args: {},
  returns: v.array(v.string()),
  handler: async (ctx) => {
    await requireCurrentUser(ctx);
    return [...BUDGET_CATEGORIES];
  },
});

export const upsert = mutation({
  args: {
    category: v.string(),
    limitPoisha: v.int64(),
    periodStart: v.number(),
    periodEnd: v.number(),
  },
  returns: budgetValidator,
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const { account } = await requireActiveWalletOperator(ctx, user);
    const updatedAt = Date.now();
    const category = normalizeBudgetCategory(args.category);
    assertAmount(args.limitPoisha);
    if (
      !Number.isSafeInteger(args.periodStart) ||
      !Number.isSafeInteger(args.periodEnd) ||
      args.periodStart < 0 ||
      args.periodEnd <= args.periodStart ||
      args.periodEnd <= updatedAt ||
      args.periodEnd - args.periodStart > MAX_PERIOD_MS
    ) {
      fail("INVALID_BUDGET_PERIOD", "Choose a valid budget period.");
    }
    const existing = await ctx.db
      .query("budgets")
      .withIndex("by_accountId_and_category", (q) =>
        q.eq("accountId", account._id).eq("category", category),
      )
      .unique();
    if (existing) {
      const changingPeriod =
        existing.periodStart !== args.periodStart ||
        existing.periodEnd !== args.periodEnd;
      const existingPeriodActive =
        updatedAt >= existing.periodStart && updatedAt < existing.periodEnd;
      if (changingPeriod && existingPeriodActive) {
        fail(
          "BUDGET_PERIOD_ACTIVE",
          "The current budget period is still active.",
        );
      }
      await ctx.db.patch("budgets", existing._id, {
        limitPoisha: args.limitPoisha,
        periodStart: args.periodStart,
        periodEnd: args.periodEnd,
        ...(changingPeriod ? { spentPoisha: 0n } : {}),
        updatedAt,
      });
      const updated = await ctx.db.get("budgets", existing._id);
      if (!updated) fail("BUDGET_NOT_FOUND", "Budget was not found.");
      return summary(updated);
    }
    const budgets = await ctx.db
      .query("budgets")
      .withIndex("by_accountId_and_periodStart", (q) =>
        q.eq("accountId", account._id),
      )
      .take(MAX_BUDGETS);
    if (budgets.length >= MAX_BUDGETS) {
      fail("BUDGET_LIMIT", "Budget limit reached.");
    }
    const id = await ctx.db.insert("budgets", {
      accountId: account._id,
      createdByUserId: user._id,
      category,
      limitPoisha: args.limitPoisha,
      spentPoisha: 0n,
      periodStart: args.periodStart,
      periodEnd: args.periodEnd,
      createdAt: updatedAt,
      updatedAt,
    });
    const budget = await ctx.db.get("budgets", id);
    if (!budget) fail("BUDGET_NOT_FOUND", "Budget was not found.");
    return summary(budget);
  },
});

export const list = query({
  args: {},
  returns: v.array(budgetValidator),
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    const { account } = await getActiveWalletAccess(ctx, user);
    const budgets = await ctx.db
      .query("budgets")
      .withIndex("by_accountId_and_periodStart", (q) =>
        q.eq("accountId", account._id),
      )
      .order("desc")
      .take(MAX_BUDGETS);
    return budgets.map(summary);
  },
});

export const remove = mutation({
  args: { budgetId: v.id("budgets") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const { account } = await requireActiveWalletOperator(ctx, user);
    const budget = await ctx.db.get("budgets", args.budgetId);
    if (!budget || budget.accountId !== account._id) {
      fail("BUDGET_NOT_FOUND", "Budget was not found.");
    }
    await ctx.db.delete("budgets", budget._id);
    return null;
  },
});
