import type { Metadata } from "next";

import { ReceiptScreen } from "@/components/features/receipt-screen";

export const instant = false;

export const metadata: Metadata = {
  title: "Receipt",
  description: "View private SheshHisab payment details.",
};

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  return <ReceiptScreen publicId={publicId} />;
}
