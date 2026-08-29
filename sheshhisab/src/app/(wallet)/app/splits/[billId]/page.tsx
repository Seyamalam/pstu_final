import type { Metadata } from "next";

import { SplitDetailScreen } from "@/components/features/split-detail-screen";

export const metadata: Metadata = { title: "Split bill" };

export default async function SplitBillPage({
  params,
}: {
  params: Promise<{ billId: string }>;
}) {
  const { billId } = await params;
  return <SplitDetailScreen billId={billId} />;
}
