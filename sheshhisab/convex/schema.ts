import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    handle: v.string(),
    handleNormalized: v.string(),
    displayName: v.string(),
    avatarSeed: v.string(),
    activeAccountId: v.optional(v.id("accounts")),
    createdAt: v.number(),
  })
    .index("by_tokenIdentifier", ["tokenIdentifier"])
    .index("by_handleNormalized", ["handleNormalized"]),

  accounts: defineTable({
    // Legacy rows are personal wallets. Organization-only fields are optional so
    // existing production documents remain valid without a blocking migration.
    userId: v.optional(v.id("users")),
    kind: v.optional(v.union(v.literal("personal"), v.literal("organization"))),
    name: v.optional(v.string()),
    slugNormalized: v.optional(v.string()),
    createdByUserId: v.optional(v.id("users")),
    balancePoisha: v.int64(),
    currency: v.literal("BDT"),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_slugNormalized", ["slugNormalized"]),

  walletMemberships: defineTable({
    accountId: v.id("accounts"),
    userId: v.id("users"),
    role: v.union(
      v.literal("owner"),
      v.literal("admin"),
      v.literal("treasurer"),
      v.literal("viewer"),
    ),
    addedByUserId: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_accountId_and_userId", ["accountId", "userId"])
    .index("by_userId_and_accountId", ["userId", "accountId"])
    .index("by_userId_and_role", ["userId", "role"])
    .index("by_accountId_and_role", ["accountId", "role"]),

  externalRailTransactions: defineTable({
    accountId: v.id("accounts"),
    actorUserId: v.id("users"),
    direction: v.union(v.literal("cash_in"), v.literal("cash_out")),
    provider: v.string(),
    providerKind: v.union(
      v.literal("mfs"),
      v.literal("bank"),
      v.literal("card"),
    ),
    amountPoisha: v.int64(),
    balanceAfterPoisha: v.int64(),
    referenceFingerprint: v.string(),
    referenceMasked: v.string(),
    idempotencyKey: v.string(),
    status: v.literal("completed"),
    createdAt: v.number(),
  })
    .index("by_actorUserId_and_idempotencyKey", [
      "actorUserId",
      "idempotencyKey",
    ])
    .index("by_accountId_and_createdAt", ["accountId", "createdAt"]),

  externalRailLedgerEntries: defineTable({
    transactionId: v.id("externalRailTransactions"),
    accountId: v.id("accounts"),
    direction: v.union(v.literal("debit"), v.literal("credit")),
    amountPoisha: v.int64(),
    balanceAfterPoisha: v.int64(),
    createdAt: v.number(),
  })
    .index("by_transactionId", ["transactionId"])
    .index("by_accountId_and_createdAt", ["accountId", "createdAt"]),

  notificationInbox: defineTable({
    recipientUserId: v.id("users"),
    kind: v.union(
      v.literal("rail"),
      v.literal("member"),
      v.literal("transfer"),
      v.literal("request"),
    ),
    eventKey: v.string(),
    referenceId: v.string(),
    readAt: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_recipientUserId_and_createdAt", [
    "recipientUserId",
    "createdAt",
  ]),

  notificationEndpoints: defineTable({
    userId: v.id("users"),
    platform: v.union(v.literal("web"), v.literal("android"), v.literal("ios")),
    endpoint: v.string(),
    p256dh: v.optional(v.string()),
    auth: v.optional(v.string()),
    deviceLabel: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    revokedAt: v.optional(v.number()),
  })
    .index("by_endpoint", ["endpoint"])
    .index("by_userId_and_createdAt", ["userId", "createdAt"]),

  transfers: defineTable({
    publicId: v.string(),
    idempotencyKey: v.string(),
    senderId: v.id("users"),
    recipientId: v.id("users"),
    senderAccountId: v.optional(v.id("accounts")),
    recipientAccountId: v.optional(v.id("accounts")),
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
