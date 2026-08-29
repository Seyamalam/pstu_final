import rateLimiterTest from "@convex-dev/rate-limiter/test";
import { ConvexError } from "convex/values";
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, internal } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import schema from "../convex/schema";

const modules = import.meta.glob("../convex/**/*.ts");

type Wallet = {
  userId: Id<"users">;
  accountId: Id<"accounts">;
  tokenIdentifier: string;
  handle: string;
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
      displayName: handle.toUpperCase(),
      avatarSeed: handle,
      createdAt,
    });
    const accountId = await ctx.db.insert("accounts", {
      userId,
      balancePoisha: 1_000_000n,
      currency: "BDT",
      createdAt,
    });
    return { userId, accountId, tokenIdentifier, handle };
  });
}

async function expectCode(operation: Promise<unknown>, code: string) {
  try {
    await operation;
  } catch (error) {
    expect(error).toBeInstanceOf(ConvexError);
    expect((error as ConvexError<{ code: string }>).data.code).toBe(code);
    return;
  }
  throw new Error(`Expected ${code}`);
}

describe("wallet security hardening", () => {
  it("namespaces split transfers and reserves schedule keys", async () => {
    const t = makeTest();
    const alice = await seedWallet(t, "alice_1");
    const bob = await seedWallet(t, "bob_22");
    const asAlice = t.withIdentity({ tokenIdentifier: alice.tokenIdentifier });
    const asBob = t.withIdentity({ tokenIdentifier: bob.tokenIdentifier });
    const sharedKey = "shared-collision-key";

    await asBob.mutation(api.transfers.send, {
      recipientHandle: alice.handle,
      amountPoisha: 20_000n,
      note: "Team lunch",
      category: "split",
      idempotencyKey: sharedKey,
    });
    const bill = await asAlice.mutation(api.splitBills.create, {
      title: "Team lunch",
      participants: [{ handle: bob.handle, sharePoisha: 20_000n }],
      idempotencyKey: "split-create-security",
    });
    await asBob.mutation(api.splitBills.contribute, {
      billId: bill.id,
      amountPoisha: 20_000n,
      idempotencyKey: sharedKey,
    });
    await expectCode(
      asBob.mutation(api.transfers.send, {
        recipientHandle: alice.handle,
        amountPoisha: 1n,
        idempotencyKey: `schedule:${String(bill.id)}`,
      }),
      "RESERVED_IDEMPOTENCY_KEY",
    );

    const state = await t.run(async (ctx) => ({
      alice: await ctx.db.get("accounts", alice.accountId),
      bob: await ctx.db.get("accounts", bob.accountId),
      transfers: await ctx.db.query("transfers").take(3),
    }));
    expect(state.alice?.balancePoisha).toBe(1_040_000n);
    expect(state.bob?.balancePoisha).toBe(960_000n);
    expect(state.transfers).toHaveLength(2);
  });

  it("rejects same-account commits without transfer writes", async () => {
    const t = makeTest();
    const alice = await seedWallet(t, "alice_1");
    const bob = await seedWallet(t, "bob_22");
    const scheduledTransferId = await t.run(async (ctx) =>
      ctx.db.insert("scheduledTransfers", {
        creatorUserId: alice.userId,
        sourceAccountId: bob.accountId,
        recipientUserId: bob.userId,
        amountPoisha: 1_000n,
        executeAt: Date.now() - 1,
        idempotencyKey: "same-account-schedule",
        status: "pending",
        createdAt: Date.now() - 10,
      }),
    );
    await expectCode(
      t.mutation(internal.scheduledTransfers.performExecutionTransfer, {
        scheduledTransferId,
      }),
      "SAME_ACCOUNT",
    );
    expect(
      await t.run(async (ctx) => ctx.db.query("transfers").take(1)),
    ).toHaveLength(0);
    expect(
      await t.run(async (ctx) => ctx.db.get("accounts", alice.accountId)),
    ).toMatchObject({ balancePoisha: 1_000_000n });
    expect(
      await t.run(async (ctx) => ctx.db.get("accounts", bob.accountId)),
    ).toMatchObject({ balancePoisha: 1_000_000n });
  });

  it("scopes organization schedules and splits to current members", async () => {
    const t = makeTest();
    const alice = await seedWallet(t, "alice_1");
    const bob = await seedWallet(t, "bob_22");
    const carol = await seedWallet(t, "carol_3");
    const asAlice = t.withIdentity({ tokenIdentifier: alice.tokenIdentifier });
    const asBob = t.withIdentity({ tokenIdentifier: bob.tokenIdentifier });
    const asCarol = t.withIdentity({ tokenIdentifier: carol.tokenIdentifier });
    const club = await asAlice.mutation(api.wallets.createOrganization, {
      name: "Science Club",
      slug: "science_club",
    });
    const membership = await asAlice.mutation(api.wallets.addMember, {
      accountId: club.accountId,
      handle: bob.handle,
      role: "treasurer",
    });
    await asBob.mutation(api.wallets.switchContext, {
      accountId: club.accountId,
    });
    const schedule = await asBob.mutation(api.scheduledTransfers.create, {
      recipientHandle: carol.handle,
      amountPoisha: 5_000n,
      executeAt: Date.now() + 120_000,
      idempotencyKey: "org-schedule-security",
    });
    await expectCode(
      asBob.mutation(api.transfers.send, {
        recipientHandle: carol.handle,
        amountPoisha: 5_000n,
        idempotencyKey: `schedule:${String(schedule.id)}`,
      }),
      "RESERVED_IDEMPOTENCY_KEY",
    );
    const bill = await asBob.mutation(api.splitBills.create, {
      title: "Club supplies",
      participants: [{ handle: carol.handle, sharePoisha: 5_000n }],
      idempotencyKey: "org-split-security",
    });
    await asAlice.mutation(api.wallets.switchContext, {
      accountId: club.accountId,
    });
    expect(await asAlice.query(api.scheduledTransfers.list, {})).toHaveLength(
      1,
    );
    expect(
      await asAlice.query(api.splitBills.list, { role: "owner" }),
    ).toHaveLength(1);
    await asAlice.mutation(api.wallets.removeMember, {
      accountId: club.accountId,
      membershipId: membership.membershipId,
    });
    await expectCode(
      asBob.mutation(api.scheduledTransfers.cancel, {
        scheduledTransferId: schedule.id,
      }),
      "SCHEDULE_NOT_FOUND",
    );
    expect(
      await asAlice.mutation(api.scheduledTransfers.cancel, {
        scheduledTransferId: schedule.id,
      }),
    ).toMatchObject({ status: "cancelled" });
    await expectCode(
      asBob.query(api.splitBills.get, { billId: bill.id }),
      "SPLIT_NOT_FOUND",
    );
    expect(
      await asCarol.query(api.splitBills.get, { billId: bill.id }),
    ).toMatchObject({
      id: bill.id,
    });
  });

  it("deletes revoked push secrets and permits endpoint reassignment", async () => {
    const t = makeTest();
    const alice = await seedWallet(t, "alice_1");
    const bob = await seedWallet(t, "bob_22");
    const asAlice = t.withIdentity({ tokenIdentifier: alice.tokenIdentifier });
    const asBob = t.withIdentity({ tokenIdentifier: bob.tokenIdentifier });
    const endpoint = "https://push.example.test/shared";
    await asAlice.mutation(api.notifications.registerEndpoint, {
      platform: "web",
      endpoint,
      p256dh: "public-key",
      auth: "auth-secret",
    });
    await asAlice.mutation(api.notifications.unregisterCurrentEndpoint, {
      endpoint,
    });
    expect(
      await t.run(async (ctx) =>
        ctx.db
          .query("notificationEndpoints")
          .withIndex("by_endpoint", (q) => q.eq("endpoint", endpoint))
          .unique(),
      ),
    ).toBeNull();
    await t.run(async (ctx) => {
      for (let index = 0; index < 10; index += 1) {
        await ctx.db.insert("notificationEndpoints", {
          userId: alice.userId,
          platform: "web",
          endpoint: `https://push.example.test/revoked/${index}`,
          p256dh: `old-key-${index}`,
          auth: `old-secret-${index}`,
          createdAt: index,
          updatedAt: index,
          revokedAt: index + 1,
        });
      }
    });
    await asAlice.mutation(api.notifications.registerEndpoint, {
      platform: "web",
      endpoint: "https://push.example.test/fresh",
      p256dh: "fresh-public-key",
      auth: "fresh-auth-secret",
    });
    await asBob.mutation(api.notifications.registerEndpoint, {
      platform: "web",
      endpoint,
      p256dh: "bob-public-key",
      auth: "bob-auth-secret",
    });
  });

  it("provides retry-safe requests and favorite state", async () => {
    const t = makeTest();
    const alice = await seedWallet(t, "alice_1");
    const bob = await seedWallet(t, "bob_22");
    const carol = await seedWallet(t, "carol_3");
    const asAlice = t.withIdentity({ tokenIdentifier: alice.tokenIdentifier });
    const asCarol = t.withIdentity({ tokenIdentifier: carol.tokenIdentifier });
    const args = {
      payerHandle: bob.handle,
      amountPoisha: 2_500n,
      idempotencyKey: "request-create-v2",
    };
    const first = await asAlice.mutation(api.requests.createV2, args);
    expect((await asAlice.mutation(api.requests.createV2, args)).id).toBe(
      first.id,
    );
    await expectCode(
      asAlice.mutation(api.requests.createV2, {
        ...args,
        amountPoisha: 2_501n,
      }),
      "IDEMPOTENCY_CONFLICT",
    );
    await expectCode(
      asCarol.query(api.requests.get, { requestId: first.id }),
      "REQUEST_NOT_FOUND",
    );
    await asAlice.mutation(api.favorites.setFavorite, {
      recipientHandle: bob.handle,
      favorite: true,
    });
    await asAlice.mutation(api.favorites.setFavorite, {
      recipientHandle: bob.handle,
      favorite: true,
    });
    expect(await asAlice.query(api.favorites.list, {})).toHaveLength(1);
    await asAlice.mutation(api.favorites.setFavorite, {
      recipientHandle: bob.handle,
      favorite: false,
    });
    await asAlice.mutation(api.favorites.setFavorite, {
      recipientHandle: bob.handle,
      favorite: false,
    });
    expect(await asAlice.query(api.favorites.list, {})).toHaveLength(0);
  });

  it("rejects expired budgets and allows correction before a future period", async () => {
    const t = makeTest();
    const alice = await seedWallet(t, "alice_1");
    const asAlice = t.withIdentity({ tokenIdentifier: alice.tokenIdentifier });
    const now = Date.now();
    await expectCode(
      asAlice.mutation(api.budgets.upsert, {
        category: "food",
        limitPoisha: 10_000n,
        periodStart: now - 2_000,
        periodEnd: now - 1_000,
      }),
      "INVALID_BUDGET_PERIOD",
    );
    await asAlice.mutation(api.budgets.upsert, {
      category: "food",
      limitPoisha: 10_000n,
      periodStart: now + 60_000,
      periodEnd: now + 120_000,
    });
    expect(
      await asAlice.mutation(api.budgets.upsert, {
        category: "food",
        limitPoisha: 12_000n,
        periodStart: now + 90_000,
        periodEnd: now + 180_000,
      }),
    ).toMatchObject({ limitPoisha: 12_000n, spentPoisha: 0n });
    await asAlice.mutation(api.budgets.upsert, {
      category: "transport",
      limitPoisha: 8_000n,
      periodStart: now - 1_000,
      periodEnd: now + 60_000,
    });
    await expectCode(
      asAlice.mutation(api.budgets.upsert, {
        category: "transport",
        limitPoisha: 8_000n,
        periodStart: now,
        periodEnd: now + 120_000,
      }),
      "BUDGET_PERIOD_ACTIVE",
    );
  });
});
