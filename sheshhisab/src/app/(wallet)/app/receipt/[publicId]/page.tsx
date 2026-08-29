import type { Metadata } from "next";

import { ReceiptScreen } from "@/components/features/receipt-screen";

export const instant = false;

export const metadata: Metadata = {
  title: "Receipt",
  description:
    "Inspect a private SheshHisab transfer and its balanced ledger entries.",
};

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  return <ReceiptScreen publicId={publicId} />;
}
