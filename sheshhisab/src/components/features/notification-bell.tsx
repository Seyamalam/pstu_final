"use client";

import { useQuery } from "convex/react";
import { Bell } from "lucide-react";
import Link from "next/link";

import { api } from "../../../convex/_generated/api";

export function NotificationBell() {
  const notifications = useQuery(api.notifications.list, { limit: 30 });
  const unread =
    notifications?.reduce(
      (count, item) => count + (item.readAt === null ? 1 : 0),
      0,
    ) ?? 0;

  return (
    <Link
      href="/app/notifications"
      aria-label={unread > 0 ? `${unread} unread alerts` : "Alerts"}
      className="relative grid size-11 place-items-center rounded-xl text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Bell aria-hidden="true" className="size-4" />
      {unread > 0 ? (
        <span className="absolute right-1.5 top-1.5 grid min-w-4 place-items-center rounded-full bg-[var(--chart-2)] px-1 font-mono text-[9px] font-semibold leading-4 text-white ring-2 ring-background">
          {unread > 9 ? "9+" : unread}
        </span>
      ) : null}
    </Link>
  );
}
