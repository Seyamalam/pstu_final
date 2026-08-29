import type { Metadata } from "next";
import { ScanScreen } from "@/components/features/scan-screen";

export const metadata: Metadata = { title: "Scan" };
export const instant = false;

export default function ScanPage() {
  return <ScanScreen />;
}
