import type { Metadata } from "next";

import { MoneyMoveScreen } from "@/components/features/money-move-screen";

export const metadata: Metadata = { title: "Add or withdraw" };

export default function MoneyPage() {
  return <MoneyMoveScreen />;
}
