"use client";

import { useQuery } from "convex/react";
import { ArrowLeft, Download, History } from "lucide-react";
import Link from "next/link";
import { ReceiptProof } from "@/components/app/receipt-proof";
import { api } from "../../../convex/_generated/api";

import { formatPoisha, formatTimestamp, initials } from "./money";
import { PageHeading, ScreenLoading } from "./screen-states";

export function ReceiptScreen({ publicId }: { publicId: string }) {
  const receipt = useQuery(api.receipts.getByPublicId, { publicId });

  if (receipt === undefined) return <ScreenLoading label="Loading receipt" />;

  const balanced = receipt.ledgerDifferencePoisha === BigInt(0);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <PageHeading
        eyebrow="Receipt"
        title="Payment complete"
        action={
          <Link
            href="/app/activity"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-medium outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Activity
          </Link>
        }
      />
      <ReceiptProof
        receiptId={receipt.publicId}
        state={balanced ? "complete" : "failed"}
        stateLabel={balanced ? "Balanced" : "Mismatch"}
        formattedAmount={formatPoisha(receipt.amountPoisha)}
        accessibleAmount={`Transfer amount ${formatPoisha(receipt.amountPoisha)}`}
        sender={{
          name: receipt.sender.displayName,
          handle: `@${receipt.sender.handle}`,
          initials: initials(receipt.sender.displayName),
        }}
        recipient={{
          name: receipt.recipient.displayName,
          handle: `@${receipt.recipient.handle}`,
          initials: initials(receipt.recipient.displayName),
        }}
        timestamp={formatTimestamp(receipt.createdAt)}
        dateTime={new Date(receipt.createdAt).toISOString()}
        note={receipt.note ?? undefined}
        debit={{
          label: "Debit",
          accountLabel: receipt.sender.displayName,
          formattedAmount: formatPoisha(receipt.debitAmountPoisha, "minus"),
        }}
        credit={{
          label: "Credit",
          accountLabel: receipt.recipient.displayName,
          formattedAmount: formatPoisha(receipt.creditAmountPoisha, "plus"),
        }}
        proofLabel={
          balanced
            ? `Ledger difference ${formatPoisha(receipt.ledgerDifferencePoisha)}`
            : "The ledger entries do not match. Do not treat this transfer as verified."
        }
        actions={
          <div className="flex flex-wrap gap-2" data-print-hidden="true">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Download aria-hidden="true" className="size-4" />
              Save PDF
            </button>
            <Link
              href="/app/activity"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <History aria-hidden="true" className="size-4" />
              Activity
            </Link>
          </div>
        }
      />
    </div>
  );
}
