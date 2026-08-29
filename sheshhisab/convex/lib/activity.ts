import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { userSummary } from "./auth";
import { fail } from "./errors";

type ReadCtx = QueryCtx | MutationCtx;

export async function activityItemForEntry(
  ctx: ReadCtx,
  entry: Doc<"ledgerEntries">,
) {
  const transfer = await ctx.db.get("transfers", entry.transferId);
  if (!transfer) {
    fail(
      "ACTIVITY_CORRUPT",
      "A transfer in this activity could not be loaded.",
    );
  }
  const counterpartyId =
    entry.direction === "debit" ? transfer.recipientId : transfer.senderId;
  const counterparty = await ctx.db.get("users", counterpartyId);
  if (!counterparty) {
    fail("ACTIVITY_CORRUPT", "A person in this activity could not be loaded.");
  }
  return {
    transferId: transfer._id,
    publicId: transfer.publicId,
    direction: entry.direction,
    amountPoisha: entry.amountPoisha,
    note: transfer.note ?? null,
    createdAt: transfer.createdAt,
    balanceAfterPoisha: entry.balanceAfterPoisha,
    counterparty: userSummary(counterparty),
  };
}
