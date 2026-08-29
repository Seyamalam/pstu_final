import type { Metadata } from "next";

import { SplitBillsScreen } from "@/components/features/split-bills-screen";

export const metadata: Metadata = { title: "Split bills" };

export default function SplitBillsPage() {
  return <SplitBillsScreen />;
}
