import type { Metadata } from "next";

import { RequestFlow } from "@/components/features/request-flow";

export const instant = false;

export const metadata: Metadata = {
  title: "Request money",
  description: "Request fake BDT from another SheshHisab wallet.",
};

export default function RequestPage() {
  return <RequestFlow />;
}
