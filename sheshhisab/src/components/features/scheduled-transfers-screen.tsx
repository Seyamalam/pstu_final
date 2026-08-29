"use client";

import { useMutation, useQuery } from "convex/react";
import { CalendarClock, Clock3, ReceiptText, X } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useEffect, useRef, useState } from "react";

import { Button } from "@/components/motion/button/base";
import {
  type ButtonState,
  StatefulButton,
} from "@/components/motion/button/stateful";
import { Input } from "@/components/motion/input";
import { cn } from "@/lib/utils";
import { parseScheduleDateTime } from "@/lib/wallet-tools";
import { api } from "../../../convex/_generated/api";
import {
  errorMessage,
  formatPoisha,
  formatTimestamp,
  parseBdtInput,
} from "./money";
import { PersonPicker, type PersonSummary } from "./person-picker";
import { InlineError, PageHeading, ScreenLoading } from "./screen-states";

const STATUS_LABEL = {
  pending: "Scheduled",
  completed: "Sent",
  cancelled: "Cancelled",
  failed: "Not sent",
} as const;

function categoryLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/^./, (letter) => letter.toUpperCase());
}

export function ScheduledTransfersScreen() {
  const schedules = useQuery(api.scheduledTransfers.list, { limit: 30 });
  const categories = useQuery(api.budgets.listCategories, {});
  const wallets = useQuery(api.wallets.list, {});
  const createSchedule = useMutation(api.scheduledTransfers.create);
  const cancelSchedule = useMutation(api.scheduledTransfers.cancel);
  const intentKeyRef = useRef<string | null>(null);
  const accountRef = useRef<string | null>(null);
  const [recipientQuery, setRecipientQuery] = useState("");
  const [recipient, setRecipient] = useState<PersonSummary | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [category, setCategory] = useState("");
  const [executeAt, setExecuteAt] = useState("");
  const [touched, setTouched] = useState(false);
  const [state, setState] = useState<ButtonState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [cancelReady, setCancelReady] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    const accountId = wallets?.activeAccountId ?? null;
    if (accountRef.current && accountId !== accountRef.current) {
      intentKeyRef.current = null;
      setRecipient(null);
      setRecipientQuery("");
      setAmount("");
      setNote("");
      setCategory("");
      setExecuteAt("");
      setTouched(false);
      setState("idle");
      setMessage(null);
      setCancelReady(null);
    }
    accountRef.current = accountId;
  }, [wallets?.activeAccountId]);

  if (schedules === undefined || categories === undefined || !wallets) {
    return <ScreenLoading label="Loading scheduled payments" />;
  }

  const active = wallets.contexts.find(
    (context) => context.accountId === wallets.activeAccountId,
  );
  if (!active) return <ScreenLoading label="Loading active wallet" />;
  const canCreate = active.role !== "viewer";
  const activeSchedules = schedules.filter(
    (schedule) => schedule.sourceAccountId === active.accountId,
  );
  const amountPoisha = parseBdtInput(amount);
  const scheduledAt = parseScheduleDateTime(executeAt);
  const amountError =
    touched && (amountPoisha === null || amountPoisha <= 0n)
      ? "Enter an amount greater than ৳0.00."
      : undefined;
  const timeError =
    touched && scheduledAt === null
      ? "Choose a time from one minute to one year ahead."
      : undefined;

  const resetIntent = () => {
    intentKeyRef.current = null;
    if (state !== "idle") setState("idle");
    setMessage(null);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouched(true);
    if (!canCreate || !recipient || !amountPoisha || !scheduledAt) return;
    const idempotencyKey = intentKeyRef.current ?? crypto.randomUUID();
    intentKeyRef.current = idempotencyKey;
    setState("loading");
    setMessage(null);
    try {
      await createSchedule({
        recipientHandle: recipient.handle,
        amountPoisha,
        executeAt: scheduledAt,
        idempotencyKey,
        ...(note.trim() ? { note: note.trim() } : {}),
        ...(category ? { category } : {}),
      });
      intentKeyRef.current = null;
      setRecipient(null);
      setRecipientQuery("");
      setAmount("");
      setNote("");
      setCategory("");
      setExecuteAt("");
      setTouched(false);
      setState("success");
    } catch (error) {
      setMessage(errorMessage(error, "Could not schedule this payment."));
      setState("error");
    }
  };

  const cancel = async (
    scheduledTransferId: (typeof schedules)[number]["id"],
  ) => {
    if (cancelReady !== scheduledTransferId) {
      setCancelReady(scheduledTransferId);
      return;
    }
    if (cancellingId) return;
    setCancellingId(scheduledTransferId);
    setMessage(null);
    try {
      await cancelSchedule({ scheduledTransferId });
      setCancelReady(null);
    } catch (error) {
      setMessage(errorMessage(error, "Could not cancel this payment."));
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <PageHeading
        eyebrow="Payments"
        title="Scheduled transfers"
        description={`${active.name} · ${active.role}`}
      />
      {message ? <InlineError>{message}</InlineError> : null}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
        <section className="rounded-[1.5rem] bg-card p-5 ring-1 ring-foreground/10 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <CalendarClock aria-hidden="true" className="size-5" />
            </span>
            <div>
              <h2 className="text-sm font-semibold">Schedule payment</h2>
              {!canCreate ? (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  View only
                </p>
              ) : null}
            </div>
          </div>
          <form
            onSubmit={submit}
            noValidate
            className="mt-5 flex flex-col gap-3"
          >
            <PersonPicker
              query={recipientQuery}
              onQueryChange={(value) => {
                setRecipientQuery(value);
                setRecipient(null);
                resetIntent();
              }}
              selected={recipient}
              onSelect={(person) => {
                setRecipient(person);
                setRecipientQuery(person.handle);
                resetIntent();
              }}
              label="Recipient"
              disabled={!canCreate || state === "loading"}
              error={touched && !recipient ? "Choose a recipient." : undefined}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Amount in BDT"
                value={amount}
                onChange={(value) => {
                  setAmount(value);
                  resetIntent();
                }}
                inputMode="decimal"
                placeholder="0.00"
                error={amountError}
                reserveErrorLine
                disabled={!canCreate || state === "loading"}
              />
              <Input
                label="Send at"
                type="datetime-local"
                value={executeAt}
                onChange={(value) => {
                  setExecuteAt(value);
                  resetIntent();
                }}
                error={timeError}
                reserveErrorLine
                disabled={!canCreate || state === "loading"}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Note"
                value={note}
                onChange={(value) => {
                  setNote(value);
                  resetIntent();
                }}
                maxLength={120}
                placeholder="Optional"
                disabled={!canCreate || state === "loading"}
              />
              <label className="flex flex-col gap-1.5 px-1 text-sm font-medium">
                Category
                <select
                  value={category}
                  onChange={(event) => {
                    setCategory(event.target.value);
                    resetIntent();
                  }}
                  disabled={!canCreate || state === "loading"}
                  className="h-11 rounded-full border border-border bg-transparent px-3.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                >
                  <option value="">None</option>
                  {categories.map((item) => (
                    <option key={item} value={item}>
                      {categoryLabel(item)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <StatefulButton
              type="submit"
              size="lg"
              state={state}
              loadingText="Scheduling"
              successText="Scheduled"
              errorText="Try again"
              disabled={!canCreate}
              className="mt-1 w-full"
            >
              Schedule payment
            </StatefulButton>
          </form>
        </section>

        <section className="overflow-hidden rounded-[1.5rem] bg-card ring-1 ring-foreground/10">
          <header className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-5">
            <h2 className="text-sm font-semibold">Payments</h2>
            <span className="font-mono text-xs text-muted-foreground">
              {activeSchedules.length}
            </span>
          </header>
          {activeSchedules.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <Clock3
                aria-hidden="true"
                className="mx-auto size-5 text-primary"
              />
              <p className="mt-3 text-sm font-medium">No scheduled payments</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {activeSchedules.map((schedule) => (
                <li key={schedule.id} className="px-4 py-4 sm:px-5">
                  <div className="flex items-start gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted font-mono text-xs font-semibold">
                      {schedule.recipient.displayName.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-3">
                        <span className="truncate text-sm font-medium">
                          {schedule.recipient.displayName}
                        </span>
                        <span className="font-mono text-sm font-semibold tabular-nums">
                          {formatPoisha(schedule.amountPoisha)}
                        </span>
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                        <span>@{schedule.recipient.handle}</span>
                        <span aria-hidden="true">·</span>
                        <span>{formatTimestamp(schedule.executeAt)}</span>
                        <span className="rounded-full bg-muted px-2 py-0.5 font-medium text-foreground">
                          {STATUS_LABEL[schedule.status]}
                        </span>
                      </span>
                    </span>
                  </div>
                  {schedule.note ||
                  schedule.category ||
                  schedule.status === "pending" ||
                  schedule.transferPublicId ? (
                    <div className="mt-3 flex flex-wrap items-center gap-2 pl-13">
                      {schedule.category ? (
                        <span className="rounded-full bg-primary/8 px-2.5 py-1 text-xs text-primary">
                          {categoryLabel(schedule.category)}
                        </span>
                      ) : null}
                      {schedule.note ? (
                        <span className="mr-auto truncate text-xs text-muted-foreground">
                          {schedule.note}
                        </span>
                      ) : (
                        <span className="mr-auto" />
                      )}
                      {schedule.transferPublicId ? (
                        <Link
                          href={`/app/receipt/${schedule.transferPublicId}`}
                          className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-primary outline-none hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <ReceiptText
                            aria-hidden="true"
                            className="size-3.5"
                          />
                          Receipt
                        </Link>
                      ) : null}
                      {schedule.status === "pending" ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={cancellingId === schedule.id}
                          onClick={() => void cancel(schedule.id)}
                          className={cn(
                            cancelReady === schedule.id && "text-destructive",
                          )}
                        >
                          <X aria-hidden="true" className="size-3.5" />
                          {cancellingId === schedule.id
                            ? "Cancelling"
                            : cancelReady === schedule.id
                              ? "Confirm cancel"
                              : "Cancel"}
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
