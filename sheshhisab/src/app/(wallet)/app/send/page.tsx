import type { Metadata } from "next";

import { SendFlow } from "@/components/features/send-flow";

export const instant = false;

export const metadata: Metadata = {
  title: "Send money",
  description: "Send money to a SheshHisab handle.",
};

export default async function SendPage({
  searchParams,
}: PageProps<"/app/send">) {
  const params = await searchParams;
  const initialHandle =
    typeof params.to === "string" ? params.to.trim().toLowerCase() : "";
  const initialAmount =
    typeof params.amount === "string" ? params.amount.trim() : "";
  const initialNote = typeof params.note === "string" ? params.note : "";
  return (
    <SendFlow
      initialHandle={initialHandle}
      initialAmount={initialAmount}
      initialNote={initialNote}
    />
  );
}
