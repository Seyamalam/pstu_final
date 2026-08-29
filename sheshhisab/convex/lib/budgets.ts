import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { fail } from "./errors";

export const BUDGET_CATEGORIES = [
  "food",
  "transport",
  "shopping",
  "bills",
  "education",
  "health",
  "entertainment",
  "giving",
  "travel",
  "split",
  "other",
] as const;

export type BudgetCategory = (typeof BUDGET_CATEGORIES)[number];

export function normalizeBudgetCategory(value: string): BudgetCategory {
  const category = value.trim().toLowerCase();
  if (!(BUDGET_CATEGORIES as readonly string[]).includes(category)) {
    fail("INVALID_CATEGORY", "Choose a supported category.");
  }
  return category as BudgetCategory;
}

export async function recordBudgetSpend(
  ctx: MutationCtx,
  input: {
    accountId: Id<"accounts">;
    category?: string;
    amountPoisha: bigint;
    createdAt: number;
  },
) {
  if (!input.category) return;
  const category = normalizeBudgetCategory(input.category);
  const budget = await ctx.db
    .query("budgets")
    .withIndex("by_accountId_and_category", (q) =>
      q.eq("accountId", input.accountId).eq("category", category),
    )
    .unique();
  if (
    budget &&
    input.createdAt >= budget.periodStart &&
    input.createdAt < budget.periodEnd
  ) {
    await ctx.db.patch("budgets", budget._id, {
      spentPoisha: budget.spentPoisha + input.amountPoisha,
      updatedAt: input.createdAt,
    });
  }
}
