import type { Metadata } from "next";

import { ScheduledTransfersScreen } from "@/components/features/scheduled-transfers-screen";

export const metadata: Metadata = { title: "Scheduled transfers" };

export default function ScheduledTransfersPage() {
  return <ScheduledTransfersScreen />;
}
