import type { Metadata } from "next";
import { StatementsScreen } from "@/components/features/statements-screen";

export const metadata: Metadata = { title: "Statements" };
export const instant = false;

export default function StatementsPage() {
  return <StatementsScreen />;
}
