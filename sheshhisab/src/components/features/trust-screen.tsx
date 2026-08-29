"use client";

import { useMutation, useQuery } from "convex/react";
import { FlaskConical, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { TrustLab, type TrustScenario } from "@/components/app/trust-lab";
import {
  type ButtonState,
  StatefulButton,
} from "@/components/motion/button/stateful";
import { api } from "../../../convex/_generated/api";

import { errorMessage, formatPoisha } from "./money";
import { PersonPicker, type PersonSummary } from "./person-picker";
import { InlineError, PageHeading, ScreenLoading } from "./screen-states";

type Attempt = {
  label: string;
  status: "fulfilled" | "rejected";
  receiptId?: string;
  message?: string;
};

const DUPLICATE_AMOUNT_POISHA = BigInt(50_000);

export function TrustScreen() {
  const dashboard = useQuery(api.dashboard.get, {});
  const sendMoney = useMutation(api.transfers.send);
  const [recipientQuery, setRecipientQuery] = useState("");
  const [recipient, setRecipient] = useState<PersonSummary | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [duplicateState, setDuplicateState] = useState<ButtonState>("idle");
  const [raceState, setRaceState] = useState<ButtonState>("idle");
  const [duplicateBefore, setDuplicateBefore] = useState<bigint | null>(null);
  const [duplicateAttempts, setDuplicateAttempts] = useState<Attempt[] | null>(
    null,
  );
  const [raceBefore, setRaceBefore] = useState<bigint | null>(null);
  const [raceAmount, setRaceAmount] = useState<bigint | null>(null);
  const [raceAttempts, setRaceAttempts] = useState<Attempt[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  if (dashboard === undefined)
    return <ScreenLoading label="Loading Trust Lab" />;

  const busy = duplicateState === "loading" || raceState === "loading";
  const canRun = Boolean(recipient && confirmed && !busy);

  const runDuplicate = async () => {
    if (!recipient || !confirmed || busy) return;
    if (dashboard.account.balancePoisha < DUPLICATE_AMOUNT_POISHA) {
      setMessage(
        "This wallet needs at least ৳500.00 to run the duplicate test.",
      );
      return;
    }

    setMessage(null);
    setDuplicateBefore(dashboard.account.balancePoisha);
    setDuplicateAttempts(null);
    setDuplicateState("loading");
    const idempotencyKey = crypto.randomUUID();
    try {
      const receipts = await Promise.all(
        Array.from({ length: 5 }, () =>
          sendMoney({
            recipientHandle: recipient.handle,
            amountPoisha: DUPLICATE_AMOUNT_POISHA,
            idempotencyKey,
            note: "Trust Lab: duplicate retry test",
          }),
        ),
      );
      setDuplicateAttempts(
        receipts.map((receipt, index) => ({
          label: `Attempt ${index + 1}`,
          status: "fulfilled",
          receiptId: receipt.publicId,
        })),
      );
      const receiptIds = new Set(receipts.map((receipt) => receipt.publicId));
      setDuplicateState(receiptIds.size === 1 ? "success" : "error");
    } catch (error) {
      setDuplicateAttempts([
        {
          label: "Duplicate batch",
          status: "rejected",
          message: errorMessage(
            error,
            "The duplicate batch failed before a result could be shown.",
          ),
        },
      ]);
      setDuplicateState("error");
    }
  };

  const runRace = async () => {
    if (!recipient || !confirmed || busy) return;
    const balance = dashboard.account.balancePoisha;
    if (balance < BigInt(2)) {
      setMessage(
        "This wallet does not have enough fake funds to run the race test.",
      );
      return;
    }

    const seventyPercent = (balance * BigInt(7)) / BigInt(10);
    const overHalf = balance / BigInt(2) + BigInt(1);
    const amount = seventyPercent > overHalf ? seventyPercent : overHalf;
    setMessage(null);
    setRaceBefore(balance);
    setRaceAmount(amount);
    setRaceAttempts(null);
    setRaceState("loading");

    const attempts = await Promise.all(
      ["A", "B"].map(async (label): Promise<Attempt> => {
        try {
          const receipt = await sendMoney({
            recipientHandle: recipient.handle,
            amountPoisha: amount,
            idempotencyKey: crypto.randomUUID(),
            note: `Trust Lab: overspend race ${label}`,
          });
          return {
            label: `Payment ${label}`,
            status: "fulfilled",
            receiptId: receipt.publicId,
          };
        } catch (error) {
          return {
            label: `Payment ${label}`,
            status: "rejected",
            message: errorMessage(
              error,
              "Rejected by the transfer transaction.",
            ),
          };
        }
      }),
    );
    setRaceAttempts(attempts);
    const fulfilled = attempts.filter(
      (attempt) => attempt.status === "fulfilled",
    ).length;
    const rejected = attempts.length - fulfilled;
    setRaceState(fulfilled === 1 && rejected === 1 ? "success" : "error");
  };

  const duplicateReceiptIds = duplicateAttempts
    ?.filter((attempt) => attempt.receiptId)
    .map((attempt) => attempt.receiptId as string);
  const uniqueDuplicateReceipts = new Set(duplicateReceiptIds ?? []).size;
  const duplicatePassed =
    duplicateAttempts !== null && uniqueDuplicateReceipts === 1;
  const raceFulfilled =
    raceAttempts?.filter((attempt) => attempt.status === "fulfilled").length ??
    0;
  const raceRejected =
    raceAttempts?.filter((attempt) => attempt.status === "rejected").length ??
    0;
  const racePassed =
    raceAttempts !== null && raceFulfilled === 1 && raceRejected === 1;

  const scenarios: TrustScenario[] = [
    {
      id: "duplicate",
      title: "Duplicate retry",
      description:
        "Five parallel calls reuse one intent key. The backend returns the same committed transfer every time.",
      status:
        duplicateState === "loading"
          ? "running"
          : duplicateAttempts === null
            ? "idle"
            : duplicatePassed
              ? "passed"
              : "failed",
      statusLabel:
        duplicateState === "loading"
          ? "Running"
          : duplicateAttempts === null
            ? "Ready"
            : duplicatePassed
              ? "Passed"
              : "Needs review",
      metrics: [
        { label: "Calls", value: "5 parallel" },
        { label: "Amount", value: formatPoisha(DUPLICATE_AMOUNT_POISHA) },
        {
          label: "Before",
          value:
            duplicateBefore === null
              ? "Not run"
              : formatPoisha(duplicateBefore),
        },
        {
          label: "Unique receipts",
          value:
            duplicateAttempts === null
              ? "Not run"
              : String(uniqueDuplicateReceipts),
        },
      ],
      checks:
        duplicateAttempts === null
          ? []
          : [
              {
                label: "All fulfilled calls point to one receipt",
                passed: duplicatePassed,
                detail:
                  duplicateReceiptIds?.join(", ") || "No receipt returned.",
              },
              {
                label: "Current balance remains non-negative",
                passed: dashboard.account.balancePoisha >= BigInt(0),
                detail: `Reactive balance: ${formatPoisha(dashboard.account.balancePoisha)}`,
              },
            ],
      result:
        duplicateAttempts === null
          ? "Idempotency is keyed by sender and payment intent. Repeated network delivery cannot create a second transfer."
          : duplicatePassed
            ? "The five calls resolved to one receipt. The mutation found the first committed intent and returned it without moving money again."
            : duplicateAttempts
                .map((attempt) => attempt.message)
                .filter(Boolean)
                .join(" "),
      action: (
        <StatefulButton
          state={duplicateState}
          onClick={() => void runDuplicate()}
          disabled={!canRun}
          loadingText="Sending five calls"
          successText="Duplicate safe"
          errorText="Run again"
          className="min-h-11 w-full sm:w-auto"
        >
          Run duplicate test
        </StatefulButton>
      ),
    },
    {
      id: "race",
      title: "Overspend race",
      description:
        "Two distinct payments each try to spend more than half the same balance at the same time.",
      status:
        raceState === "loading"
          ? "running"
          : raceAttempts === null
            ? "idle"
            : racePassed
              ? "passed"
              : "failed",
      statusLabel:
        raceState === "loading"
          ? "Running"
          : raceAttempts === null
            ? "Ready"
            : racePassed
              ? "Passed"
              : "Needs review",
      metrics: [
        { label: "Calls", value: "2 concurrent" },
        {
          label: "Each payment",
          value:
            raceAmount === null
              ? "Calculated at run"
              : formatPoisha(raceAmount),
        },
        {
          label: "Before",
          value: raceBefore === null ? "Not run" : formatPoisha(raceBefore),
        },
        {
          label: "Outcome",
          value:
            raceAttempts === null
              ? "Not run"
              : `${raceFulfilled} commit / ${raceRejected} reject`,
        },
      ],
      checks:
        raceAttempts === null
          ? []
          : [
              {
                label: "Exactly one payment committed",
                passed: raceFulfilled === 1,
                detail:
                  raceAttempts
                    .filter((attempt) => attempt.receiptId)
                    .map((attempt) => `${attempt.label}: ${attempt.receiptId}`)
                    .join(", ") || "No payment committed.",
              },
              {
                label: "Exactly one payment was rejected",
                passed: raceRejected === 1,
                detail: raceAttempts
                  .filter((attempt) => attempt.status === "rejected")
                  .map((attempt) => `${attempt.label}: ${attempt.message}`)
                  .join(", "),
              },
              {
                label: "Current balance remains non-negative",
                passed: dashboard.account.balancePoisha >= BigInt(0),
                detail: `Reactive balance: ${formatPoisha(dashboard.account.balancePoisha)}`,
              },
            ],
      result:
        raceAttempts === null
          ? "Convex retries conflicting mutations against the newest account state. The loser then sees insufficient funds and writes nothing."
          : racePassed
            ? "One payment committed and one was rejected. Convex serialized the conflicting writes, so the account never crossed below zero."
            : "The observed outcome differed from the expected one-success, one-rejection result. Inspect the attempt details above.",
      action: (
        <StatefulButton
          state={raceState}
          onClick={() => void runRace()}
          disabled={!canRun}
          loadingText="Racing payments"
          successText="Race protected"
          errorText="Run again"
          className="min-h-11 w-full sm:w-auto"
        >
          Run race test
        </StatefulButton>
      ),
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <PageHeading
        eyebrow="Live proof"
        title="Make the failure paths visible."
        description="These tests call the real transfer mutation. They show what commits, what gets rejected, and the live balance afterward."
      />

      <section className="rounded-[1.5rem] border border-warning/30 bg-card p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-warning/10 text-warning">
            <ShieldAlert aria-hidden="true" className="size-5" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              These tests move fake funds.
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Choose a recipient you control. The duplicate test sends ৳500
              once. The race test may send about 70% of your current balance
              once.
            </p>
          </div>
        </div>
        <div className="mt-4 max-w-md">
          <PersonPicker
            query={recipientQuery}
            onQueryChange={(value) => {
              setRecipientQuery(value);
              setRecipient(null);
              setMessage(null);
            }}
            selected={recipient}
            onSelect={(person) => {
              setRecipient(person);
              setRecipientQuery(person.handle);
              setMessage(null);
            }}
            label="Test recipient"
            disabled={busy}
          />
        </div>
        <label className="mt-3 flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
            disabled={busy}
            className="size-5 rounded border-input accent-primary"
          />
          <span>
            I understand these tests transfer fake BDT to the selected wallet.
          </span>
        </label>
        {message ? (
          <div className="mt-3">
            <InlineError>{message}</InlineError>
          </div>
        ) : null}
      </section>

      <TrustLab
        scenarios={scenarios}
        title="Transaction stress tests"
        description="Each run uses production mutations and the reactive dashboard balance. No client-side balance simulation is involved."
        className="[&_article]:h-full"
      />

      <p className="flex items-center gap-2 text-xs leading-5 text-muted-foreground">
        <FlaskConical aria-hidden="true" className="size-4 shrink-0" />A browser
        disconnect can hide a response, but retrying the duplicate test intent
        still resolves to its original receipt.
      </p>
    </div>
  );
}
