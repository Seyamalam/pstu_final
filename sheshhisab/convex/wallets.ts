import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { requireCurrentUser, userSummary } from "./lib/auth";
import { fail } from "./lib/errors";
import { normalizeHandle } from "./lib/money";
import { createInboxNotification } from "./lib/notifications";
import { limitOrganizationChange } from "./lib/rateLimits";
import {
  accountKind,
  getMembership,
  isOrganization,
  normalizeOrganizationName,
  normalizeOrganizationSlug,
  requireWalletAccess,
  type WalletRole,
} from "./lib/wallets";

const roleValidator = v.union(
  v.literal("owner"),
  v.literal("admin"),
  v.literal("treasurer"),
  v.literal("viewer"),
);

const contextValidator = v.object({
  accountId: v.id("accounts"),
  kind: v.union(v.literal("personal"), v.literal("organization")),
  name: v.string(),
  slug: v.union(v.string(), v.null()),
  role: roleValidator,
  balancePoisha: v.int64(),
  currency: v.literal("BDT"),
});

const memberValidator = v.object({
  membershipId: v.id("walletMemberships"),
  user: v.object({
    id: v.id("users"),
    handle: v.string(),
    displayName: v.string(),
    avatarSeed: v.string(),
  }),
  role: roleValidator,
  createdAt: v.number(),
});

const auditValidator = v.object({
  id: v.id("organizationAuditEvents"),
  kind: v.union(
    v.literal("organization_created"),
    v.literal("member_added"),
    v.literal("member_role_changed"),
    v.literal("member_removed"),
  ),
  actor: memberValidator.fields.user,
  target: v.union(memberValidator.fields.user, v.null()),
  fromRole: v.union(v.string(), v.null()),
  toRole: v.union(v.string(), v.null()),
  createdAt: v.number(),
});

function assertAssignableRole(value: string): Exclude<WalletRole, "owner"> {
  if (value !== "admin" && value !== "treasurer" && value !== "viewer") {
    fail("INVALID_ROLE", "Choose admin, treasurer, or viewer.");
  }
  return value;
}

function contextForPersonal(account: Doc<"accounts">, displayName: string) {
  return {
    accountId: account._id,
    kind: "personal" as const,
    name: displayName,
    slug: null,
    role: "owner" as const,
    balancePoisha: account.balancePoisha,
    currency: account.currency,
  };
}

export const list = query({
  args: {},
  returns: v.object({
    activeAccountId: v.id("accounts"),
    contexts: v.array(contextValidator),
  }),
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    const personal = await ctx.db
      .query("accounts")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();
    if (!personal) {
      fail("ACCOUNT_NOT_FOUND", "Wallet account was not found.");
    }

    const memberships = await ctx.db
      .query("walletMemberships")
      .withIndex("by_userId_and_accountId", (q) => q.eq("userId", user._id))
      .take(51);
    if (memberships.length > 50) {
      fail("WALLET_LIMIT", "Too many wallet memberships.");
    }
    const organizationContexts = await Promise.all(
      memberships.map(async (membership) => {
        const account = await ctx.db.get("accounts", membership.accountId);
        if (!account || !isOrganization(account) || !account.name) {
          fail("WALLET_CORRUPT", "Wallet membership is invalid.");
        }
        return {
          accountId: account._id,
          kind: accountKind(account),
          name: account.name,
          slug: account.slugNormalized ?? null,
          role: membership.role,
          balancePoisha: account.balancePoisha,
          currency: account.currency,
        };
      }),
    );
    const contexts = [
      contextForPersonal(personal, user.displayName),
      ...organizationContexts,
    ];
    const preferredAccountId = user.activeAccountId;
    const activeAccountId =
      preferredAccountId &&
      contexts.some((context) => context.accountId === preferredAccountId)
        ? preferredAccountId
        : personal._id;
    return { activeAccountId, contexts };
  },
});

export const createOrganization = mutation({
  args: { name: v.string(), slug: v.string() },
  returns: contextValidator,
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const name = normalizeOrganizationName(args.name);
    const slug = normalizeOrganizationSlug(args.slug);
    const existing = await ctx.db
      .query("accounts")
      .withIndex("by_slugNormalized", (q) => q.eq("slugNormalized", slug))
      .unique();
    if (existing) {
      fail("ORG_SLUG_TAKEN", "That organization handle is unavailable.");
    }
    const owned = await ctx.db
      .query("walletMemberships")
      .withIndex("by_userId_and_role", (q) =>
        q.eq("userId", user._id).eq("role", "owner"),
      )
      .take(10);
    if (owned.length >= 10) {
      fail("ORG_LIMIT", "Organization limit reached.");
    }
    await limitOrganizationChange(ctx, String(user._id));

    const createdAt = Date.now();
    const accountId = await ctx.db.insert("accounts", {
      kind: "organization",
      name,
      slugNormalized: slug,
      createdByUserId: user._id,
      balancePoisha: 0n,
      currency: "BDT",
      createdAt,
    });
    await ctx.db.insert("walletMemberships", {
      accountId,
      userId: user._id,
      role: "owner",
      addedByUserId: user._id,
      createdAt,
    });
    await ctx.db.insert("organizationAuditEvents", {
      accountId,
      actorUserId: user._id,
      kind: "organization_created",
      createdAt,
    });
    return {
      accountId,
      kind: "organization" as const,
      name,
      slug,
      role: "owner" as const,
      balancePoisha: 0n,
      currency: "BDT" as const,
    };
  },
});

export const switchContext = mutation({
  args: { accountId: v.id("accounts") },
  returns: v.object({ activeAccountId: v.id("accounts") }),
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    await requireWalletAccess(ctx, args.accountId, user._id);
    await ctx.db.patch("users", user._id, { activeAccountId: args.accountId });
    return { activeAccountId: args.accountId };
  },
});

export const addMember = mutation({
  args: {
    accountId: v.id("accounts"),
    handle: v.string(),
    role: v.string(),
  },
  returns: memberValidator,
  handler: async (ctx, args) => {
    const actor = await requireCurrentUser(ctx);
    const access = await requireWalletAccess(ctx, args.accountId, actor._id);
    if (!isOrganization(access.account)) {
      fail("ORG_REQUIRED", "Choose an organization wallet.");
    }
    if (access.role !== "owner" && access.role !== "admin") {
      fail("FORBIDDEN", "You cannot manage members.");
    }
    const role = assertAssignableRole(args.role);
    if (access.role === "admin" && role === "admin") {
      fail("FORBIDDEN", "Only an owner can assign admins.");
    }

    const handle = normalizeHandle(args.handle);
    const target = await ctx.db
      .query("users")
      .withIndex("by_handleNormalized", (q) => q.eq("handleNormalized", handle))
      .unique();
    if (!target) {
      fail("MEMBER_NOT_FOUND", "No wallet uses that handle.");
    }
    const existing = await getMembership(ctx, args.accountId, target._id);
    if (existing?.role === "owner") {
      fail("OWNER_IMMUTABLE", "The owner role cannot be changed.");
    }
    if (access.role === "admin" && existing?.role === "admin") {
      fail("FORBIDDEN", "Only an owner can manage admins.");
    }
    if (existing?.role === role) {
      return {
        membershipId: existing._id,
        user: userSummary(target),
        role: existing.role,
        createdAt: existing.createdAt,
      };
    }

    if (!existing) {
      const members = await ctx.db
        .query("walletMemberships")
        .withIndex("by_accountId_and_role", (q) =>
          q.eq("accountId", args.accountId),
        )
        .take(50);
      if (members.length >= 50) {
        fail("MEMBER_LIMIT", "Member limit reached.");
      }
    }

    await limitOrganizationChange(ctx, String(actor._id));
    const createdAt = Date.now();
    const membershipId = existing
      ? existing._id
      : await ctx.db.insert("walletMemberships", {
          accountId: args.accountId,
          userId: target._id,
          role,
          addedByUserId: actor._id,
          createdAt,
        });
    if (existing) {
      await ctx.db.patch("walletMemberships", existing._id, {
        role,
        addedByUserId: actor._id,
        updatedAt: createdAt,
      });
    }
    await ctx.db.insert("organizationAuditEvents", {
      accountId: args.accountId,
      actorUserId: actor._id,
      kind: existing ? "member_role_changed" : "member_added",
      targetUserId: target._id,
      ...(existing ? { fromRole: existing.role } : {}),
      toRole: role,
      createdAt,
    });
    await createInboxNotification(ctx, {
      recipientUserId: target._id,
      kind: "member",
      eventKey: "org.member",
      referenceId: String(args.accountId),
      createdAt,
    });
    return {
      membershipId,
      user: userSummary(target),
      role,
      createdAt: existing?.createdAt ?? createdAt,
    };
  },
});

export const listMembers = query({
  args: { accountId: v.id("accounts") },
  returns: v.array(memberValidator),
  handler: async (ctx, args) => {
    const viewer = await requireCurrentUser(ctx);
    const access = await requireWalletAccess(ctx, args.accountId, viewer._id);
    if (!isOrganization(access.account)) {
      fail("ORG_REQUIRED", "Choose an organization wallet.");
    }
    const memberships = await ctx.db
      .query("walletMemberships")
      .withIndex("by_accountId_and_role", (q) =>
        q.eq("accountId", args.accountId),
      )
      .take(51);
    if (memberships.length > 50) {
      fail("MEMBER_LIMIT", "Member limit reached.");
    }
    return await Promise.all(
      memberships.map(async (membership) => {
        const user = await ctx.db.get("users", membership.userId);
        if (!user) {
          fail("WALLET_CORRUPT", "Member could not be loaded.");
        }
        return {
          membershipId: membership._id,
          user: userSummary(user),
          role: membership.role,
          createdAt: membership.createdAt,
        };
      }),
    );
  },
});

export const removeMember = mutation({
  args: {
    accountId: v.id("accounts"),
    membershipId: v.id("walletMemberships"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await requireCurrentUser(ctx);
    const access = await requireWalletAccess(ctx, args.accountId, actor._id);
    if (!isOrganization(access.account)) {
      fail("ORG_REQUIRED", "Choose an organization wallet.");
    }
    if (access.role !== "owner" && access.role !== "admin") {
      fail("FORBIDDEN", "You cannot manage members.");
    }
    const membership = await ctx.db.get("walletMemberships", args.membershipId);
    if (!membership || membership.accountId !== args.accountId) {
      fail("MEMBER_NOT_FOUND", "Member was not found.");
    }
    if (membership.role === "owner") {
      fail("OWNER_IMMUTABLE", "The owner cannot be removed.");
    }
    if (access.role === "admin" && membership.role === "admin") {
      fail("FORBIDDEN", "Only an owner can remove admins.");
    }
    await limitOrganizationChange(ctx, String(actor._id));
    const createdAt = Date.now();
    await ctx.db.delete("walletMemberships", membership._id);
    const target = await ctx.db.get("users", membership.userId);
    if (target?.activeAccountId === args.accountId) {
      await ctx.db.patch("users", target._id, { activeAccountId: undefined });
    }
    await ctx.db.insert("organizationAuditEvents", {
      accountId: args.accountId,
      actorUserId: actor._id,
      kind: "member_removed",
      targetUserId: membership.userId,
      fromRole: membership.role,
      createdAt,
    });
    await createInboxNotification(ctx, {
      recipientUserId: membership.userId,
      kind: "member",
      eventKey: "org.removed",
      referenceId: String(args.accountId),
      createdAt,
    });
    return null;
  },
});

export const listAudit = query({
  args: { accountId: v.id("accounts"), limit: v.optional(v.number()) },
  returns: v.array(auditValidator),
  handler: async (ctx, args) => {
    const viewer = await requireCurrentUser(ctx);
    const access = await requireWalletAccess(ctx, args.accountId, viewer._id);
    if (!isOrganization(access.account)) {
      fail("ORG_REQUIRED", "Choose an organization wallet.");
    }
    const limit = args.limit ?? 30;
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 50) {
      fail("INVALID_LIMIT", "Limit must be between 1 and 50.");
    }
    const events = await ctx.db
      .query("organizationAuditEvents")
      .withIndex("by_accountId_and_createdAt", (q) =>
        q.eq("accountId", args.accountId),
      )
      .order("desc")
      .take(limit);
    return await Promise.all(
      events.map(async (event) => {
        const [actor, target] = await Promise.all([
          ctx.db.get("users", event.actorUserId),
          event.targetUserId
            ? ctx.db.get("users", event.targetUserId)
            : Promise.resolve(null),
        ]);
        if (!actor) fail("AUDIT_CORRUPT", "Audit actor could not be loaded.");
        return {
          id: event._id,
          kind: event.kind,
          actor: userSummary(actor),
          target: target ? userSummary(target) : null,
          fromRole: event.fromRole ?? null,
          toRole: event.toRole ?? null,
          createdAt: event.createdAt,
        };
      }),
    );
  },
});
