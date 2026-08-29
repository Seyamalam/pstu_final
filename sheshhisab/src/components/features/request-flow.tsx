"use client";

import { useMutation } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { CheckCircle2, HandCoins } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/motion/button/base";
import {
  type ButtonState,
  StatefulButton,
} from "@/components/motion/button/stateful";
import { Input } from "@/components/motion/input";
import { api } from "../../../convex/_generated/api";

import { errorMessage, formatPoisha, parseBdtInput } from "./money";
import { PersonPicker, type PersonSummary } from "./person-picker";
import { InlineError, PageHeading } from "./screen-states";

type CreatedRequest = FunctionReturnType<typeof api.requests.create>;

export function RequestFlow() {
  const createRequest = useMutation(api.requests.create);
  const [payerQuery, setPayerQuery] = useState("");
  const [payer, setPayer] = useState<PersonSummary | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [touched, setTouched] = useState(false);
  const [state, setState] = useState<ButtonState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedRequest | null>(null);

  const amountPoisha = parseBdtInput(amount);
  const amountError =
    touched && (amountPoisha === null || amountPoisha <= BigInt(0))
      ? "Enter an amount greater than ৳0.00 with up to two decimals."
      : undefined;
  const payerError =
    touched && !payer ? "Choose a person from the search results." : undefined;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (state === "loading") return;
    setTouched(true);
    setMessage(null);
    if (!payer || amountPoisha === null || amountPoisha <= BigInt(0)) return;

    setState("loading");
    try {
      const result = await createRequest({
        payerHandle: payer.handle,
        amountPoisha,
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      setCreated(result);
      setState("success");
    } catch (error) {
      setMessage(
        errorMessage(
          error,
          "This request could not be created. Check the details and retry.",
        ),
      );
      setState("error");
    }
  };

  const reset = () => {
    setPayerQuery("");
    setPayer(null);
    setAmount("");
    setNote("");
    setTouched(false);
    setState("idle");
    setMessage(null);
    setCreated(null);
  };

  if (created) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
        <PageHeading eyebrow="Complete" title="Request sent" />
        <section className="rounded-[1.75rem] bg-card p-6 text-center ring-1 ring-foreground/10 sm:p-8">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-primary text-primary-foreground">
            <CheckCircle2 aria-hidden="true" className="size-7" />
          </span>
          <p className="mt-6 font-mono text-4xl font-semibold tracking-[-0.05em] tabular-nums">
            {formatPoisha(created.amountPoisha)}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Requested from {created.payer.displayName} · @{created.payer.handle}
          </p>
          <div className="mt-7 flex flex-col gap-2 sm:flex-row">
            <Button size="lg" onClick={reset} className="flex-1">
              Request again
            </Button>
            <Link
              href="/app"
              className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full border border-border px-5 text-sm font-semibold outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
            >
              Back to wallet
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <PageHeading eyebrow="Request money" title="Who owes you?" />
      <form
        onSubmit={submit}
        noValidate
        className="flex flex-col gap-3 rounded-[1.75rem] bg-card p-5 ring-1 ring-foreground/10 sm:p-7"
      >
        <PersonPicker
          query={payerQuery}
          onQueryChange={(value) => {
            setPayerQuery(value);
            setPayer(null);
            setMessage(null);
          }}
          selected={payer}
          onSelect={(person) => {
            setPayer(person);
            setPayerQuery(person.handle);
            setMessage(null);
          }}
          label="Payer handle"
          error={payerError}
          disabled={state === "loading"}
        />
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
          disabled={state === "loading"}
        />
        <Input
          label="Note"
          value={note}
          onChange={setNote}
          maxLength={120}
          placeholder="Dinner, rent, trip…"
          disabled={state === "loading"}
        />
        {message ? <InlineError>{message}</InlineError> : null}
        <StatefulButton
          type="submit"
          size="lg"
          state={state}
          loadingText="Creating request"
          successText="Request sent"
          errorText="Retry request"
          icon={<HandCoins aria-hidden="true" className="size-4" />}
          className="mt-2 w-full"
        >
          Request money
        </StatefulButton>
      </form>
    </div>
  );
}
