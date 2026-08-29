"use client";

import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Building2,
  CheckCircle2,
  CreditCard,
  Landmark,
  Smartphone,
} from "lucide-react";
import { type FormEvent, useRef, useState } from "react";

import { Button } from "@/components/motion/button/base";
import {
  type ButtonState,
  StatefulButton,
} from "@/components/motion/button/stateful";
import { Input } from "@/components/motion/input";
import {
  type RailIntent,
  railIntent,
  railIntentFingerprint,
} from "@/lib/rail-intent";
import { cn } from "@/lib/utils";
import { api } from "../../../convex/_generated/api";
import {
  errorMessage,
  formatPoisha,
  formatTimestamp,
  parseBdtInput,
} from "./money";
import { InlineError, PageHeading, ScreenLoading } from "./screen-states";

type Direction = "cash_in" | "cash_out";
type Provider = FunctionReturnType<typeof api.rails.listProviders>[number];
type Transaction = FunctionReturnType<typeof api.rails.cashIn>;

function providerIcon(kind: Provider["kind"]) {
  if (kind === "mfs") return Smartphone;
  if (kind === "card") return CreditCard;
  return Landmark;
}

function referenceField(provider: Provider | undefined) {
  if (provider?.kind === "mfs") {
    return {
      label: "Mobile number",
      placeholder: "01XXXXXXXXX",
      inputMode: "tel" as const,
    };
  }
  if (provider?.kind === "card") {
    return {
      label: "Card last 4 digits",
      placeholder: "1234",
      inputMode: "numeric" as const,
    };
  }
  return {
    label: "Account number",
    placeholder: "Account number",
    inputMode: "text" as const,
  };
}

export function MoneyMoveScreen() {
  const wallets = useQuery(api.wallets.list, {});
  const providers = useQuery(api.rails.listProviders, {});
  const active = wallets?.contexts.find(
    (context) => context.accountId === wallets.activeAccountId,
  );
  const history = useQuery(
    api.rails.list,
    active ? { accountId: active.accountId, limit: 12 } : "skip",
  );
  const cashIn = useMutation(api.rails.cashIn);
  const cashOut = useMutation(api.rails.cashOut);
  const intentRef = useRef<RailIntent | null>(null);
  const [direction, setDirection] = useState<Direction>("cash_in");
  const [providerId, setProviderId] = useState("");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [state, setState] = useState<ButtonState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [completed, setCompleted] = useState<Transaction | null>(null);

  if (!wallets || !providers || !active) {
    return <ScreenLoading label="Loading money options" />;
  }

  const provider = providers.find((item) => item.id === providerId);
  const field = referenceField(provider);
  const amountPoisha = parseBdtInput(amount);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (state === "loading") return;
    if (!provider || !amountPoisha || amountPoisha <= 0n) {
      setMessage("Choose a provider and enter a valid amount.");
      setState("error");
      return;
    }
    if (direction === "cash_out" && amountPoisha > active.balancePoisha) {
      setMessage("This amount is above the available balance.");
      setState("error");
      return;
    }

    const fingerprint = railIntentFingerprint({
      accountId: active.accountId,
      direction,
      provider: provider.id,
      amountPoisha,
      reference,
    });
    const intent = railIntent(intentRef.current, fingerprint, () =>
      crypto.randomUUID(),
    );
    intentRef.current = intent;
    setState("loading");
    setMessage(null);
    try {
      const mutation = direction === "cash_in" ? cashIn : cashOut;
      const result = await mutation({
        accountId: active.accountId,
        provider: provider.id,
        amountPoisha,
        reference,
        idempotencyKey: intent.idempotencyKey,
      });
      setCompleted(result);
      setState("success");
    } catch (error) {
      setMessage(errorMessage(error, "Could not move this money."));
      setState("error");
    }
  };

  const reset = () => {
    intentRef.current = null;
    setAmount("");
    setReference("");
    setState("idle");
    setMessage(null);
    setCompleted(null);
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <PageHeading
        eyebrow={active.name}
        title="Add or withdraw money"
        description={`Available: ${formatPoisha(active.balancePoisha)}`}
      />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section className="rounded-[1.5rem] bg-card p-5 ring-1 ring-foreground/10 sm:p-6">
          {completed ? (
            <div className="flex min-h-[28rem] flex-col items-center justify-center text-center">
              <span className="grid size-14 place-items-center rounded-full bg-primary text-primary-foreground motion-safe:animate-[success-pop_240ms_cubic-bezier(0.16,1,0.3,1)]">
                <CheckCircle2 aria-hidden="true" className="size-7" />
              </span>
              <p className="mt-6 font-mono text-4xl font-semibold tracking-[-0.05em] tabular-nums">
                {formatPoisha(completed.amountPoisha)}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {completed.direction === "cash_in" ? "Added from" : "Sent to"}{" "}
                {completed.provider.name}
              </p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                Balance {formatPoisha(completed.balanceAfterPoisha)}
              </p>
              <Button type="button" size="lg" onClick={reset} className="mt-7">
                Done
              </Button>
            </div>
          ) : (
            <form onSubmit={submit} className="flex flex-col gap-4">
              <fieldset>
                <legend className="text-sm font-medium">Direction</legend>
                <div className="mt-2 grid grid-cols-2 rounded-xl bg-muted p-1">
                  {(["cash_in", "cash_out"] as const).map((value) => {
                    const selected = direction === value;
                    const Icon =
                      value === "cash_in" ? ArrowDownToLine : ArrowUpFromLine;
                    return (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => {
                          setDirection(value);
                          setMessage(null);
                          intentRef.current = null;
                        }}
                        className={cn(
                          "flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                          selected
                            ? "bg-card text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <Icon aria-hidden="true" className="size-4" />
                        {value === "cash_in" ? "Add money" : "Withdraw"}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Provider
                <select
                  value={providerId}
                  onChange={(event) => {
                    setProviderId(event.target.value);
                    setReference("");
                    intentRef.current = null;
                  }}
                  disabled={state === "loading"}
                  className="h-12 rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Choose provider</option>
                  <optgroup label="Mobile financial services">
                    {providers
                      .filter((item) => item.kind === "mfs")
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="Banks">
                    {providers
                      .filter((item) => item.kind === "bank")
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="Cards">
                    {providers
                      .filter((item) => item.kind === "card")
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                  </optgroup>
                </select>
              </label>

              <Input
                label="Amount in BDT"
                value={amount}
                onChange={(value) => {
                  setAmount(value);
                  intentRef.current = null;
                  setMessage(null);
                }}
                inputMode="decimal"
                placeholder="0.00"
                disabled={state === "loading"}
              />
              <Input
                label={field.label}
                value={reference}
                onChange={(value) => {
                  setReference(value);
                  intentRef.current = null;
                  setMessage(null);
                }}
                inputMode={field.inputMode}
                placeholder={field.placeholder}
                disabled={state === "loading"}
              />
              {message ? <InlineError>{message}</InlineError> : null}
              <StatefulButton
                type="submit"
                size="lg"
                state={state}
                loadingText="Moving money"
                successText="Complete"
                errorText="Check details"
                icon={
                  direction === "cash_in" ? (
                    <ArrowDownToLine aria-hidden />
                  ) : (
                    <ArrowUpFromLine aria-hidden />
                  )
                }
                className="w-full"
              >
                {direction === "cash_in" ? "Add money" : "Withdraw money"}
              </StatefulButton>
            </form>
          )}
        </section>

        <section className="overflow-hidden rounded-[1.5rem] bg-card ring-1 ring-foreground/10">
          <header className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-5">
            <div>
              <h2 className="text-sm font-semibold">Recent moves</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {active.name}
              </p>
            </div>
            <Building2 aria-hidden="true" className="size-5 text-primary" />
          </header>
          {history === undefined ? (
            <div className="h-56 animate-pulse bg-muted/40 motion-reduce:animate-none" />
          ) : history.length > 0 ? (
            <ul className="divide-y divide-border">
              {history.map((transaction) => {
                const Icon = providerIcon(transaction.provider.kind);
                return (
                  <li
                    key={transaction.id}
                    className="flex min-h-[72px] items-center gap-3 px-4 py-3 sm:px-5"
                  >
                    <span className="grid size-10 place-items-center rounded-xl bg-muted text-primary">
                      <Icon aria-hidden="true" className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {transaction.provider.name}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {transaction.referenceMasked} ·{" "}
                        {formatTimestamp(transaction.createdAt)}
                      </span>
                    </span>
                    <span className="font-mono text-sm font-semibold tabular-nums">
                      {formatPoisha(
                        transaction.amountPoisha,
                        transaction.direction === "cash_in" ? "plus" : "minus",
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="flex min-h-56 flex-col items-center justify-center px-6 text-center">
              <Landmark
                aria-hidden="true"
                className="size-5 text-muted-foreground"
              />
              <h3 className="mt-3 text-sm font-semibold">No money moves</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Add or withdraw money to start.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
