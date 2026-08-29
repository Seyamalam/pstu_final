import type { Metadata } from "next";

import { NotificationsScreen } from "@/components/features/notifications-screen";

export const metadata: Metadata = { title: "Alerts" };

export default function NotificationsPage() {
  return <NotificationsScreen />;
}
