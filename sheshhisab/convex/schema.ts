import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    handle: v.string(),
    handleNormalized: v.string(),
    displayName: v.string(),
    avatarSeed: v.string(),
    createdAt: v.number(),
  })
    .index("by_tokenIdentifier", ["tokenIdentifier"])
    .index("by_handleNormalized", ["handleNormalized"]),

  accounts: defineTable({
    userId: v.id("users"),
    balancePoisha: v.int64(),
    currency: v.literal("BDT"),
    createdAt: v.number(),
  }).index("by_userId", ["userId"]),

  transfers: defineTable({
    publicId: v.string(),
    idempotencyKey: v.string(),
    senderId: v.id("users"),
    recipientId: v.id("users"),
    amountPoisha: v.int64(),
    note: v.optional(v.string()),
    requestId: v.optional(v.id("moneyRequests")),
    createdAt: v.number(),
  })
    .index("by_senderId_and_idempotencyKey", ["senderId", "idempotencyKey"])
    .index("by_publicId", ["publicId"])
    .index("by_senderId_and_createdAt", ["senderId", "createdAt"])
    .index("by_recipientId_and_createdAt", ["recipientId", "createdAt"]),

  ledgerEntries: defineTable({
    transferId: v.id("transfers"),
    accountId: v.id("accounts"),
    direction: v.union(v.literal("debit"), v.literal("credit")),
    amountPoisha: v.int64(),
    balanceAfterPoisha: v.int64(),
    createdAt: v.number(),
  })
    .index("by_transferId", ["transferId"])
    .index("by_accountId_and_createdAt", ["accountId", "createdAt"]),

  moneyRequests: defineTable({
    requesterId: v.id("users"),
    payerId: v.id("users"),
    amountPoisha: v.int64(),
    note: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("paid"),
      v.literal("declined"),
      v.literal("cancelled"),
    ),
    transferId: v.optional(v.id("transfers")),
    createdAt: v.number(),
    resolvedAt: v.optional(v.number()),
  })
    .index("by_payerId_and_status_and_createdAt", [
      "payerId",
      "status",
      "createdAt",
    ])
    .index("by_payerId_and_createdAt", ["payerId", "createdAt"])
    .index("by_requesterId_and_createdAt", ["requesterId", "createdAt"])
    .index("by_requesterId_and_status_and_createdAt", [
      "requesterId",
      "status",
      "createdAt",
    ]),
});
