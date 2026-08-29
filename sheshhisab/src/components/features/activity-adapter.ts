import type { ActivityItem } from "@/components/app/activity-list";

import { formatPoisha, formatTimestamp, initials } from "./money";

export interface ActivityRecord {
  publicId: string;
  direction: "debit" | "credit";
  amountPoisha: bigint;
  note: string | null;
  createdAt: number;
  counterparty: {
    displayName: string;
    handle: string;
  };
}

export function activityItem(record: ActivityRecord): ActivityItem {
  const sent = record.direction === "debit";
  const formattedAmount = formatPoisha(
    record.amountPoisha,
    sent ? "minus" : "plus",
  );
  return {
    id: record.publicId,
    kind: sent ? "sent" : "received",
    title: record.counterparty.displayName,
    subtitle: record.note ?? `@${record.counterparty.handle}`,
    initials: initials(record.counterparty.displayName),
    formattedAmount,
    accessibleAmount: `${sent ? "Sent" : "Received"} ${formattedAmount}`,
    timestamp: formatTimestamp(record.createdAt),
    dateTime: new Date(record.createdAt).toISOString(),
    href: `/app/receipt/${record.publicId}`,
  };
}
