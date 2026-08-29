import type { Metadata } from "next";

import { SendFlow } from "@/components/features/send-flow";

export const instant = false;

export const metadata: Metadata = {
  title: "Send money",
  description: "Send fake BDT once with an idempotent payment intent.",
};

export default function SendPage() {
  return <SendFlow />;
}
