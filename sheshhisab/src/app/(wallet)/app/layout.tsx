import type { ReactNode } from "react";

import { WalletFrame } from "@/components/features/wallet-frame";

// Authentication must resolve before wallet routes may issue Convex queries.
export const instant = false;

export default function WalletLayout({ children }: { children: ReactNode }) {
  return <WalletFrame>{children}</WalletFrame>;
}
