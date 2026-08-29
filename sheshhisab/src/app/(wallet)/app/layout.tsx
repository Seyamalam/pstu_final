import type { ReactNode } from "react";

import { WalletFrame } from "@/components/features/wallet-frame";
import { ConvexClientProvider } from "@/components/providers/convex-client-provider";
import { getToken } from "@/lib/auth-server";

// Authentication must resolve before wallet routes may issue Convex queries.
export const instant = false;

export default async function WalletLayout({
  children,
}: {
  children: ReactNode;
}) {
  const token = await getToken();
  return (
    <ConvexClientProvider initialToken={token}>
      <WalletFrame>{children}</WalletFrame>
    </ConvexClientProvider>
  );
}
