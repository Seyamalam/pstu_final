import { ConvexError } from "convex/values";
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import schema from "../convex/schema";

const modules = import.meta.glob("../convex/**/*.ts");
const DAY_MS = 24 * 60 * 60 * 1_000;

type Wallet = {
  userId: Id<"users">;
  accountId: Id<"accounts">;
  tokenIdentifier: string;
  handle: string;
};

function makeTest() {
  return convexTest(schema, modules);
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
    return { userId, accountId, tokenIdentifier, handle };
  });
}

async function seedTransfer(
  t: ReturnType<typeof makeTest>,
  input: {
    sender: Wallet;
    recipient: Wallet;
    amountPoisha: bigint;
    createdAt: number;
    idempotencyKey: string;
    publicId: string;
    note?: string;
    requestId?: Id<"moneyRequests">;
  },
) {
  return await t.run(async (ctx) => {
    const senderAccount = await ctx.db.get("accounts", input.sender.accountId);
    const recipientAccount = await ctx.db.get(
      "accounts",
      input.recipient.accountId,
    );
    if (!senderAccount || !recipientAccount) {
      throw new Error("Missing seeded account");
    }
    const senderBalanceAfterPoisha =
      senderAccount.balancePoisha - input.amountPoisha;
    const recipientBalanceAfterPoisha =
      recipientAccount.balancePoisha + input.amountPoisha;
    const transferId = await ctx.db.insert("transfers", {
      publicId: input.publicId,
      idempotencyKey: input.idempotencyKey,
      senderId: input.sender.userId,
      recipientId: input.recipient.userId,
      amountPoisha: input.amountPoisha,
      ...(input.note ? { note: input.note } : {}),
      ...(input.requestId ? { requestId: input.requestId } : {}),
      createdAt: input.createdAt,
    });
    await ctx.db.patch("accounts", input.sender.accountId, {
      balancePoisha: senderBalanceAfterPoisha,
    });
    await ctx.db.patch("accounts", input.recipient.accountId, {
      balancePoisha: recipientBalanceAfterPoisha,
    });
    const debitEntryId = await ctx.db.insert("ledgerEntries", {
      transferId,
      accountId: input.sender.accountId,
      direction: "debit",
      amountPoisha: input.amountPoisha,
      balanceAfterPoisha: senderBalanceAfterPoisha,
      createdAt: input.createdAt,
    });
    const creditEntryId = await ctx.db.insert("ledgerEntries", {
      transferId,
      accountId: input.recipient.accountId,
      direction: "credit",
      amountPoisha: input.amountPoisha,
      balanceAfterPoisha: recipientBalanceAfterPoisha,
      createdAt: input.createdAt,
    });
    return { transferId, debitEntryId, creditEntryId };
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

describe("payee QR resolution", () => {
  it("requires authentication and only resolves canonical payee payloads", async () => {
    const t = makeTest();
    const alice = await seedWallet(t, "alice_1");
    const bob = await seedWallet(t, "bob_22");
    const payload = "sheshhisab://pay/v1/bob_22";

    await expectErrorCode(
      t.query(api.qr.resolvePayee, { payload }),
      "UNAUTHENTICATED",
    );

    const asAlice = t.withIdentity({ tokenIdentifier: alice.tokenIdentifier });
    await expectErrorCode(
      asAlice.query(api.qr.resolvePayee, {
        payload: "sheshhisab://pay/v2/bob_22",
      }),
      "INVALID_PAYEE_QR",
    );

    const resolved = await asAlice.query(api.qr.resolvePayee, { payload });
    expect(resolved).toMatchObject({
      version: 1,
      kind: "payee",
      payload,
      payee: { id: bob.userId, handle: bob.handle },
    });

    const mine = await asAlice.query(api.qr.mine);
    expect(mine.payload).toBe("sheshhisab://pay/v1/alice_1");
    await expectErrorCode(
      asAlice.query(api.qr.resolvePayee, { payload: mine.payload }),
      "PAYEE_NOT_FOUND",
    );
  });
});

describe("statements", () => {
  it("returns exact bigint totals over only the viewer's indexed ledger", async () => {
    const t = makeTest();
    const alice = await seedWallet(t, "alice_1");
    const bob = await seedWallet(t, "bob_22");
    const carol = await seedWallet(t, "carol_3");
    const dayStart = Date.UTC(2026, 1, 10);

    await seedTransfer(t, {
      sender: alice,
      recipient: bob,
      amountPoisha: 20_001n,
      createdAt: dayStart + 1_000,
      idempotencyKey: "statement-debit-1",
      publicId: "statement-debit",
    });
    await seedTransfer(t, {
      sender: bob,
      recipient: alice,
      amountPoisha: 7_505n,
      createdAt: dayStart + 2_000,
      idempotencyKey: "statement-credit-1",
      publicId: "statement-credit",
    });
    await seedTransfer(t, {
      sender: carol,
      recipient: bob,
      amountPoisha: 99_999n,
      createdAt: dayStart + 3_000,
      idempotencyKey: "unrelated-transfer-1",
      publicId: "unrelated-transfer",
    });

    const asAlice = t.withIdentity({ tokenIdentifier: alice.tokenIdentifier });
    const statement = await asAlice.query(api.statements.get, {
      fromInclusive: dayStart,
      toExclusive: dayStart + DAY_MS,
    });

    expect(statement.summary).toMatchObject({
      entryCount: 2,
      creditCount: 1,
      debitCount: 1,
      creditTotalPoisha: 7_505n,
      debitTotalPoisha: 20_001n,
      netPoisha: -12_496n,
      largestCreditPoisha: 7_505n,
      largestDebitPoisha: 20_001n,
      openingBalancePoisha: 1_000_000n,
      closingBalancePoisha: 987_504n,
    });
    expect(statement.days).toEqual([
      {
        dayStart,
        entryCount: 2,
        creditTotalPoisha: 7_505n,
        debitTotalPoisha: 20_001n,
        netPoisha: -12_496n,
      },
    ]);
    expect(statement.entries.map((entry) => entry.publicId)).toEqual([
      "statement-credit",
      "statement-debit",
    ]);
  });

  it("rejects unauthenticated, invalid, oversized, and overfull statements", async () => {
    const t = makeTest();
    const alice = await seedWallet(t, "alice_1");
    const bob = await seedWallet(t, "bob_22");
    const fromInclusive = Date.UTC(2026, 0, 1);
    const asAlice = t.withIdentity({ tokenIdentifier: alice.tokenIdentifier });

    await expectErrorCode(
      t.query(api.statements.get, {
        fromInclusive,
        toExclusive: fromInclusive + DAY_MS,
      }),
      "UNAUTHENTICATED",
    );
    await expectErrorCode(
      asAlice.query(api.statements.get, {
        fromInclusive,
        toExclusive: fromInclusive,
      }),
      "INVALID_STATEMENT_RANGE",
    );
    await expectErrorCode(
      asAlice.query(api.statements.get, {
        fromInclusive,
        toExclusive: fromInclusive + 94 * DAY_MS,
      }),
      "STATEMENT_RANGE_TOO_LARGE",
    );

    await t.run(async (ctx) => {
      const transferId = await ctx.db.insert("transfers", {
        publicId: "bulk-transfer",
        idempotencyKey: "bulk-transfer-key",
        senderId: alice.userId,
        recipientId: bob.userId,
        amountPoisha: 1n,
        createdAt: fromInclusive,
      });
      for (let index = 0; index < 251; index += 1) {
        await ctx.db.insert("ledgerEntries", {
          transferId,
          accountId: alice.accountId,
          direction: "debit",
          amountPoisha: 1n,
          balanceAfterPoisha: 999_999n - BigInt(index),
          createdAt: fromInclusive + index,
        });
      }
    });
    await expectErrorCode(
      asAlice.query(api.statements.get, {
        fromInclusive,
        toExclusive: fromInclusive + DAY_MS,
      }),
      "STATEMENT_TOO_LARGE",
    );
  });
});

describe("financial access and idempotency", () => {
  it("does not reveal whether another wallet's receipt exists", async () => {
    const t = makeTest();
    const alice = await seedWallet(t, "alice_1");
    const bob = await seedWallet(t, "bob_22");
    const carol = await seedWallet(t, "carol_3");
    await seedTransfer(t, {
      sender: bob,
      recipient: carol,
      amountPoisha: 1_000n,
      createdAt: Date.UTC(2026, 2, 1),
      idempotencyKey: "private-receipt-key",
      publicId: "private-receipt",
    });
    const asAlice = t.withIdentity({ tokenIdentifier: alice.tokenIdentifier });

    await expectErrorCode(
      asAlice.query(api.receipts.getByPublicId, {
        publicId: "private-receipt",
      }),
      "RECEIPT_NOT_FOUND",
    );
    await expectErrorCode(
      asAlice.query(api.receipts.getByPublicId, {
        publicId: "missing-receipt",
      }),
      "RECEIPT_NOT_FOUND",
    );
  });

  it("returns an exact idempotent retry before consuming a rate-limit slot", async () => {
    const t = makeTest();
    const alice = await seedWallet(t, "alice_1");
    const bob = await seedWallet(t, "bob_22");
    await seedTransfer(t, {
      sender: alice,
      recipient: bob,
      amountPoisha: 5_025n,
      createdAt: Date.UTC(2026, 3, 1),
      idempotencyKey: "retry-payment-key",
      publicId: "retry-payment",
      note: "Lunch",
    });
    const asAlice = t.withIdentity({ tokenIdentifier: alice.tokenIdentifier });

    const receipt = await asAlice.mutation(api.transfers.send, {
      recipientHandle: "@BOB_22",
      amountPoisha: 5_025n,
      idempotencyKey: " retry-payment-key ",
      note: " Lunch ",
    });
    expect(receipt.publicId).toBe("retry-payment");

    await expectErrorCode(
      asAlice.mutation(api.transfers.send, {
        recipientHandle: "bob_22",
        amountPoisha: 5_026n,
        idempotencyKey: "retry-payment-key",
        note: "Lunch",
      }),
      "IDEMPOTENCY_CONFLICT",
    );
  });

  it("replays a paid request only for its original payment key", async () => {
    const t = makeTest();
    const alice = await seedWallet(t, "alice_1");
    const bob = await seedWallet(t, "bob_22");
    const createdAt = Date.UTC(2026, 4, 1);
    const requestId = await t.run(async (ctx) => {
      return await ctx.db.insert("moneyRequests", {
        requesterId: alice.userId,
        payerId: bob.userId,
        amountPoisha: 8_050n,
        note: "Tickets",
        status: "pending",
        createdAt,
      });
    });
    const { transferId } = await seedTransfer(t, {
      sender: bob,
      recipient: alice,
      amountPoisha: 8_050n,
      createdAt,
      idempotencyKey: "request-payment-key",
      publicId: "request-payment",
      note: "Tickets",
      requestId,
    });
    await t.run(async (ctx) => {
      await ctx.db.patch("moneyRequests", requestId, {
        status: "paid",
        transferId,
        resolvedAt: createdAt,
      });
    });
    const asBob = t.withIdentity({ tokenIdentifier: bob.tokenIdentifier });

    const receipt = await asBob.mutation(api.requests.accept, {
      requestId,
      idempotencyKey: " request-payment-key ",
    });
    expect(receipt.publicId).toBe("request-payment");

    await expectErrorCode(
      asBob.mutation(api.requests.accept, {
        requestId,
        idempotencyKey: "different-payment-key",
      }),
      "IDEMPOTENCY_CONFLICT",
    );
  });
});
