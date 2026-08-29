import {
  Bell,
  Building2,
  CalendarClock,
  ChevronRight,
  FileChartColumn,
  HandCoins,
  Landmark,
  PiggyBank,
  QrCode,
  Split,
} from "lucide-react";
import Link from "next/link";
import { AuthEmailSettings } from "./auth-email-settings";
import { PwaSettings } from "./pwa-settings";
import { PageHeading } from "./screen-states";

const actions = [
  { href: "/app/request", label: "Request money", icon: HandCoins },
  { href: "/app/money", label: "Add or withdraw", icon: Landmark },
  { href: "/app/wallets", label: "Wallets and members", icon: Building2 },
  { href: "/app/schedules", label: "Scheduled transfers", icon: CalendarClock },
  { href: "/app/budgets", label: "Budgets", icon: PiggyBank },
  { href: "/app/splits", label: "Split bills", icon: Split },
  { href: "/app/notifications", label: "Alerts", icon: Bell },
  { href: "/app/statements", label: "Statements", icon: FileChartColumn },
  { href: "/app/scan", label: "My payment QR", icon: QrCode },
];

export function MoreScreen() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <PageHeading eyebrow="Wallet" title="More" />
      <section className="overflow-hidden rounded-[1.5rem] bg-card ring-1 ring-foreground/10">
        {actions.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex min-h-16 items-center gap-3 border-border px-4 outline-none transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring [&:not(:last-child)]:border-b"
          >
            <span className="grid size-10 place-items-center rounded-xl bg-muted text-primary">
              <Icon aria-hidden="true" className="size-4" />
            </span>
            <span className="flex-1 text-sm font-medium">{label}</span>
            <ChevronRight
              aria-hidden="true"
              className="size-4 text-muted-foreground"
            />
          </Link>
        ))}
      </section>
      <PwaSettings />
      <AuthEmailSettings />
    </div>
  );
}
