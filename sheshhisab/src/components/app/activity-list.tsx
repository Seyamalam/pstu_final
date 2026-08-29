import {
  ArrowDownLeft,
  ArrowUpRight,
  CircleDollarSign,
  ReceiptText,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type ActivityKind = "sent" | "received" | "request";
export type ActivityStatusTone = "neutral" | "success" | "warning" | "danger";

export interface ActivityItem {
  id: string;
  kind: ActivityKind;
  title: string;
  subtitle?: string;
  initials: string;
  formattedAmount: string;
  accessibleAmount: string;
  timestamp: string;
  dateTime?: string;
  href?: string;
  status?: {
    label: string;
    tone: ActivityStatusTone;
  };
}

export interface ActivityRowProps {
  item: ActivityItem;
  className?: string;
}

const statusClasses: Record<ActivityStatusTone, string> = {
  neutral: "bg-muted text-muted-foreground",
  success: "bg-primary/10 text-primary",
  warning: "bg-muted text-foreground ring-1 ring-border",
  danger: "bg-destructive/10 text-destructive",
};

const activityIcons = {
  sent: ArrowUpRight,
  received: ArrowDownLeft,
  request: CircleDollarSign,
} satisfies Record<ActivityKind, typeof ArrowUpRight>;

export function ActivityRow({ item, className }: ActivityRowProps) {
  const Icon = activityIcons[item.kind];
  const content = (
    <article
      className={cn(
        "group flex min-h-[72px] items-center gap-3 rounded-2xl px-3 py-3 outline-none transition-colors",
        item.href && "hover:bg-muted/65 group-focus-visible:bg-muted/65",
        className,
      )}
    >
      <div className="relative grid size-11 shrink-0 place-items-center rounded-2xl bg-muted font-mono text-xs font-semibold text-foreground ring-1 ring-foreground/10">
        <span aria-hidden="true">{item.initials}</span>
        <span className="absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-full bg-background text-foreground ring-2 ring-background">
          <Icon aria-hidden="true" className="size-3" />
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-medium text-foreground">
          {item.title}
        </h3>
        <div className="mt-0.5 flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
          {item.subtitle ? (
            <span className="truncate">{item.subtitle}</span>
          ) : null}
          {item.subtitle ? <span aria-hidden="true">·</span> : null}
          <time dateTime={item.dateTime} className="shrink-0">
            {item.timestamp}
          </time>
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <p className="font-mono text-sm font-semibold text-foreground tabular-nums">
          <span className="sr-only">{item.accessibleAmount}</span>
          <span aria-hidden="true">{item.formattedAmount}</span>
        </p>
        {item.status ? (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-medium",
              statusClasses[item.status.tone],
            )}
          >
            {item.status.label}
          </span>
        ) : null}
      </div>
    </article>
  );

  return (
    <li className="border-b border-border last:border-0">
      {item.href ? (
        <Link
          href={item.href}
          aria-label={`${item.title}, ${item.accessibleAmount}, ${item.timestamp}`}
          className="group block rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {content}
        </Link>
      ) : (
        content
      )}
    </li>
  );
}

export interface ActivityListProps {
  items: ActivityItem[];
  title?: string;
  description?: string;
  action?: ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  className?: string;
}

export function ActivityList({
  items,
  title = "Recent activity",
  description,
  action,
  emptyTitle = "No activity yet",
  emptyDescription = "Completed transfers and money requests will appear here.",
  emptyAction,
  className,
}: ActivityListProps) {
  return (
    <section
      className={cn(
        "rounded-[1.5rem] bg-card ring-1 ring-foreground/10",
        className,
      )}
    >
      <header className="flex items-start justify-between gap-4 px-4 pb-3 pt-4 sm:px-5 sm:pt-5">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-card-foreground">
            {title}
          </h2>
          {description ? (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </header>

      {items.length > 0 ? (
        <ul className="px-1 pb-1 sm:px-2 sm:pb-2">
          {items.map((item) => (
            <ActivityRow key={item.id} item={item} />
          ))}
        </ul>
      ) : (
        <div className="mx-4 mb-4 flex min-h-52 flex-col items-center justify-center rounded-2xl border border-dashed border-border px-6 py-8 text-center sm:mx-5 sm:mb-5">
          <span className="grid size-11 place-items-center rounded-2xl bg-muted text-muted-foreground">
            <ReceiptText aria-hidden="true" className="size-5" />
          </span>
          <h3 className="mt-4 text-sm font-semibold text-foreground">
            {emptyTitle}
          </h3>
          <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
            {emptyDescription}
          </p>
          {emptyAction ? <div className="mt-4">{emptyAction}</div> : null}
        </div>
      )}
    </section>
  );
}
