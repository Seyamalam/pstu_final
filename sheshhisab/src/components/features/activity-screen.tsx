"use client";

import { usePaginatedQuery } from "convex/react";
import { FileChartColumn } from "lucide-react";
import Link from "next/link";
import { ActivityList } from "@/components/app/activity-list";
import {
  type ButtonState,
  StatefulButton,
} from "@/components/motion/button/stateful";
import { api } from "../../../convex/_generated/api";

import { activityItem } from "./activity-adapter";
import { PageHeading, ScreenLoading } from "./screen-states";

export function ActivityScreen() {
  const { results, status, loadMore } = usePaginatedQuery(
    api.activity.list,
    {},
    { initialNumItems: 20 },
  );

  if (status === "LoadingFirstPage") {
    return <ScreenLoading label="Loading activity" />;
  }

  const buttonState: ButtonState =
    status === "LoadingMore" ? "loading" : "idle";

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <PageHeading
        eyebrow="Activity"
        title="Money in and out"
        action={
          <Link
            href="/app/statements"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-medium outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
          >
            <FileChartColumn aria-hidden="true" className="size-4" />
            Statement
          </Link>
        }
      />
      <ActivityList
        title="All transfers"
        description={`${results.length} transfer${results.length === 1 ? "" : "s"} loaded`}
        items={results.map(activityItem)}
      />
      {status !== "Exhausted" ? (
        <StatefulButton
          state={buttonState}
          loadingText="Loading more"
          onClick={() => loadMore(20)}
          disabled={status !== "CanLoadMore"}
          variant="outline"
          size="lg"
          className="self-center"
        >
          Load more
        </StatefulButton>
      ) : results.length > 0 ? (
        <p className="text-center text-xs text-muted-foreground">
          You reached the beginning.
        </p>
      ) : null}
    </div>
  );
}
