"use client";

import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Bell,
  CheckCheck,
  HandCoins,
  Landmark,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/motion/button/base";
import { api } from "../../../convex/_generated/api";
import { errorMessage, formatTimestamp } from "./money";
import { InlineError, PageHeading, ScreenLoading } from "./screen-states";

type Notification = FunctionReturnType<typeof api.notifications.list>[number];

function notificationDetails(notification: Notification) {
  switch (notification.eventKey) {
    case "transfer.received":
      return {
        title: "Payment received",
        href: "/app/activity",
        icon: ArrowDownToLine,
      };
    case "request.created":
      return { title: "Payment request", href: "/app", icon: HandCoins };
    case "request.declined":
      return {
        title: "Request declined",
        href: "/app/activity",
        icon: HandCoins,
      };
    case "request.cancelled":
      return {
        title: "Request cancelled",
        href: "/app/activity",
        icon: HandCoins,
      };
    case "cash_in":
      return {
        title: "Money added",
        href: "/app/money",
        icon: ArrowDownToLine,
      };
    case "cash_out":
      return {
        title: "Money withdrawn",
        href: "/app/money",
        icon: ArrowUpFromLine,
      };
    case "org.member":
      return {
        title: "Organization access added",
        href: "/app/wallets",
        icon: UserPlus,
      };
    default:
      return { title: "Wallet update", href: "/app", icon: Landmark };
  }
}

export function NotificationsScreen() {
  const notifications = useQuery(api.notifications.list, { limit: 50 });
  const markRead = useMutation(api.notifications.markRead);
  const markAllRead = useMutation(api.notifications.markAllRead);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (notifications === undefined) {
    return <ScreenLoading label="Loading alerts" />;
  }

  const unread = notifications.filter((item) => item.readAt === null);
  const markAll = async () => {
    if (busy || unread.length === 0) return;
    setBusy(true);
    setMessage(null);
    try {
      await markAllRead({});
    } catch (error) {
      setMessage(errorMessage(error, "Could not mark alerts as read."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <PageHeading
        eyebrow="Alerts"
        title="Wallet updates"
        action={
          unread.length > 0 ? (
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => void markAll()}
            >
              <CheckCheck aria-hidden="true" className="size-4" />
              Mark all read
            </Button>
          ) : null
        }
      />
      {message ? <InlineError>{message}</InlineError> : null}
      <section className="overflow-hidden rounded-[1.5rem] bg-card ring-1 ring-foreground/10">
        {notifications.length > 0 ? (
          <ul className="divide-y divide-border">
            {notifications.map((notification) => {
              const details = notificationDetails(notification);
              const Icon = details.icon;
              const isUnread = notification.readAt === null;
              return (
                <li key={notification.id}>
                  <Link
                    href={details.href}
                    onClick={() => {
                      if (isUnread) {
                        void markRead({ notificationId: notification.id });
                      }
                    }}
                    className="group flex min-h-[76px] items-center gap-3 px-4 py-3 outline-none transition-colors hover:bg-muted/60 focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                  >
                    <span
                      className={`grid size-11 shrink-0 place-items-center rounded-2xl ${
                        isUnread
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Icon aria-hidden="true" className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-foreground">
                        {details.title}
                      </span>
                      <time className="mt-1 block text-xs text-muted-foreground">
                        {formatTimestamp(notification.createdAt)}
                      </time>
                    </span>
                    {isUnread ? (
                      <>
                        <span className="sr-only">Unread</span>
                        <span
                          aria-hidden="true"
                          className="size-2 rounded-full bg-[var(--chart-2)]"
                        />
                      </>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="flex min-h-56 flex-col items-center justify-center px-6 text-center">
            <span className="grid size-11 place-items-center rounded-2xl bg-muted text-muted-foreground">
              <Bell aria-hidden="true" className="size-5" />
            </span>
            <h2 className="mt-4 text-sm font-semibold">No alerts</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Payments and requests appear here.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
