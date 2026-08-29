"use client";

import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, Check, Circle, Landmark, ReceiptText } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { Button } from "@/components/motion/button/base";
import {
  type ButtonState,
  StatefulButton,
} from "@/components/motion/button/stateful";
import { Input } from "@/components/motion/input";
import { poishaToInput } from "@/lib/pay-link";
import { budgetProgress, remainingSplitShare } from "@/lib/wallet-tools";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  errorMessage,
  formatPoisha,
  formatTimestamp,
  initials,
  parseBdtInput,
} from "./money";
import { InlineError, PageHeading, ScreenLoading } from "./screen-states";

export function SplitDetailScreen({ billId }: { billId: string }) {
  const typedBillId = billId as Id<"splitBills">;
  const bill = useQuery(api.splitBills.get, { billId: typedBillId });
  const viewer = useQuery(api.viewer.get, {});
  const wallets = useQuery(api.wallets.list, {});
  const contribute = useMutation(api.splitBills.contribute);
  const settle = useMutation(api.splitBills.settle);
  const intentKeyRef = useRef<string | null>(null);
  const accountRef = useRef<string | null>(null);
  const [amount, setAmount] = useState("");
  const [touched, setTouched] = useState(false);
  const [paymentState, setPaymentState] = useState<ButtonState>("idle");
  const [settleState, setSettleState] = useState<ButtonState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [receiptId, setReceiptId] = useState<string | null>(null);

  useEffect(() => {
    const accountId = wallets?.activeAccountId ?? null;
    if (accountRef.current && accountId !== accountRef.current) {
      intentKeyRef.current = null;
      setAmount("");
      setTouched(false);
      setPaymentState("idle");
      setMessage(null);
    }
    accountRef.current = accountId;
  }, [wallets?.activeAccountId]);

  if (
    bill === undefined ||
    viewer === undefined ||
    viewer === null ||
    !wallets
  ) {
    return <ScreenLoading label="Loading split bill" />;
  }
  const active = wallets.contexts.find(
    (context) => context.accountId === wallets.activeAccountId,
  );
  if (!active) return <ScreenLoading label="Loading active wallet" />;
  const participant = bill.participants.find(
    (item) => item.user.id === viewer.user.id,
  );
  const remainingPoisha = participant
    ? remainingSplitShare(
        participant.sharePoisha,
        participant.contributedPoisha,
      )
    : 0n;
  const amountPoisha = parseBdtInput(amount);
  const progress = budgetProgress(
    bill.contributedTotalPoisha,
    bill.totalPoisha,
  );
  const activeReceives = active.accountId === bill.receivingAccountId;
  const canOperateActiveWallet = active.role !== "viewer";
  const canContribute =
    Boolean(participant) &&
    remainingPoisha > 0n &&
    bill.status === "open" &&
    !activeReceives &&
    canOperateActiveWallet;
  const receivingContext = wallets.contexts.find(
    (context) => context.accountId === bill.receivingAccountId,
  );
  const canSettle =
    bill.status === "open" &&
    (bill.creator.id === viewer.user.id ||
      receivingContext?.role === "owner" ||
      receivingContext?.role === "admin");
  const fullyPaid = bill.contributedTotalPoisha === bill.totalPoisha;
  const amountError =
    touched &&
    (amountPoisha === null ||
      amountPoisha <= 0n ||
      amountPoisha > remainingPoisha)
      ? `Enter up to ${formatPoisha(remainingPoisha)}.`
      : undefined;

  const pay = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouched(true);
    if (
      !canContribute ||
      !participant ||
      !amountPoisha ||
      amountPoisha > remainingPoisha
    ) {
      return;
    }
    const idempotencyKey = intentKeyRef.current ?? crypto.randomUUID();
    intentKeyRef.current = idempotencyKey;
    setPaymentState("loading");
    setMessage(null);
    try {
      const result = await contribute({
        billId: typedBillId,
        amountPoisha,
        idempotencyKey,
      });
      intentKeyRef.current = null;
      setAmount("");
      setTouched(false);
      setReceiptId(result.receipt.publicId);
      setPaymentState("success");
    } catch (error) {
      setMessage(errorMessage(error, "Could not pay this share."));
      setPaymentState("error");
    }
  };

  const finish = async () => {
    if (!canSettle || !fullyPaid || settleState === "loading") return;
    setSettleState("loading");
    setMessage(null);
    try {
      await settle({ billId: typedBillId });
      setSettleState("success");
    } catch (error) {
      setMessage(errorMessage(error, "Could not settle this split."));
      setSettleState("error");
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <Link
        href="/app/splits"
        className="inline-flex min-h-10 w-fit items-center gap-2 rounded-full px-3 text-sm font-medium text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Split bills
      </Link>
      <PageHeading
        eyebrow={bill.status}
        title={bill.title}
        description={`Created by ${bill.creator.displayName} · ${formatTimestamp(bill.createdAt)}`}
        action={
          canSettle ? (
            <StatefulButton
              size="md"
              state={settleState}
              loadingText="Settling"
              successText="Settled"
              errorText="Try again"
              disabled={!fullyPaid || bill.status === "settled"}
              onClick={() => void finish()}
            >
              Settle split
            </StatefulButton>
          ) : undefined
        }
      />
      {message ? <InlineError>{message}</InlineError> : null}

      <section className="overflow-hidden rounded-[1.75rem] bg-foreground text-background">
        <div className="grid gap-5 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:p-7">
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-background/60">
              Collected
            </p>
            <p className="mt-2 font-mono text-4xl font-semibold tracking-[-0.05em] tabular-nums">
              {formatPoisha(bill.contributedTotalPoisha)}
            </p>
            <p className="mt-2 text-xs text-background/60">
              of {formatPoisha(bill.totalPoisha)}
            </p>
          </div>
          <div className="self-end text-left sm:text-right">
            <p className="text-xs text-background/60">Remaining</p>
            <p className="mt-1 font-mono text-lg font-semibold tabular-nums">
              {formatPoisha(progress.remainingPoisha)}
            </p>
          </div>
        </div>
        <div className="h-2 bg-white/10">
          <div
            className="h-full bg-[var(--chart-5)] transition-[width] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
      </section>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]">
        <section className="overflow-hidden rounded-[1.5rem] bg-card ring-1 ring-foreground/10">
          <header className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-5">
            <h2 className="text-sm font-semibold">Shares</h2>
            <span className="font-mono text-xs text-muted-foreground">
              {bill.participants.length}
            </span>
          </header>
          <ul className="divide-y divide-border">
            {bill.participants.map((item) => {
              const remaining = remainingSplitShare(
                item.sharePoisha,
                item.contributedPoisha,
              );
              return (
                <li
                  key={item.id}
                  className="flex min-h-18 items-center gap-3 px-4 py-3 sm:px-5"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted font-mono text-xs font-semibold">
                    {initials(item.user.displayName)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {item.user.displayName}
                    </span>
                    <span className="block truncate font-mono text-xs text-muted-foreground">
                      @{item.user.handle}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="block font-mono text-xs font-semibold tabular-nums">
                      {formatPoisha(item.contributedPoisha)}
                    </span>
                    <span className="mt-0.5 block font-mono text-[10px] text-muted-foreground tabular-nums">
                      {item.status === "paid"
                        ? "Paid"
                        : `${formatPoisha(remaining)} left`}
                    </span>
                  </span>
                  {item.status === "paid" ? (
                    <Check aria-label="Paid" className="size-4 text-primary" />
                  ) : (
                    <Circle
                      aria-label="Pending"
                      className="size-4 text-muted-foreground/50"
                    />
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <section className="rounded-[1.5rem] bg-card p-5 ring-1 ring-foreground/10 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <Landmark aria-hidden="true" className="size-5" />
            </span>
            <div>
              <h2 className="text-sm font-semibold">Your share</h2>
              <p className="mt-0.5 font-mono text-xs text-muted-foreground tabular-nums">
                {participant
                  ? formatPoisha(remainingPoisha)
                  : "Not a participant"}
              </p>
            </div>
          </div>

          {participant && remainingPoisha > 0n && bill.status === "open" ? (
            <form
              onSubmit={pay}
              noValidate
              className="mt-5 flex flex-col gap-3"
            >
              <Input
                label="Amount in BDT"
                value={amount}
                onChange={(value) => {
                  setAmount(value);
                  intentKeyRef.current = null;
                  setPaymentState("idle");
                  setMessage(null);
                }}
                inputMode="decimal"
                placeholder="0.00"
                error={amountError}
                reserveErrorLine
                disabled={!canContribute || paymentState === "loading"}
              />
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setAmount(poishaToInput(remainingPoisha));
                  intentKeyRef.current = null;
                  setPaymentState("idle");
                }}
                disabled={!canContribute}
                className="self-start"
              >
                Pay remaining
              </Button>
              {activeReceives ? (
                <p className="text-xs text-muted-foreground">
                  Switch from {active.name} to another wallet.
                </p>
              ) : !canOperateActiveWallet ? (
                <p className="text-xs text-muted-foreground">
                  Active wallet is view only.
                </p>
              ) : null}
              <StatefulButton
                type="submit"
                size="lg"
                state={paymentState}
                loadingText="Paying"
                successText="Paid"
                errorText="Try again"
                disabled={!canContribute}
                className="w-full"
              >
                Pay share
              </StatefulButton>
            </form>
          ) : (
            <p className="mt-5 rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">
              {participant?.status === "paid"
                ? "Share paid"
                : bill.status === "settled"
                  ? "Split settled"
                  : "No payment due"}
            </p>
          )}
          {receiptId ? (
            <Link
              href={`/app/receipt/${receiptId}`}
              className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full text-sm font-medium text-primary outline-none hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ReceiptText aria-hidden="true" className="size-4" />
              Open receipt
            </Link>
          ) : null}
        </section>
      </div>
    </div>
  );
}
