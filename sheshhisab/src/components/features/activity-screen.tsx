"use client";

import { usePaginatedQuery } from "convex/react";
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
        eyebrow="Ledger activity"
        title="Every move, in order."
        description="Sent and received transfers update live. Open a row to inspect its paired ledger entries."
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
