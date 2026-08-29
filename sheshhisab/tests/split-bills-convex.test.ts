import rateLimiterTest from "@convex-dev/rate-limiter/test";
import { ConvexError } from "convex/values";
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../convex/_generated/api";
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

describe("split bills", () => {
  it("creates idempotently and scopes bill visibility", async () => {
    const t = makeTest();
    const alice = await seedWallet(t, "alice_1");
    const bob = await seedWallet(t, "bob_22");
    const carol = await seedWallet(t, "carol_3");
    const asAlice = t.withIdentity({ tokenIdentifier: alice.tokenIdentifier });
    const asCarol = t.withIdentity({ tokenIdentifier: carol.tokenIdentifier });
    const args = {
      title: "Team lunch",
      participants: [{ handle: bob.handle, sharePoisha: 50_000n }],
      idempotencyKey: "split-create-key",
    };
    const bill = await asAlice.mutation(api.splitBills.create, args);
    expect((await asAlice.mutation(api.splitBills.create, args)).id).toBe(
      bill.id,
    );
    await expectCode(
      asAlice.mutation(api.splitBills.create, {
        ...args,
        participants: [{ handle: bob.handle, sharePoisha: 50_001n }],
      }),
      "IDEMPOTENCY_CONFLICT",
    );
    await expectCode(
      asCarol.query(api.splitBills.get, { billId: bill.id }),
      "SPLIT_NOT_FOUND",
    );
    await expectCode(
      asCarol.mutation(api.splitBills.settle, { billId: bill.id }),
      "SPLIT_NOT_FOUND",
    );
    await expectCode(
      asAlice.mutation(api.splitBills.settle, { billId: bill.id }),
      "SPLIT_INCOMPLETE",
    );
  });

  it("contributes atomically, replays retries, and settles once fully paid", async () => {
    const t = makeTest();
    const alice = await seedWallet(t, "alice_1");
    const bob = await seedWallet(t, "bob_22");
    const asAlice = t.withIdentity({ tokenIdentifier: alice.tokenIdentifier });
    const asBob = t.withIdentity({ tokenIdentifier: bob.tokenIdentifier });
    const bill = await asAlice.mutation(api.splitBills.create, {
      title: "Team lunch",
      participants: [{ handle: bob.handle, sharePoisha: 50_000n }],
      idempotencyKey: "split-create-key",
    });

    const firstArgs = {
      billId: bill.id,
      amountPoisha: 20_000n,
      idempotencyKey: "split-contribution-one",
    };
    const first = await asBob.mutation(api.splitBills.contribute, firstArgs);
    const retry = await asBob.mutation(api.splitBills.contribute, firstArgs);
    expect(retry.receipt.transferId).toBe(first.receipt.transferId);
    expect(retry.participant.contributedPoisha).toBe(20_000n);

    const second = await asBob.mutation(api.splitBills.contribute, {
      billId: bill.id,
      amountPoisha: 30_000n,
      idempotencyKey: "split-contribution-two",
    });
    expect(second.participant).toMatchObject({
      contributedPoisha: 50_000n,
      status: "paid",
    });
    const settled = await asAlice.mutation(api.splitBills.settle, {
      billId: bill.id,
    });
    expect(settled).toMatchObject({
      status: "settled",
      contributedTotalPoisha: 50_000n,
    });
    expect(
      await asAlice.mutation(api.splitBills.settle, { billId: bill.id }),
    ).toMatchObject({ status: "settled" });
    await expectCode(
      asBob.mutation(api.splitBills.contribute, {
        billId: bill.id,
        amountPoisha: 1n,
        idempotencyKey: "split-after-settlement",
      }),
      "INVALID_SPLIT_STATE",
    );

    const stored = await t.run(async (ctx) => ({
      alice: await ctx.db.get("accounts", alice.accountId),
      bob: await ctx.db.get("accounts", bob.accountId),
      contributions: await ctx.db
        .query("splitContributions")
        .withIndex("by_billId_and_createdAt", (q) => q.eq("billId", bill.id))
        .take(10),
    }));
    expect(stored.alice?.balancePoisha).toBe(1_050_000n);
    expect(stored.bob?.balancePoisha).toBe(950_000n);
    expect(stored.contributions).toHaveLength(2);
  });

  it("does not update contribution state when the wallet is short", async () => {
    const t = makeTest();
    const alice = await seedWallet(t, "alice_1");
    const bob = await seedWallet(t, "bob_22");
    const asAlice = t.withIdentity({ tokenIdentifier: alice.tokenIdentifier });
    const asBob = t.withIdentity({ tokenIdentifier: bob.tokenIdentifier });
    const bill = await asAlice.mutation(api.splitBills.create, {
      title: "Large booking",
      participants: [{ handle: bob.handle, sharePoisha: 1_000_001n }],
      idempotencyKey: "large-split-create",
    });
    await expectCode(
      asBob.mutation(api.splitBills.contribute, {
        billId: bill.id,
        amountPoisha: 1_000_001n,
        idempotencyKey: "large-split-contribution",
      }),
      "INSUFFICIENT_FUNDS",
    );
    expect(
      (await asBob.query(api.splitBills.get, { billId: bill.id }))
        .participants[0],
    ).toMatchObject({
      contributedPoisha: 0n,
      status: "pending",
    });
  });
});
