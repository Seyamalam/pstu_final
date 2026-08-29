import rateLimiterTest from "@convex-dev/rate-limiter/test";
import { ConvexError } from "convex/values";
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import schema from "../convex/schema";

process.env.RAIL_REFERENCE_PEPPER = "wallet-rail-test-pepper-32-bytes-minimum";

const modules = import.meta.glob("../convex/**/*.ts");

type Wallet = {
  userId: Id<"users">;
  accountId: Id<"accounts">;
  tokenIdentifier: string;
};

function makeTest() {
  const t = convexTest(schema, modules);
  rateLimiterTest.register(t);
  return t;
}

async function seedWallet(
  t: ReturnType<typeof makeTest>,
  handle: string,
): Promise<Wallet> {
  const tokenIdentifier = `https://auth.example.test|${handle}`;
  return await t.run(async (ctx) => {
    const createdAt = Date.UTC(2026, 0, 1);
    const userId = await ctx.db.insert("users", {
      tokenIdentifier,
      handle,
      handleNormalized: handle,
      displayName: handle[0].toUpperCase() + handle.slice(1),
      avatarSeed: handle,
      createdAt,
    });
    const accountId = await ctx.db.insert("accounts", {
      userId,
      balancePoisha: 1_000_000n,
      currency: "BDT",
      createdAt,
    });
    return { userId, accountId, tokenIdentifier };
  });
}

async function expectErrorCode(
  operation: Promise<unknown>,
  expectedCode: string,
) {
  try {
    await operation;
  } catch (error) {
    expect(error).toBeInstanceOf(ConvexError);
    expect((error as ConvexError<{ code: string }>).data.code).toBe(
      expectedCode,
    );
    return;
  }
  throw new Error(`Expected ${expectedCode}`);
}

describe("wallet contexts and membership", () => {
  it("keeps legacy personal wallets and authorizes organization roles", async () => {
    const t = makeTest();
    const alice = await seedWallet(t, "alice_1");
    const bob = await seedWallet(t, "bob_22");
    const carol = await seedWallet(t, "carol_3");
    const asAlice = t.withIdentity({ tokenIdentifier: alice.tokenIdentifier });
    const asBob = t.withIdentity({ tokenIdentifier: bob.tokenIdentifier });
    const asCarol = t.withIdentity({ tokenIdentifier: carol.tokenIdentifier });

    const before = await asAlice.query(api.wallets.list, {});
    expect(before).toMatchObject({
      activeAccountId: alice.accountId,
      contexts: [
        { accountId: alice.accountId, kind: "personal", role: "owner" },
      ],
    });

    const club = await asAlice.mutation(api.wallets.createOrganization, {
      name: "Robotics Club",
      slug: "robotics_club",
    });
    expect(club).toMatchObject({
      kind: "organization",
      role: "owner",
      balancePoisha: 0n,
    });

    const member = await asAlice.mutation(api.wallets.addMember, {
      accountId: club.accountId,
      handle: "@BOB_22",
      role: "treasurer",
    });
    expect(member).toMatchObject({
      role: "treasurer",
      user: { id: bob.userId },
    });

    const bobContexts = await asBob.query(api.wallets.list, {});
    expect(bobContexts.contexts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ accountId: bob.accountId, kind: "personal" }),
        expect.objectContaining({
          accountId: club.accountId,
          role: "treasurer",
        }),
      ]),
    );
    await asBob.mutation(api.wallets.switchContext, {
      accountId: club.accountId,
    });
    expect((await asBob.query(api.wallets.list, {})).activeAccountId).toBe(
      club.accountId,
    );

    await asBob.mutation(api.rails.cashIn, {
      accountId: club.accountId,
      provider: "nagad",
      amountPoisha: 100_000n,
      reference: "01812345678",
      idempotencyKey: "club-opening-funds",
    });
    const payment = await asBob.mutation(api.transfers.send, {
      recipientHandle: "carol_3",
      amountPoisha: 30_000n,
      idempotencyKey: "club-payment-key",
      note: "Supplies",
    });
    expect((await asBob.query(api.dashboard.get, {})).account).toMatchObject({
      id: club.accountId,
      balancePoisha: 70_000n,
    });
    expect(
      await asBob.query(api.activity.list, {
        paginationOpts: { numItems: 10, cursor: null },
      }),
    ).toMatchObject({
      page: [
        expect.objectContaining({ direction: "debit", amountPoisha: 30_000n }),
      ],
    });
    const now = Date.now();
    expect(
      await asBob.query(api.statements.get, {
        fromInclusive: now - 60_000,
        toExclusive: now + 60_000,
      }),
    ).toMatchObject({
      summary: { debitTotalPoisha: 30_000n, closingBalancePoisha: 70_000n },
    });
    expect(
      await asAlice.query(api.receipts.getByPublicId, {
        publicId: payment.publicId,
      }),
    ).toMatchObject({ publicId: payment.publicId, amountPoisha: 30_000n });

    await expectErrorCode(
      asBob.mutation(api.wallets.addMember, {
        accountId: club.accountId,
        handle: "carol_3",
        role: "admin",
      }),
      "FORBIDDEN",
    );
    await expectErrorCode(
      asCarol.query(api.wallets.listMembers, { accountId: club.accountId }),
      "WALLET_NOT_FOUND",
    );

    await asAlice.mutation(api.wallets.addMember, {
      accountId: club.accountId,
      handle: "carol_3",
      role: "viewer",
    });
    await expectErrorCode(
      asCarol.mutation(api.rails.cashIn, {
        accountId: club.accountId,
        provider: "bkash",
        amountPoisha: 10_000n,
        reference: "01712345678",
        idempotencyKey: "viewer-rail-key",
      }),
      "WALLET_READ_ONLY",
    );
  });
});

describe("simulated external rails", () => {
  it("commits a balanced cash-in once and replays exact retries", async () => {
    const t = makeTest();
    const alice = await seedWallet(t, "alice_1");
    const asAlice = t.withIdentity({ tokenIdentifier: alice.tokenIdentifier });
    const args = {
      accountId: alice.accountId,
      provider: "bkash",
      amountPoisha: 50_025n,
      reference: "01712-345-678",
      idempotencyKey: "cash-in-retry-key",
    };

    const first = await asAlice.mutation(api.rails.cashIn, args);
    const retry = await asAlice.mutation(api.rails.cashIn, args);
    expect(retry.id).toBe(first.id);
    expect(first).toMatchObject({
      direction: "cash_in",
      balanceAfterPoisha: 1_050_025n,
      referenceMasked: "+88017••••678",
      provider: { id: "bkash", kind: "mfs" },
    });
    expect(first).not.toHaveProperty("referenceNormalized");

    const stored = await t.run(async (ctx) => {
      const account = await ctx.db.get("accounts", alice.accountId);
      const transactions = await ctx.db
        .query("externalRailTransactions")
        .withIndex("by_accountId_and_createdAt", (q) =>
          q.eq("accountId", alice.accountId),
        )
        .take(10);
      const ledger = await ctx.db
        .query("externalRailLedgerEntries")
        .withIndex("by_transactionId", (q) => q.eq("transactionId", first.id))
        .take(2);
      const notifications = await ctx.db
        .query("notificationInbox")
        .withIndex("by_recipientUserId_and_createdAt", (q) =>
          q.eq("recipientUserId", alice.userId),
        )
        .take(10);
      return { account, transactions, ledger, notifications };
    });
    expect(stored.account?.balancePoisha).toBe(1_050_025n);
    expect(stored.transactions).toHaveLength(1);
    expect(stored.transactions[0]).not.toHaveProperty("referenceNormalized");
    expect(stored.transactions[0]?.referenceFingerprint).toMatch(
      /^[a-f0-9]{64}$/,
    );
    expect(
      JSON.stringify(stored.transactions[0], (_key, value) =>
        typeof value === "bigint" ? value.toString() : value,
      ),
    ).not.toContain("+8801712345678");
    expect(stored.ledger).toEqual([
      expect.objectContaining({
        direction: "credit",
        amountPoisha: 50_025n,
        balanceAfterPoisha: 1_050_025n,
      }),
    ]);
    expect(stored.notifications).toEqual([
      expect.objectContaining({ kind: "rail", eventKey: "cash_in" }),
    ]);

    await expectErrorCode(
      asAlice.mutation(api.rails.cashIn, { ...args, amountPoisha: 50_026n }),
      "IDEMPOTENCY_CONFLICT",
    );
  });

  it("rejects unsupported providers, invalid amounts, and unaffordable cash-out", async () => {
    const t = makeTest();
    const alice = await seedWallet(t, "alice_1");
    const asAlice = t.withIdentity({ tokenIdentifier: alice.tokenIdentifier });

    await expectErrorCode(
      asAlice.mutation(api.rails.cashIn, {
        accountId: alice.accountId,
        provider: "arbitrary_bank",
        amountPoisha: 10_000n,
        reference: "1234567890",
        idempotencyKey: "invalid-provider-key",
      }),
      "INVALID_PROVIDER",
    );
    await expectErrorCode(
      asAlice.mutation(api.rails.cashIn, {
        accountId: alice.accountId,
        provider: "nagad",
        amountPoisha: 0n,
        reference: "01712345678",
        idempotencyKey: "invalid-amount-key",
      }),
      "INVALID_AMOUNT",
    );
    await expectErrorCode(
      asAlice.mutation(api.rails.cashOut, {
        accountId: alice.accountId,
        provider: "brac_bank",
        amountPoisha: 1_000_001n,
        reference: "ABC123456789",
        idempotencyKey: "insufficient-rail-key",
      }),
      "INSUFFICIENT_FUNDS",
    );
  });
});

describe("notification endpoints", () => {
  it("keeps push credentials private and scoped to their owner", async () => {
    const t = makeTest();
    const alice = await seedWallet(t, "alice_1");
    const bob = await seedWallet(t, "bob_22");
    const asAlice = t.withIdentity({ tokenIdentifier: alice.tokenIdentifier });
    const asBob = t.withIdentity({ tokenIdentifier: bob.tokenIdentifier });
    const registered = await asAlice.mutation(
      api.notifications.registerEndpoint,
      {
        platform: "web",
        endpoint: "https://push.example.test/subscription/alice",
        p256dh: "public-key",
        auth: "auth-secret",
        deviceLabel: "Chrome",
      },
    );
    expect(registered).toMatchObject({ platform: "web", enabled: true });
    const android = await asAlice.mutation(api.notifications.registerEndpoint, {
      platform: "android",
      endpoint: "ExpoPushToken[android_test_token_123]",
      deviceLabel: "Pixel",
    });
    expect(android).toMatchObject({ platform: "android", enabled: true });
    const listed = await asAlice.query(api.notifications.listEndpoints, {});
    expect(listed).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: registered.id, enabled: true }),
        expect.objectContaining({ id: android.id, enabled: true }),
      ]),
    );
    for (const endpoint of listed) {
      expect(endpoint).not.toHaveProperty("endpoint");
      expect(endpoint).not.toHaveProperty("auth");
      expect(endpoint).not.toHaveProperty("p256dh");
    }

    await expectErrorCode(
      asBob.mutation(api.notifications.unregisterEndpoint, {
        endpointId: registered.id,
      }),
      "ENDPOINT_NOT_FOUND",
    );
    await asAlice.mutation(api.notifications.unregisterEndpoint, {
      endpointId: registered.id,
    });
    expect(await asAlice.query(api.notifications.listEndpoints, {})).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: registered.id, enabled: false }),
        expect.objectContaining({ id: android.id, enabled: true }),
      ]),
    );
  });
});
