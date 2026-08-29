import type { Metadata } from "next";

import { TrustScreen } from "@/components/features/trust-screen";

export const instant = false;

export const metadata: Metadata = {
  title: "Trust Lab",
  description:
    "Run live duplicate and concurrent-spend tests against the wallet transaction engine.",
};

export default function TrustPage() {
  return <TrustScreen />;
}
