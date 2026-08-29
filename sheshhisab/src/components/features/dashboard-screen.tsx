"use client";

import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { ArrowDownUp, ArrowRight, HandCoins, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ActivityList } from "@/components/app/activity-list";
import { BalanceCard } from "@/components/app/balance-card";
import { Button } from "@/components/motion/button/base";
import {
  type ButtonState,
  StatefulButton,
} from "@/components/motion/button/stateful";
import { api } from "../../../convex/_generated/api";

import { activityItem } from "./activity-adapter";
import { errorMessage, formatPoisha, formatTimestamp, initials } from "./money";
import { InlineError, PageHeading, ScreenLoading } from "./screen-states";

type DashboardData = FunctionReturnType<typeof api.dashboard.get>;
type PendingRequest = DashboardData["pendingRequests"][number];

function PendingRequestCard({ request }: { request: PendingRequest }) {
  const router = useRouter();
  const accept = useMutation(api.requests.accept);
  const decline = useMutation(api.requests.decline);
  const idempotencyKeyRef = useRef<string | null>(null);
  const [acceptState, setAcceptState] = useState<ButtonState>("idle");
  const [declining, setDeclining] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const acceptRequest = async () => {
    if (acceptState === "loading" || declining) return;
    const idempotencyKey = idempotencyKeyRef.current ?? crypto.randomUUID();
    idempotencyKeyRef.current = idempotencyKey;
    setMessage(null);
    setAcceptState("loading");
    try {
      const receipt = await accept({ requestId: request.id, idempotencyKey });
      setAcceptState("success");
      router.push(`/app/receipt/${receipt.publicId}`);
    } catch (error) {
      setMessage(
        errorMessage(
          error,
          "This request could not be paid. Check your balance and retry.",
        ),
      );
      setAcceptState("error");
    }
  };

  const declineRequest = async () => {
    if (declining || acceptState === "loading") return;
    setMessage(null);
    setDeclining(true);
    try {
      await decline({ requestId: request.id });
    } catch (error) {
      setMessage(
        errorMessage(error, "This request could not be declined. Retry once."),
      );
    } finally {
      setDeclining(false);
    }
  };

  return (
    <article className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-muted font-mono text-xs font-semibold">
          {initials(request.requester.displayName)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-foreground">
                {request.requester.displayName}
              </h3>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                @{request.requester.handle} ·{" "}
                {formatTimestamp(request.createdAt)}
              </p>
            </div>
            <p className="shrink-0 font-mono text-sm font-semibold tabular-nums">
              {formatPoisha(request.amountPoisha)}
            </p>
          </div>
          {request.note ? (
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {request.note}
            </p>
          ) : null}
        </div>
      </div>
      {message ? (
        <div className="mt-3">
          <InlineError>{message}</InlineError>
        </div>
      ) : null}
      <div className="mt-4 flex gap-2 border-t border-border pt-3">
        <StatefulButton
          state={acceptState}
          onClick={() => void acceptRequest()}
          loadingText="Paying"
          successText="Paid"
          errorText="Retry payment"
          className="min-h-11 flex-1"
        >
          Pay request
        </StatefulButton>
        <Button
          variant="outline"
          onClick={() => void declineRequest()}
          disabled={declining || acceptState === "loading"}
          className="min-h-11 flex-1"
        >
          {declining ? "Declining…" : "Decline"}
        </Button>
      </div>
    </article>
  );
}

export function DashboardScreen() {
  const dashboard = useQuery(api.dashboard.get, {});

  if (dashboard === undefined)
    return <ScreenLoading label="Loading your balance" />;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-7">
      <PageHeading
        eyebrow="Your wallet"
        title={`Good to see you, ${dashboard.user.displayName}.`}
        description="Send or request fake BDT, then open any transfer to inspect its balanced ledger proof."
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <BalanceCard
          formattedBalance={formatPoisha(dashboard.account.balancePoisha)}
          accessibleBalance={`Available balance ${formatPoisha(dashboard.account.balancePoisha)}`}
          accountName={dashboard.user.displayName}
          accountHandle={`@${dashboard.user.handle}`}
          status={
            <span className="grid size-8 place-items-center rounded-full bg-primary-foreground/10">
              <ShieldCheck aria-hidden="true" className="size-4" />
            </span>
          }
          actions={
            <>
              <Link
                href="/app/send"
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary-foreground px-4 text-sm font-semibold text-primary outline-none hover:bg-primary-foreground/90 focus-visible:ring-2 focus-visible:ring-primary-foreground/70"
              >
                <ArrowDownUp aria-hidden="true" className="size-4" />
                Send money
              </Link>
              <Link
                href="/app/request"
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-primary-foreground/25 px-4 text-sm font-semibold text-primary-foreground outline-none hover:bg-primary-foreground/10 focus-visible:ring-2 focus-visible:ring-primary-foreground/70"
              >
                <HandCoins aria-hidden="true" className="size-4" />
                Request
              </Link>
            </>
          }
        />

        <section
          aria-labelledby="pending-heading"
          className="flex flex-col gap-3"
        >
          <div className="flex min-h-8 items-center justify-between">
            <div>
              <h2
                id="pending-heading"
                className="text-base font-semibold text-foreground"
              >
                Pending requests
              </h2>
              <p className="text-xs text-muted-foreground">
                Requests waiting for your decision
              </p>
            </div>
            <span className="rounded-full bg-muted px-2.5 py-1 font-mono text-xs font-semibold">
              {dashboard.pendingRequests.length}
            </span>
          </div>
          {dashboard.pendingRequests.length > 0 ? (
            <div className="flex flex-col gap-3">
              {dashboard.pendingRequests.map((request) => (
                <PendingRequestCard key={request.id} request={request} />
              ))}
            </div>
          ) : (
            <div className="flex min-h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-border px-5 text-center">
              <HandCoins
                aria-hidden="true"
                className="size-5 text-muted-foreground"
              />
              <p className="mt-3 text-sm font-medium">
                Nothing needs your attention.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                New requests appear here in real time.
              </p>
            </div>
          )}
        </section>
      </div>

      <ActivityList
        items={dashboard.recentActivity.map(activityItem)}
        action={
          <Link
            href="/app/activity"
            className="inline-flex min-h-11 items-center gap-1 rounded-xl px-3 text-sm font-medium text-primary outline-none hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-ring"
          >
            View all
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        }
        emptyAction={
          <Link
            href="/app/send"
            className="inline-flex min-h-11 items-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Send your first payment
          </Link>
        }
      />
    </div>
  );
}
