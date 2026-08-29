import type { Metadata } from "next";

import { DashboardScreen } from "@/components/features/dashboard-screen";

// Auth must resolve before this screen issues Convex queries.
export const instant = false;

export const metadata: Metadata = {
  title: "Wallet",
  description: "Your live SheshHisab balance, requests, and recent activity.",
};

export default function WalletPage() {
  return <DashboardScreen />;
}
