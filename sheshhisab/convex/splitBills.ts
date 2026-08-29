import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { requireCurrentUser, userSummary } from "./lib/auth";
import { fail } from "./lib/errors";
import {
  assertAmount,
  normalizeHandle,
  normalizeIdempotencyKey,
} from "./lib/money";
import { createInboxNotification } from "./lib/notifications";
import { limitFeatureCreation, limitTransfer } from "./lib/rateLimits";
import { commitTransfer, receiptForTransfer } from "./lib/transfers";
import { receiptValidator } from "./lib/validators";
import {
  getMembership,
  isOrganization,
  requireActiveWalletOperator,
} from "./lib/wallets";

type ReadCtx = QueryCtx | MutationCtx;

const MAX_PARTICIPANTS = 20;
const MAX_OPEN_BILLS = 25;

const participantStatusValidator = v.union(
  v.literal("pending"),
  v.literal("paid"),
);
const billStatusValidator = v.union(v.literal("open"), v.literal("settled"));

const userValidator = v.object({
  id: v.id("users"),
  handle: v.string(),
  displayName: v.string(),
  avatarSeed: v.string(),
});

const participantValidator = v.object({
  id: v.id("splitParticipants"),
  user: userValidator,
  sharePoisha: v.int64(),
  contributedPoisha: v.int64(),
  status: participantStatusValidator,
});

const billValidator = v.object({
  id: v.id("splitBills"),
  creator: userValidator,
  receivingAccountId: v.id("accounts"),
  title: v.string(),
  totalPoisha: v.int64(),
  contributedTotalPoisha: v.int64(),
  status: billStatusValidator,
  participants: v.array(participantValidator),
  createdAt: v.number(),
  settledAt: v.union(v.number(), v.null()),
});

function normalizeTitle(value: string) {
  const title = value.trim().replace(/\s+/g, " ");
  if (title.length < 2 || title.length > 80) {
    fail("INVALID_SPLIT_TITLE", "Title must be 2 to 80 characters.");
  }
  return title;
}

async function participantsForBill(
  ctx: ReadCtx,
  billId: Doc<"splitBills">["_id"],
) {
  const participants = await ctx.db
    .query("splitParticipants")
    .withIndex("by_billId_and_status", (q) => q.eq("billId", billId))
    .take(MAX_PARTICIPANTS + 1);
  if (participants.length > MAX_PARTICIPANTS) {
    fail("SPLIT_CORRUPT", "Split has too many participants.");
  }
  return participants;
}

async function billSummary(ctx: ReadCtx, bill: Doc<"splitBills">) {
  const [creator, participants] = await Promise.all([
    ctx.db.get("users", bill.creatorUserId),
    participantsForBill(ctx, bill._id),
  ]);
  if (!creator) fail("SPLIT_CORRUPT", "Split creator could not be loaded.");
  const items = await Promise.all(
    participants.map(async (participant) => {
      const user = await ctx.db.get("users", participant.userId);
      if (!user) fail("SPLIT_CORRUPT", "Participant could not be loaded.");
      return {
        id: participant._id,
        user: userSummary(user),
        sharePoisha: participant.sharePoisha,
        contributedPoisha: participant.contributedPoisha,
        status: participant.status,
      };
    }),
  );
  return {
    id: bill._id,
    creator: userSummary(creator),
    receivingAccountId: bill.receivingAccountId,
    title: bill.title,
    totalPoisha: bill.totalPoisha,
    contributedTotalPoisha: items.reduce(
      (sum, participant) => sum + participant.contributedPoisha,
      0n,
    ),
    status: bill.status,
    participants: items,
    createdAt: bill.createdAt,
    settledAt: bill.settledAt ?? null,
  };
}

async function requireBillAccess(
  ctx: ReadCtx,
  bill: Doc<"splitBills">,
  userId: Doc<"users">["_id"],
) {
  if (bill.creatorUserId === userId) return;
  const participant = await ctx.db
    .query("splitParticipants")
    .withIndex("by_billId_and_userId", (q) =>
      q.eq("billId", bill._id).eq("userId", userId),
    )
    .unique();
  if (participant) return;
  const account = await ctx.db.get("accounts", bill.receivingAccountId);
  if (account && isOrganization(account)) {
    const membership = await getMembership(ctx, account._id, userId);
    if (membership) return;
  }
  fail("SPLIT_NOT_FOUND", "Split was not found.");
}

export const create = mutation({
  args: {
    title: v.string(),
    participants: v.array(
      v.object({ handle: v.string(), sharePoisha: v.int64() }),
    ),
    idempotencyKey: v.string(),
  },
  returns: billValidator,
  handler: async (ctx, args) => {
    const creator = await requireCurrentUser(ctx);
    const { account } = await requireActiveWalletOperator(ctx, creator);
    const title = normalizeTitle(args.title);
    const idempotencyKey = normalizeIdempotencyKey(args.idempotencyKey);
    if (
      args.participants.length < 1 ||
      args.participants.length > MAX_PARTICIPANTS
    ) {
      fail("INVALID_PARTICIPANTS", `Choose 1 to ${MAX_PARTICIPANTS} people.`);
    }
    const handles = new Set<string>();
    const normalizedParticipants = args.participants.map((participant) => {
      const handle = normalizeHandle(participant.handle);
      assertAmount(participant.sharePoisha);
      if (handles.has(handle))
        fail("DUPLICATE_PARTICIPANT", "Each person can appear once.");
      handles.add(handle);
      return { handle, sharePoisha: participant.sharePoisha };
    });
    const users = await Promise.all(
      normalizedParticipants.map(async (participant) => {
        const user = await ctx.db
          .query("users")
          .withIndex("by_handleNormalized", (q) =>
            q.eq("handleNormalized", participant.handle),
          )
          .unique();
        if (!user || user._id === creator._id) {
          fail("PARTICIPANT_NOT_FOUND", "Participant was not found.");
        }
        return { user, sharePoisha: participant.sharePoisha };
      }),
    );
    const totalPoisha = users.reduce(
      (sum, participant) => sum + participant.sharePoisha,
      0n,
    );
    assertAmount(totalPoisha);

    const existing = await ctx.db
      .query("splitBills")
      .withIndex("by_creatorUserId_and_idempotencyKey", (q) =>
        q.eq("creatorUserId", creator._id).eq("idempotencyKey", idempotencyKey),
      )
      .unique();
    if (existing) {
      const existingParticipants = await participantsForBill(ctx, existing._id);
      const expectedShares = new Map(
        users.map((participant) => [
          participant.user._id,
          participant.sharePoisha,
        ]),
      );
      const sameParticipants =
        existingParticipants.length === users.length &&
        existingParticipants.every(
          (participant) =>
            expectedShares.get(participant.userId) === participant.sharePoisha,
        );
      if (
        existing.receivingAccountId !== account._id ||
        existing.title !== title ||
        existing.totalPoisha !== totalPoisha ||
        !sameParticipants
      ) {
        fail("IDEMPOTENCY_CONFLICT", "Split key belongs to another bill.");
      }
      return await billSummary(ctx, existing);
    }

    const open = await ctx.db
      .query("splitBills")
      .withIndex("by_creatorUserId_and_status_and_createdAt", (q) =>
        q.eq("creatorUserId", creator._id).eq("status", "open"),
      )
      .take(MAX_OPEN_BILLS);
    if (open.length >= MAX_OPEN_BILLS)
      fail("SPLIT_LIMIT", "Open split limit reached.");
    await limitFeatureCreation(ctx, String(creator._id));
    const createdAt = Date.now();
    const billId = await ctx.db.insert("splitBills", {
      creatorUserId: creator._id,
      receivingAccountId: account._id,
      title,
      totalPoisha,
      idempotencyKey,
      status: "open",
      createdAt,
    });
    for (const participant of users) {
      await ctx.db.insert("splitParticipants", {
        billId,
        userId: participant.user._id,
        sharePoisha: participant.sharePoisha,
        contributedPoisha: 0n,
        status: "pending",
        createdAt,
      });
      await createInboxNotification(ctx, {
        recipientUserId: participant.user._id,
        kind: "request",
        eventKey: "split.invited",
        referenceId: String(billId),
        createdAt,
      });
    }
    const bill = await ctx.db.get("splitBills", billId);
    if (!bill) fail("SPLIT_NOT_FOUND", "Split was not found.");
    return await billSummary(ctx, bill);
  },
});

export const get = query({
  args: { billId: v.id("splitBills") },
  returns: billValidator,
  handler: async (ctx, args) => {
    const viewer = await requireCurrentUser(ctx);
    const bill = await ctx.db.get("splitBills", args.billId);
    if (!bill) fail("SPLIT_NOT_FOUND", "Split was not found.");
    await requireBillAccess(ctx, bill, viewer._id);
    return await billSummary(ctx, bill);
  },
});

export const list = query({
  args: {
    role: v.union(v.literal("owner"), v.literal("participant")),
    status: v.optional(billStatusValidator),
    limit: v.optional(v.number()),
  },
  returns: v.array(billValidator),
  handler: async (ctx, args) => {
    const viewer = await requireCurrentUser(ctx);
    const limit = args.limit ?? 30;
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 50) {
      fail("INVALID_LIMIT", "Limit must be between 1 and 50.");
    }
    if (args.role === "owner") {
      const status = args.status;
      const bills = status
        ? await ctx.db
            .query("splitBills")
            .withIndex("by_creatorUserId_and_status_and_createdAt", (q) =>
              q.eq("creatorUserId", viewer._id).eq("status", status),
            )
            .order("desc")
            .take(limit)
        : await ctx.db
            .query("splitBills")
            .withIndex("by_creatorUserId_and_createdAt", (q) =>
              q.eq("creatorUserId", viewer._id),
            )
            .order("desc")
            .take(limit);
      return await Promise.all(bills.map((bill) => billSummary(ctx, bill)));
    }

    const participantRows = await ctx.db
      .query("splitParticipants")
      .withIndex("by_userId_and_billId", (q) => q.eq("userId", viewer._id))
      .order("desc")
      .take(50);
    const bills = await Promise.all(
      participantRows.map((participant) =>
        ctx.db.get("splitBills", participant.billId),
      ),
    );
    return await Promise.all(
      bills
        .filter(
          (bill): bill is Doc<"splitBills"> =>
            bill !== null && (!args.status || bill.status === args.status),
        )
        .slice(0, limit)
        .map((bill) => billSummary(ctx, bill)),
    );
  },
});

export const contribute = mutation({
  args: {
    billId: v.id("splitBills"),
    amountPoisha: v.int64(),
    idempotencyKey: v.string(),
  },
  returns: v.object({
    bill: billValidator,
    participant: participantValidator,
    receipt: receiptValidator,
  }),
  handler: async (ctx, args) => {
    const contributor = await requireCurrentUser(ctx);
    assertAmount(args.amountPoisha);
    const idempotencyKey = normalizeIdempotencyKey(args.idempotencyKey);
    const [bill, participant] = await Promise.all([
      ctx.db.get("splitBills", args.billId),
      ctx.db
        .query("splitParticipants")
        .withIndex("by_billId_and_userId", (q) =>
          q.eq("billId", args.billId).eq("userId", contributor._id),
        )
        .unique(),
    ]);
    if (!bill || !participant) fail("SPLIT_NOT_FOUND", "Split was not found.");

    const existing = await ctx.db
      .query("splitContributions")
      .withIndex("by_contributorUserId_and_idempotencyKey", (q) =>
        q
          .eq("contributorUserId", contributor._id)
          .eq("idempotencyKey", idempotencyKey),
      )
      .unique();
    if (existing) {
      if (
        existing.billId !== bill._id ||
        existing.amountPoisha !== args.amountPoisha
      ) {
        fail(
          "IDEMPOTENCY_CONFLICT",
          "Contribution key belongs to another payment.",
        );
      }
      const transfer = await ctx.db.get("transfers", existing.transferId);
      if (!transfer)
        fail("SPLIT_CORRUPT", "Contribution receipt was not found.");
      return {
        bill: await billSummary(ctx, bill),
        participant: {
          id: participant._id,
          user: userSummary(contributor),
          sharePoisha: participant.sharePoisha,
          contributedPoisha: participant.contributedPoisha,
          status: participant.status,
        },
        receipt: await receiptForTransfer(ctx, transfer),
      };
    }
    if (bill.status !== "open") {
      fail("INVALID_SPLIT_STATE", "This split is already settled.");
    }
    const remainingPoisha =
      participant.sharePoisha - participant.contributedPoisha;
    if (args.amountPoisha > remainingPoisha) {
      fail("CONTRIBUTION_TOO_LARGE", "Amount is above the remaining share.");
    }
    const [{ account: senderAccount }, receivingAccount, creator] =
      await Promise.all([
        requireActiveWalletOperator(ctx, contributor),
        ctx.db.get("accounts", bill.receivingAccountId),
        ctx.db.get("users", bill.creatorUserId),
      ]);
    if (!receivingAccount || !creator) {
      fail("SPLIT_CORRUPT", "Receiving wallet could not be loaded.");
    }
    if (senderAccount._id === receivingAccount._id) {
      fail("SAME_ACCOUNT", "Choose another wallet for this contribution.");
    }
    await limitTransfer(ctx, String(contributor._id));
    const receipt = await commitTransfer(ctx, {
      sender: contributor,
      senderAccount,
      recipient: creator,
      recipientAccount: receivingAccount,
      amountPoisha: args.amountPoisha,
      note: bill.title,
      category: "split",
      idempotencyKey,
    });
    const createdAt = receipt.createdAt;
    const contributedPoisha = participant.contributedPoisha + args.amountPoisha;
    const status =
      contributedPoisha === participant.sharePoisha ? "paid" : "pending";
    await ctx.db.insert("splitContributions", {
      billId: bill._id,
      participantId: participant._id,
      contributorUserId: contributor._id,
      transferId: receipt.transferId,
      amountPoisha: args.amountPoisha,
      idempotencyKey,
      createdAt,
    });
    await ctx.db.patch("splitParticipants", participant._id, {
      contributedPoisha,
      status,
      updatedAt: createdAt,
    });
    const updatedParticipant = await ctx.db.get(
      "splitParticipants",
      participant._id,
    );
    if (!updatedParticipant)
      fail("SPLIT_CORRUPT", "Participant was not found.");
    return {
      bill: await billSummary(ctx, bill),
      participant: {
        id: updatedParticipant._id,
        user: userSummary(contributor),
        sharePoisha: updatedParticipant.sharePoisha,
        contributedPoisha: updatedParticipant.contributedPoisha,
        status: updatedParticipant.status,
      },
      receipt,
    };
  },
});

export const settle = mutation({
  args: { billId: v.id("splitBills") },
  returns: billValidator,
  handler: async (ctx, args) => {
    const actor = await requireCurrentUser(ctx);
    const bill = await ctx.db.get("splitBills", args.billId);
    if (!bill) fail("SPLIT_NOT_FOUND", "Split was not found.");
    let authorized = bill.creatorUserId === actor._id;
    if (!authorized) {
      const membership = await getMembership(
        ctx,
        bill.receivingAccountId,
        actor._id,
      );
      authorized = membership?.role === "owner" || membership?.role === "admin";
    }
    if (!authorized) fail("SPLIT_NOT_FOUND", "Split was not found.");
    if (bill.status === "settled") return await billSummary(ctx, bill);
    const pending = await ctx.db
      .query("splitParticipants")
      .withIndex("by_billId_and_status", (q) =>
        q.eq("billId", bill._id).eq("status", "pending"),
      )
      .take(1);
    if (pending.length > 0) {
      fail("SPLIT_INCOMPLETE", "Every share must be paid before settlement.");
    }
    const settledAt = Date.now();
    await ctx.db.patch("splitBills", bill._id, {
      status: "settled",
      settledAt,
    });
    const settled = await ctx.db.get("splitBills", bill._id);
    if (!settled) fail("SPLIT_NOT_FOUND", "Split was not found.");
    return await billSummary(ctx, settled);
  },
});
