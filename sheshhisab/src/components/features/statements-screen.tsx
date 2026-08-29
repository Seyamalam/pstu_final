"use client";

import { useQuery } from "convex/react";
import { Download } from "lucide-react";
import { useState } from "react";
import { ActivityList } from "@/components/app/activity-list";
import { Button } from "@/components/motion/button/base";
import { cn } from "@/lib/utils";
import { api } from "../../../convex/_generated/api";
import { activityItem } from "./activity-adapter";
import { formatPoisha } from "./money";
import { PageHeading, ScreenLoading } from "./screen-states";

const DAY_MS = 86_400_000;

export function StatementsScreen() {
  const [days, setDays] = useState(30);
  const [toExclusive] = useState(() => Date.now() + 1);
  const statement = useQuery(api.statements.get, {
    fromInclusive: toExclusive - days * DAY_MS,
    toExclusive,
  });

  if (statement === undefined) {
    return <ScreenLoading label="Loading statement" />;
  }

  const maxMovement = statement.days.reduce((max, day) => {
    const value = day.creditTotalPoisha + day.debitTotalPoisha;
    return value > max ? value : max;
  }, 0n);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <PageHeading
        eyebrow="Statement"
        title="Money at a glance"
        action={
          <Button
            type="button"
            variant="outline"
            onClick={() => window.print()}
            data-print-hidden="true"
          >
            <Download aria-hidden="true" className="size-4" />
            Save PDF
          </Button>
        }
      />

      <div className="flex gap-2" data-print-hidden="true">
        {[7, 30, 90].map((period) => (
          <button
            key={period}
            type="button"
            onClick={() => setDays(period)}
            className={cn(
              "min-h-11 rounded-xl px-4 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring",
              days === period
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground ring-1 ring-foreground/10 hover:text-foreground",
            )}
          >
            {period} days
          </button>
        ))}
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Money in", formatPoisha(statement.summary.creditTotalPoisha)],
          ["Money out", formatPoisha(statement.summary.debitTotalPoisha)],
          ["Net", formatPoisha(statement.summary.netPoisha)],
          ["Transfers", String(statement.summary.entryCount)],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10"
          >
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-2 font-mono text-xl font-semibold tabular-nums">
              {value}
            </p>
          </div>
        ))}
      </section>

      <section className="rounded-[1.5rem] bg-card p-5 ring-1 ring-foreground/10">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Daily movement</h2>
          <span className="text-xs text-muted-foreground">UTC</span>
        </div>
        {statement.days.length ? (
          <div
            className="mt-5 flex h-32 items-end gap-1.5"
            role="img"
            aria-label="Daily transfer totals"
          >
            {statement.days.map((day) => {
              const movement = day.creditTotalPoisha + day.debitTotalPoisha;
              const height =
                maxMovement > 0n ? Number((movement * 100n) / maxMovement) : 0;
              return (
                <div
                  key={day.dayStart}
                  className="min-w-1 flex-1 rounded-t-sm bg-primary/75"
                  style={{ height: `${Math.max(height, 4)}%` }}
                  title={`${new Date(day.dayStart).toLocaleDateString()}: ${formatPoisha(movement)}`}
                />
              );
            })}
          </div>
        ) : (
          <p className="mt-5 text-sm text-muted-foreground">
            No activity in this period.
          </p>
        )}
      </section>

      <ActivityList
        title="Statement entries"
        description={`${statement.entries.length} item${statement.entries.length === 1 ? "" : "s"}`}
        items={statement.entries.map(activityItem)}
      />
    </div>
  );
}
