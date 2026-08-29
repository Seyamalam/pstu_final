import {
  ArrowDown,
  CheckCircle2,
  Clock3,
  Minus,
  Plus,
  XCircle,
} from "lucide-react";
import type { ReactNode } from "react";

import {
  AnimatedBadge,
  type AnimatedBadgeStatus,
} from "@/components/motion/animated-badge";
import { cn } from "@/lib/utils";

export type ReceiptState = "complete" | "pending" | "failed";

export interface ReceiptParty {
  name: string;
  handle?: string;
  initials: string;
}

export interface ReceiptLedgerEntry {
  label: string;
  accountLabel: string;
  formattedAmount: string;
  balanceAfter?: string;
}

export interface ReceiptProofProps {
  receiptId: string;
  state: ReceiptState;
  stateLabel: string;
  formattedAmount: string;
  accessibleAmount: string;
  sender: ReceiptParty;
  recipient: ReceiptParty;
  timestamp: string;
  dateTime?: string;
  debit: ReceiptLedgerEntry;
  credit: ReceiptLedgerEntry;
  proofLabel: string;
  note?: string;
  actions?: ReactNode;
  className?: string;
}

const receiptBadgeStatus: Record<ReceiptState, AnimatedBadgeStatus> = {
  complete: "success",
  pending: "loading",
  failed: "danger",
};

const proofIcons = {
  complete: CheckCircle2,
  pending: Clock3,
  failed: XCircle,
} satisfies Record<ReceiptState, typeof CheckCircle2>;

function Party({ party }: { party: ReceiptParty }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span
        aria-hidden="true"
        className="grid size-10 shrink-0 place-items-center rounded-2xl bg-muted font-mono text-xs font-semibold text-foreground ring-1 ring-foreground/10"
      >
        {party.initials}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-foreground">
          {party.name}
        </span>
        {party.handle ? (
          <span className="block truncate font-mono text-xs text-muted-foreground">
            {party.handle}
          </span>
        ) : null}
      </span>
    </div>
  );
}

function LedgerEntry({
  entry,
  direction,
}: {
  entry: ReceiptLedgerEntry;
  direction: "debit" | "credit";
}) {
  const Icon = direction === "debit" ? Minus : Plus;

  return (
    <li className="grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl bg-muted/55 px-3 py-3">
      <span className="grid size-8 place-items-center rounded-xl bg-background text-foreground ring-1 ring-foreground/10">
        <Icon aria-hidden="true" className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
          {entry.label}
        </span>
        <span className="mt-0.5 block truncate text-sm text-foreground">
          {entry.accountLabel}
        </span>
      </span>
      <span className="text-right">
        <span className="block font-mono text-sm font-semibold text-foreground tabular-nums">
          {entry.formattedAmount}
        </span>
        {entry.balanceAfter ? (
          <span className="mt-0.5 block text-[10px] text-muted-foreground">
            Balance {entry.balanceAfter}
          </span>
        ) : null}
      </span>
    </li>
  );
}

export function ReceiptProof({
  receiptId,
  state,
  stateLabel,
  formattedAmount,
  accessibleAmount,
  sender,
  recipient,
  timestamp,
  dateTime,
  debit,
  credit,
  proofLabel,
  note,
  actions,
  className,
}: ReceiptProofProps) {
  const ProofIcon = proofIcons[state];

  return (
    <article
      className={cn(
        "overflow-hidden rounded-[1.75rem] bg-card ring-1 ring-foreground/10",
        className,
      )}
    >
      <header className="border-b border-border px-5 py-5 text-center sm:px-7 sm:py-6">
        <div className="flex items-center justify-between gap-3 text-left">
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Receipt {receiptId}
          </p>
          <AnimatedBadge
            status={receiptBadgeStatus[state]}
            size="sm"
            aria-live="polite"
          >
            {stateLabel}
          </AnimatedBadge>
        </div>
        <p className="mt-7 font-mono text-4xl font-semibold tracking-[-0.05em] text-foreground tabular-nums sm:text-5xl">
          <span className="sr-only">{accessibleAmount}</span>
          <span aria-hidden="true">{formattedAmount}</span>
        </p>
        <time
          dateTime={dateTime}
          className="mt-2 block text-xs text-muted-foreground"
        >
          {timestamp}
        </time>
      </header>

      <section aria-label="Transfer path" className="px-5 py-5 sm:px-7">
        <Party party={sender} />
        <div className="ml-5 flex h-9 items-center border-l border-dashed border-border pl-4">
          <ArrowDown
            aria-hidden="true"
            className="size-4 text-muted-foreground"
          />
        </div>
        <Party party={recipient} />
        {note ? (
          <p className="mt-5 rounded-2xl border border-border px-4 py-3 text-sm leading-6 text-muted-foreground">
            {note}
          </p>
        ) : null}
      </section>

      <section
        aria-labelledby="ledger-proof-heading"
        className="border-t border-border px-5 py-5 sm:px-7"
      >
        <h2
          id="ledger-proof-heading"
          className="text-sm font-semibold text-foreground"
        >
          Payment entries
        </h2>
        <ol className="mt-3 flex flex-col gap-2">
          <LedgerEntry entry={debit} direction="debit" />
          <LedgerEntry entry={credit} direction="credit" />
        </ol>
        <div
          className={cn(
            "mt-3 flex items-center gap-2 rounded-2xl border px-3 py-3 text-sm font-medium",
            state === "complete" &&
              "border-primary/20 bg-primary/5 text-foreground",
            state === "pending" &&
              "border-border bg-muted/50 text-muted-foreground",
            state === "failed" &&
              "border-destructive/20 bg-destructive/5 text-destructive",
          )}
        >
          <ProofIcon
            aria-hidden="true"
            className={cn(
              "size-5 shrink-0",
              state === "complete" && "text-primary",
            )}
          />
          <span>{proofLabel}</span>
        </div>
      </section>

      {actions ? (
        <footer className="flex flex-wrap gap-2 border-t border-border bg-muted/35 px-5 py-4 sm:px-7">
          {actions}
        </footer>
      ) : null}
    </article>
  );
}
