import type { Metadata } from "next";

import { ActivityScreen } from "@/components/features/activity-screen";

export const instant = false;

export const metadata: Metadata = {
  title: "Activity",
  description: "Browse your sent and received fake-BDT transfers.",
};

export default function ActivityPage() {
  return <ActivityScreen />;
}
