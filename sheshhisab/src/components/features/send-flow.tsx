"use client";

import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { ArrowLeft, CheckCircle2, ReceiptText, Send, Star } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useRef, useState } from "react";
import { Button } from "@/components/motion/button/base";
import {
  type ButtonState,
  StatefulButton,
} from "@/components/motion/button/stateful";
import { Input } from "@/components/motion/input";
import { recipientShortcutGroups } from "@/lib/recipient-shortcuts";
import { cn } from "@/lib/utils";
import { api } from "../../../convex/_generated/api";

import { errorMessage, formatPoisha, parseBdtInput } from "./money";
import { PersonPicker, type PersonSummary } from "./person-picker";
import { RecipientShortcuts } from "./recipient-shortcuts";
import { InlineError, PageHeading, ScreenLoading } from "./screen-states";

type Receipt = FunctionReturnType<typeof api.transfers.send>;
type SendStep = "details" | "review" | "success";

export function SendFlow({
  initialHandle = "",
  initialAmount = "",
  initialNote = "",
}: {
  initialHandle?: string;
  initialAmount?: string;
  initialNote?: string;
}) {
  const viewer = useQuery(api.dashboard.get, {});
  const favoriteRows = useQuery(api.favorites.list, { limit: 20 });
  const sendMoney = useMutation(api.transfers.send);
  const toggleFavorite = useMutation(api.favorites.toggle);
  const intentKeyRef = useRef<string | null>(null);
  const [step, setStep] = useState<SendStep>("details");
  const [recipientQuery, setRecipientQuery] = useState(initialHandle);
  const [recipient, setRecipient] = useState<PersonSummary | null>(null);
  const [amount, setAmount] = useState(initialAmount);
  const [note, setNote] = useState(initialNote.slice(0, 120));
  const [touched, setTouched] = useState(false);
  const [buttonState, setButtonState] = useState<ButtonState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [favoritePending, setFavoritePending] = useState<string | null>(null);

  if (viewer === undefined || viewer === null) {
    return <ScreenLoading label="Preparing send money" />;
  }

  const amountPoisha = parseBdtInput(amount);
  const amountError = touched
    ? amountPoisha === null || amountPoisha <= BigInt(0)
      ? "Enter an amount greater than ৳0.00 with up to two decimals."
      : amountPoisha > viewer.account.balancePoisha
        ? "This amount is above your available balance."
        : undefined
    : undefined;
  const recipientError =
    touched && !recipient
      ? "Choose a person from the search results."
      : undefined;
  const shortcutGroups = recipientShortcutGroups({
    favorites: favoriteRows?.map((row) => row.recipient) ?? [],
    recent: viewer.recentActivity.map((item) => item.counterparty),
  });
  const favoriteHandles = new Set(
    favoriteRows?.map((row) => row.recipient.handle) ?? [],
  );

  const chooseRecipient = (person: PersonSummary) => {
    setRecipient(person);
    setRecipientQuery(person.handle);
    setMessage(null);
  };

  const favoriteRecipient = async (person: PersonSummary) => {
    if (favoritePending) return;
    setFavoritePending(person.handle);
    setMessage(null);
    try {
      await toggleFavorite({ recipientHandle: person.handle });
    } catch (error) {
      setMessage(errorMessage(error, "Could not update favorites."));
    } finally {
      setFavoritePending(null);
    }
  };

  const review = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouched(true);
    setMessage(null);
    if (!recipient || amountPoisha === null || amountPoisha <= BigInt(0))
      return;
    if (amountPoisha > viewer.account.balancePoisha) return;
    intentKeyRef.current = crypto.randomUUID();
    setButtonState("idle");
    setStep("review");
  };

  const confirm = async () => {
    if (!recipient || amountPoisha === null || buttonState === "loading")
      return;
    const idempotencyKey = intentKeyRef.current;
    if (!idempotencyKey) {
      setMessage("This payment review expired. Go back and review it again.");
      setButtonState("error");
      return;
    }

    setMessage(null);
    setButtonState("loading");
    try {
      const result = await sendMoney({
        recipientHandle: recipient.handle,
        amountPoisha,
        idempotencyKey,
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      setReceipt(result);
      setButtonState("success");
      setStep("success");
    } catch (error) {
      setMessage(errorMessage(error, "Payment failed. Try again."));
      setButtonState("error");
    }
  };

  const edit = () => {
    intentKeyRef.current = null;
    setButtonState("idle");
    setMessage(null);
    setStep("details");
  };

  const reset = () => {
    intentKeyRef.current = null;
    setStep("details");
    setRecipientQuery("");
    setRecipient(null);
    setAmount("");
    setNote("");
    setTouched(false);
    setButtonState("idle");
    setMessage(null);
    setReceipt(null);
  };

  if (step === "success" && receipt) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
        <PageHeading eyebrow="Complete" title="Payment sent" />
        <section className="rounded-[1.75rem] bg-card p-6 text-center ring-1 ring-foreground/10 sm:p-8">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-primary text-primary-foreground">
            <CheckCircle2 aria-hidden="true" className="size-7" />
          </span>
          <p className="mt-6 font-mono text-4xl font-semibold tracking-[-0.05em] tabular-nums">
            {formatPoisha(receipt.amountPoisha)}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Sent to {receipt.recipient.displayName} · @
            {receipt.recipient.handle}
          </p>
          <div className="mt-7 flex flex-col gap-2 sm:flex-row">
            <Link
              href={`/app/receipt/${receipt.publicId}`}
              className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ReceiptText aria-hidden="true" className="size-4" />
              Open receipt
            </Link>
            <Button
              variant="outline"
              size="lg"
              onClick={reset}
              className="flex-1"
            >
              Send another
            </Button>
          </div>
        </section>
      </div>
    );
  }

  if (step === "review" && recipient && amountPoisha !== null) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
        <PageHeading eyebrow="Payment" title="Review and confirm" />
        <section className="rounded-[1.75rem] bg-card p-5 ring-1 ring-foreground/10 sm:p-7">
          <dl className="flex flex-col gap-4">
            <div className="border-b border-border pb-4 text-center">
              <dt className="text-xs font-medium text-muted-foreground">
                You are sending
              </dt>
              <dd className="mt-2 font-mono text-4xl font-semibold tracking-[-0.05em] tabular-nums">
                {formatPoisha(amountPoisha)}
              </dd>
            </div>
            <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-3 text-sm">
              <dt className="text-muted-foreground">To</dt>
              <dd className="text-right font-medium">
                {recipient.displayName}{" "}
                <span className="font-mono text-xs">@{recipient.handle}</span>
              </dd>
              <dt className="text-muted-foreground">From</dt>
              <dd className="text-right font-medium">
                {viewer.user.displayName}{" "}
                <span className="font-mono text-xs">@{viewer.user.handle}</span>
              </dd>
              <dt className="text-muted-foreground">Note</dt>
              <dd className="text-right">{note.trim() || "No note"}</dd>
              <dt className="text-muted-foreground">Balance after</dt>
              <dd className="text-right font-mono font-semibold tabular-nums">
                {formatPoisha(viewer.account.balancePoisha - amountPoisha)}
              </dd>
            </div>
          </dl>

          {message ? (
            <div className="mt-5">
              <InlineError>{message}</InlineError>
            </div>
          ) : null}

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row">
            <Button
              variant="outline"
              size="lg"
              onClick={edit}
              disabled={buttonState === "loading"}
              className="flex-1"
            >
              <ArrowLeft aria-hidden="true" className="size-4" />
              Edit details
            </Button>
            <StatefulButton
              size="lg"
              state={buttonState}
              onClick={() => void confirm()}
              loadingText="Sending"
              successText="Sent"
              errorText="Try again"
              icon={<Send aria-hidden="true" className="size-4" />}
              className="flex-1"
            >
              Confirm and send
            </StatefulButton>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <PageHeading
        eyebrow="Send money"
        title="Who are you paying?"
        description={`Available: ${formatPoisha(viewer.account.balancePoisha)}`}
      />
      <form
        onSubmit={review}
        noValidate
        className="flex flex-col gap-3 rounded-[1.75rem] bg-card p-5 ring-1 ring-foreground/10 sm:p-7"
      >
        <PersonPicker
          query={recipientQuery}
          onQueryChange={(value) => {
            setRecipientQuery(value);
            setRecipient(null);
            setMessage(null);
          }}
          selected={recipient}
          onSelect={chooseRecipient}
          label="Recipient handle"
          error={recipientError}
          autoSelectExact={Boolean(initialHandle)}
        />
        {!recipient ? (
          <RecipientShortcuts
            favorites={shortcutGroups.favorites}
            recent={shortcutGroups.recent}
            onSelect={chooseRecipient}
            onToggleFavorite={(person) => void favoriteRecipient(person)}
            pendingHandle={favoritePending}
          />
        ) : (
          <button
            type="button"
            onClick={() => void favoriteRecipient(recipient)}
            disabled={favoritePending === recipient.handle}
            className="flex min-h-11 items-center justify-center gap-2 self-start rounded-xl px-3 text-xs font-medium text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          >
            <Star
              aria-hidden="true"
              className={cn(
                "size-3.5",
                favoriteHandles.has(recipient.handle) &&
                  "fill-[var(--chart-5)] text-[var(--chart-5)]",
              )}
            />
            {favoriteHandles.has(recipient.handle)
              ? "Remove favorite"
              : "Add favorite"}
          </button>
        )}
        <Input
          label="Amount in BDT"
          value={amount}
          onChange={(value) => {
            setAmount(value);
            setMessage(null);
          }}
          inputMode="decimal"
          placeholder="0.00"
          error={amountError}
          reserveErrorLine
        />
        <Input
          label="Note"
          value={note}
          onChange={setNote}
          maxLength={120}
          placeholder="What is this for?"
        />
        {message ? <InlineError>{message}</InlineError> : null}
        <StatefulButton
          type="submit"
          size="lg"
          state={buttonState}
          icon={<Send aria-hidden="true" className="size-4" />}
          className="mt-2 w-full"
        >
          Review payment
        </StatefulButton>
      </form>
    </div>
  );
}
