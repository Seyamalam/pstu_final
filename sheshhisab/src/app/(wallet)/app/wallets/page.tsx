import type { Metadata } from "next";

import { WalletsScreen } from "@/components/features/wallets-screen";

export const metadata: Metadata = { title: "Wallets" };

export default function WalletsPage() {
  return <WalletsScreen />;
}
