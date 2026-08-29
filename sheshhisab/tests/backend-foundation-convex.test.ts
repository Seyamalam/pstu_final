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

describe("favorites and organization audit", () => {
  it("toggles bounded favorites and requires authentication", async () => {
    const t = makeTest();
    const alice = await seedWallet(t, "alice_1");
    const bob = await seedWallet(t, "bob_22");
    const asAlice = t.withIdentity({ tokenIdentifier: alice.tokenIdentifier });

    await expectCode(
      t.mutation(api.favorites.toggle, { recipientHandle: bob.handle }),
      "UNAUTHENTICATED",
    );
    expect(
      await asAlice.mutation(api.favorites.toggle, {
        recipientHandle: bob.handle,
      }),
    ).toMatchObject({ favorite: true, recipient: { id: bob.userId } });
    expect(await asAlice.query(api.favorites.list, {})).toHaveLength(1);
    expect(
      await asAlice.mutation(api.favorites.toggle, {
        recipientHandle: bob.handle,
      }),
    ).toMatchObject({ favorite: false, createdAt: null });

    for (let index = 0; index < 21; index += 1) {
      await seedWallet(t, `friend_${index}`);
    }
    await t.run(async (ctx) => {
      const friends = await ctx.db.query("users").take(30);
      for (const friend of friends
        .filter((user) => user._id !== alice.userId)
        .slice(0, 20)) {
        await ctx.db.insert("favoriteRecipients", {
          ownerUserId: alice.userId,
          recipientUserId: friend._id,
          createdAt: Date.UTC(2026, 1, 1),
        });
      }
    });
    await expectCode(
      asAlice.mutation(api.favorites.toggle, { recipientHandle: "friend_20" }),
      "FAVORITE_LIMIT",
    );
  });

  it("removes members with role checks and preserves immutable audit rows", async () => {
    const t = makeTest();
    const alice = await seedWallet(t, "alice_1");
    const bob = await seedWallet(t, "bob_22");
    const carol = await seedWallet(t, "carol_3");
    const asAlice = t.withIdentity({ tokenIdentifier: alice.tokenIdentifier });
    const asBob = t.withIdentity({ tokenIdentifier: bob.tokenIdentifier });
    const club = await asAlice.mutation(api.wallets.createOrganization, {
      name: "Science Club",
      slug: "science_club",
    });
    const bobMember = await asAlice.mutation(api.wallets.addMember, {
      accountId: club.accountId,
      handle: bob.handle,
      role: "admin",
    });
    const carolMember = await asAlice.mutation(api.wallets.addMember, {
      accountId: club.accountId,
      handle: carol.handle,
      role: "admin",
    });
    await expectCode(
      asBob.mutation(api.wallets.removeMember, {
        accountId: club.accountId,
        membershipId: carolMember.membershipId,
      }),
      "FORBIDDEN",
    );
    await asAlice.mutation(api.wallets.removeMember, {
      accountId: club.accountId,
      membershipId: bobMember.membershipId,
    });
    await expectCode(
      asBob.query(api.wallets.listAudit, { accountId: club.accountId }),
      "WALLET_NOT_FOUND",
    );
    expect(
      await asAlice.query(api.wallets.listAudit, { accountId: club.accountId }),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "organization_created" }),
        expect.objectContaining({
          kind: "member_added",
          target: expect.objectContaining({ id: bob.userId }),
        }),
        expect.objectContaining({
          kind: "member_removed",
          target: expect.objectContaining({ id: bob.userId }),
        }),
      ]),
    );
  });
});

describe("scheduled transfers and budgets", () => {
  it("replays schedule creation, rejects conflicts, and enforces transitions", async () => {
    const t = makeTest();
    const alice = await seedWallet(t, "alice_1");
    const bob = await seedWallet(t, "bob_22");
    const asAlice = t.withIdentity({ tokenIdentifier: alice.tokenIdentifier });
    const args = {
      recipientHandle: bob.handle,
      amountPoisha: 25_000n,
      executeAt: Date.now() + 120_000,
      idempotencyKey: "scheduled-retry-key",
    };
    const created = await asAlice.mutation(api.scheduledTransfers.create, args);
    expect(
      (await asAlice.mutation(api.scheduledTransfers.create, args)).id,
    ).toBe(created.id);
    await expectCode(
      asAlice.mutation(api.scheduledTransfers.create, {
        ...args,
        amountPoisha: 25_001n,
      }),
      "IDEMPOTENCY_CONFLICT",
    );
    expect(
      await asAlice.mutation(api.scheduledTransfers.cancel, {
        scheduledTransferId: created.id,
      }),
    ).toMatchObject({ status: "cancelled" });
    await expectCode(
      asAlice.mutation(api.scheduledTransfers.cancel, {
        scheduledTransferId: created.id,
      }),
      "INVALID_SCHEDULE_STATE",
    );
  });

  it("fails an unaffordable due transfer without writing a transfer", async () => {
    const t = makeTest();
    const alice = await seedWallet(t, "alice_1");
    const bob = await seedWallet(t, "bob_22");
    const scheduledTransferId = await t.run(
      async (ctx) =>
        await ctx.db.insert("scheduledTransfers", {
          creatorUserId: alice.userId,
          sourceAccountId: alice.accountId,
          recipientUserId: bob.userId,
          amountPoisha: 1_000_001n,
          executeAt: Date.now() - 1,
          idempotencyKey: "due-insufficient-key",
          status: "pending",
          createdAt: Date.now() - 10_000,
        }),
    );
    await t.mutation(internal.scheduledTransfers.execute, {
      scheduledTransferId,
    });
    const state = await t.run(async (ctx) => ({
      scheduled: await ctx.db.get("scheduledTransfers", scheduledTransferId),
      transfers: await ctx.db.query("transfers").take(2),
    }));
    expect(state.scheduled).toMatchObject({
      status: "failed",
      failureCode: "INSUFFICIENT_FUNDS",
    });
    expect(state.transfers).toHaveLength(0);
  });

  it("tracks categorized spending atomically", async () => {
    const t = makeTest();
    const alice = await seedWallet(t, "alice_1");
    const bob = await seedWallet(t, "bob_22");
    const asAlice = t.withIdentity({ tokenIdentifier: alice.tokenIdentifier });
    const now = Date.now();
    await asAlice.mutation(api.budgets.upsert, {
      category: "food",
      limitPoisha: 100_000n,
      periodStart: now - 60_000,
      periodEnd: now + 60_000,
    });
    await asAlice.mutation(api.transfers.send, {
      recipientHandle: bob.handle,
      amountPoisha: 12_500n,
      category: "food",
      idempotencyKey: "budgeted-transfer-key",
    });
    expect(await asAlice.query(api.budgets.list, {})).toEqual([
      expect.objectContaining({ category: "food", spentPoisha: 12_500n }),
    ]);
  });
});
