"use client";

import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { ArrowRight, ReceiptText, UserPlus, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useRef, useState } from "react";

import { Button } from "@/components/motion/button/base";
import {
  type ButtonState,
  StatefulButton,
} from "@/components/motion/button/stateful";
import { Input } from "@/components/motion/input";
import { budgetProgress, uniqueParticipantHandles } from "@/lib/wallet-tools";
import { api } from "../../../convex/_generated/api";
import {
  errorMessage,
  formatPoisha,
  formatTimestamp,
  initials,
  parseBdtInput,
} from "./money";
import { PersonPicker, type PersonSummary } from "./person-picker";
import { InlineError, PageHeading, ScreenLoading } from "./screen-states";

type DraftParticipant = PersonSummary & { sharePoisha: bigint };
type SplitBill = FunctionReturnType<typeof api.splitBills.list>[number];

function SplitRow({ bill, label }: { bill: SplitBill; label: string }) {
  const progress = budgetProgress(
    bill.contributedTotalPoisha,
    bill.totalPoisha,
  );
  return (
    <li>
      <Link
        href={`/app/splits/${bill.id}`}
        className="block px-4 py-4 outline-none transition-colors hover:bg-muted/55 focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-5"
      >
        <div className="flex items-start justify-between gap-4">
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">
              {bill.title}
            </span>
            <span className="mt-1 block text-xs text-muted-foreground">
              {label} · {formatTimestamp(bill.createdAt)}
            </span>
          </span>
          <span className="text-right">
            <span className="block font-mono text-sm font-semibold tabular-nums">
              {formatPoisha(bill.totalPoisha)}
            </span>
            <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium capitalize text-primary">
              {bill.status}
              <ArrowRight aria-hidden="true" className="size-3" />
            </span>
          </span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
        <p className="mt-2 font-mono text-[10px] text-muted-foreground tabular-nums">
          {formatPoisha(bill.contributedTotalPoisha)} collected
        </p>
      </Link>
    </li>
  );
}

export function SplitBillsScreen() {
  const router = useRouter();
  const owned = useQuery(api.splitBills.list, { role: "owner", limit: 30 });
  const joined = useQuery(api.splitBills.list, {
    role: "participant",
    limit: 30,
  });
  const wallets = useQuery(api.wallets.list, {});
  const createBill = useMutation(api.splitBills.create);
  const intentKeyRef = useRef<string | null>(null);
  const accountRef = useRef<string | null>(null);
  const [title, setTitle] = useState("");
  const [personQuery, setPersonQuery] = useState("");
  const [person, setPerson] = useState<PersonSummary | null>(null);
  const [share, setShare] = useState("");
  const [participants, setParticipants] = useState<DraftParticipant[]>([]);
  const [touched, setTouched] = useState(false);
  const [state, setState] = useState<ButtonState>("idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const accountId = wallets?.activeAccountId ?? null;
    if (accountRef.current && accountId !== accountRef.current) {
      intentKeyRef.current = null;
      setTitle("");
      setPersonQuery("");
      setPerson(null);
      setShare("");
      setParticipants([]);
      setTouched(false);
      setState("idle");
      setMessage(null);
    }
    accountRef.current = accountId;
  }, [wallets?.activeAccountId]);

  if (owned === undefined || joined === undefined || !wallets) {
    return <ScreenLoading label="Loading split bills" />;
  }
  const active = wallets.contexts.find(
    (context) => context.accountId === wallets.activeAccountId,
  );
  if (!active) return <ScreenLoading label="Loading active wallet" />;
  const canCreate = active.role !== "viewer";
  const activeOwned = owned.filter(
    (bill) => bill.receivingAccountId === active.accountId,
  );
  const sharePoisha = parseBdtInput(share);
  const totalPoisha = participants.reduce(
    (sum, participant) => sum + participant.sharePoisha,
    0n,
  );
  const cleanTitle = title.trim().replace(/\s+/g, " ");

  const resetIntent = () => {
    intentKeyRef.current = null;
    if (state !== "idle") setState("idle");
    setMessage(null);
  };

  const addParticipant = () => {
    if (!person || !sharePoisha || sharePoisha <= 0n) {
      setMessage("Choose a person and enter their share.");
      return;
    }
    if (participants.some((item) => item.handle === person.handle)) {
      setMessage("This person is already included.");
      return;
    }
    setParticipants((current) => [...current, { ...person, sharePoisha }]);
    setPerson(null);
    setPersonQuery("");
    setShare("");
    resetIntent();
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouched(true);
    if (
      !canCreate ||
      cleanTitle.length < 2 ||
      cleanTitle.length > 80 ||
      participants.length < 1 ||
      !uniqueParticipantHandles(participants.map((item) => item.handle))
    ) {
      return;
    }
    const idempotencyKey = intentKeyRef.current ?? crypto.randomUUID();
    intentKeyRef.current = idempotencyKey;
    setState("loading");
    setMessage(null);
    try {
      const bill = await createBill({
        title: cleanTitle,
        participants: participants.map((item) => ({
          handle: item.handle,
          sharePoisha: item.sharePoisha,
        })),
        idempotencyKey,
      });
      setState("success");
      router.push(`/app/splits/${bill.id}`);
    } catch (error) {
      setMessage(errorMessage(error, "Could not create this split."));
      setState("error");
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <PageHeading
        eyebrow="Shared expenses"
        title="Split bills"
        description={`${active.name} · ${active.role}`}
      />
      {message ? <InlineError>{message}</InlineError> : null}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(340px,0.8fr)_minmax(0,1.2fr)]">
        <section className="rounded-[1.5rem] bg-card p-5 ring-1 ring-foreground/10 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <ReceiptText aria-hidden="true" className="size-5" />
            </span>
            <div>
              <h2 className="text-sm font-semibold">New split</h2>
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
            <Input
              label="Title"
              value={title}
              onChange={(value) => {
                setTitle(value);
                resetIntent();
              }}
              maxLength={80}
              placeholder="Team dinner"
              error={
                touched && (cleanTitle.length < 2 || cleanTitle.length > 80)
                  ? "Use 2 to 80 characters."
                  : undefined
              }
              reserveErrorLine
              disabled={!canCreate || state === "loading"}
            />
            <div className="rounded-2xl bg-muted/45 p-3">
              <PersonPicker
                query={personQuery}
                onQueryChange={(value) => {
                  setPersonQuery(value);
                  setPerson(null);
                  setMessage(null);
                }}
                selected={person}
                onSelect={(selected) => {
                  setPerson(selected);
                  setPersonQuery(selected.handle);
                  setMessage(null);
                }}
                label="Participant"
                disabled={!canCreate || state === "loading"}
              />
              <div className="mt-2 flex items-end gap-2">
                <Input
                  label="Share in BDT"
                  value={share}
                  onChange={(value) => {
                    setShare(value);
                    setMessage(null);
                  }}
                  inputMode="decimal"
                  placeholder="0.00"
                  disabled={!canCreate || state === "loading"}
                  className="min-w-0 flex-1"
                />
                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  onClick={addParticipant}
                  disabled={!canCreate || participants.length >= 20}
                  className="px-4"
                >
                  <UserPlus aria-hidden="true" className="size-4" />
                  Add
                </Button>
              </div>
            </div>

            {participants.length > 0 ? (
              <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
                {participants.map((participant) => (
                  <li
                    key={participant.id}
                    className="flex min-h-14 items-center gap-3 px-3 py-2"
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-muted font-mono text-[10px] font-semibold">
                      {initials(participant.displayName)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium">
                        {participant.displayName}
                      </span>
                      <span className="block truncate font-mono text-[10px] text-muted-foreground">
                        @{participant.handle}
                      </span>
                    </span>
                    <span className="font-mono text-xs font-semibold tabular-nums">
                      {formatPoisha(participant.sharePoisha)}
                    </span>
                    <button
                      type="button"
                      aria-label={`Remove ${participant.displayName}`}
                      onClick={() => {
                        setParticipants((current) =>
                          current.filter((item) => item.id !== participant.id),
                        );
                        resetIntent();
                      }}
                      className="grid size-10 place-items-center rounded-xl text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <X aria-hidden="true" className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : touched ? (
              <p className="px-1 text-xs text-destructive">
                Add at least one participant.
              </p>
            ) : null}

            <div className="flex items-center justify-between rounded-2xl bg-foreground px-4 py-3 text-background">
              <span className="text-xs font-medium">Total</span>
              <span className="font-mono text-lg font-semibold tabular-nums">
                {formatPoisha(totalPoisha)}
              </span>
            </div>
            <StatefulButton
              type="submit"
              size="lg"
              state={state}
              loadingText="Creating"
              successText="Created"
              errorText="Try again"
              disabled={!canCreate}
              className="w-full"
            >
              Create split
            </StatefulButton>
          </form>
        </section>

        <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
          <section className="overflow-hidden rounded-[1.5rem] bg-card ring-1 ring-foreground/10">
            <header className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-5">
              <h2 className="text-sm font-semibold">Created by you</h2>
              <span className="font-mono text-xs text-muted-foreground">
                {activeOwned.length}
              </span>
            </header>
            {activeOwned.length > 0 ? (
              <ul className="divide-y divide-border">
                {activeOwned.map((bill) => (
                  <SplitRow
                    key={bill.id}
                    bill={bill}
                    label={`${bill.participants.length} people`}
                  />
                ))}
              </ul>
            ) : (
              <p className="px-5 py-10 text-center text-sm text-muted-foreground">
                No created splits
              </p>
            )}
          </section>
          <section className="overflow-hidden rounded-[1.5rem] bg-card ring-1 ring-foreground/10">
            <header className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-5">
              <h2 className="text-sm font-semibold">Your shares</h2>
              <span className="font-mono text-xs text-muted-foreground">
                {joined.length}
              </span>
            </header>
            {joined.length > 0 ? (
              <ul className="divide-y divide-border">
                {joined.map((bill) => (
                  <SplitRow
                    key={bill.id}
                    bill={bill}
                    label={`By ${bill.creator.displayName}`}
                  />
                ))}
              </ul>
            ) : (
              <p className="px-5 py-10 text-center text-sm text-muted-foreground">
                No shared bills
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
