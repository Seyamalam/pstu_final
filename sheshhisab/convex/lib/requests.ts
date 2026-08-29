import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { userSummary } from "./auth";
import { fail } from "./errors";

type ReadCtx = QueryCtx | MutationCtx;

export async function requestItem(ctx: ReadCtx, request: Doc<"moneyRequests">) {
  const [requester, payer, transfer] = await Promise.all([
    ctx.db.get("users", request.requesterId),
    ctx.db.get("users", request.payerId),
    request.transferId
      ? ctx.db.get("transfers", request.transferId)
      : Promise.resolve(null),
  ]);
  if (!requester || !payer) {
    fail("REQUEST_CORRUPT", "A person in this request could not be loaded.");
  }
  return {
    id: request._id,
    requester: userSummary(requester),
    payer: userSummary(payer),
    amountPoisha: request.amountPoisha,
    note: request.note ?? null,
    status: request.status,
    transferPublicId: transfer?.publicId ?? null,
    createdAt: request.createdAt,
    resolvedAt: request.resolvedAt ?? null,
  };
}
