import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { Brand } from "./brand";

export interface AppNavigationItem {
  href: string;
  label: string;
  icon: LucideIcon;
  active?: boolean;
  badge?: string;
}

export interface AppNavigationProps {
  items: AppNavigationItem[];
  className?: string;
  compact?: boolean;
  label?: string;
}

export function AppNavigation({
  items,
  className,
  compact = false,
  label = "Wallet navigation",
}: AppNavigationProps) {
  return (
    <nav aria-label={label} className={className}>
      <ul className={cn("flex gap-1", compact ? "items-stretch" : "flex-col")}>
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <li key={item.href} className={cn(compact && "min-w-0 flex-1")}>
              <Link
                href={item.href}
                aria-current={item.active ? "page" : undefined}
                className={cn(
                  "group relative flex min-h-11 items-center rounded-xl text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                  compact
                    ? "flex-col justify-center gap-0.5 px-1 py-1.5 text-[10px]"
                    : "gap-3 px-3",
                  item.active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon aria-hidden="true" className="size-[18px] shrink-0" />
                <span
                  className={cn("truncate", compact && "w-full text-center")}
                >
                  {item.label}
                </span>
                {item.badge ? (
                  <span
                    className={cn(
                      "ml-auto min-w-5 rounded-full px-1.5 py-0.5 text-center font-mono text-[10px] leading-4",
                      item.active
                        ? "bg-primary-foreground/15 text-primary-foreground"
                        : "bg-muted text-foreground",
                      compact && "absolute right-1 top-1 ml-0",
                    )}
                  >
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export interface AppShellProps {
  children: ReactNode;
  navigation: AppNavigationItem[];
  headerActions?: ReactNode;
  sidebarFooter?: ReactNode;
  pageLabel?: string;
  announcement?: ReactNode;
  className?: string;
}

export function AppShell({
  children,
  navigation,
  headerActions,
  sidebarFooter,
  pageLabel,
  announcement,
  className,
}: AppShellProps) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto grid min-h-dvh w-full max-w-[1480px] lg:grid-cols-[248px_minmax(0,1fr)]">
        <aside className="hidden border-r border-border bg-card/35 lg:flex lg:flex-col">
          <div className="px-5 py-5">
            <Brand href="/app" />
          </div>
          <AppNavigation items={navigation} className="px-3" />
          {sidebarFooter ? (
            <div className="mt-auto border-t border-border p-4">
              {sidebarFooter}
            </div>
          ) : null}
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between border-b border-border bg-background/95 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <Brand href="/app" compact className="lg:hidden" />
              {pageLabel ? (
                <p className="truncate text-sm font-medium text-muted-foreground">
                  {pageLabel}
                </p>
              ) : null}
            </div>
            {headerActions ? (
              <div className="flex min-h-11 items-center gap-2">
                {headerActions}
              </div>
            ) : null}
          </header>

          {announcement ? (
            <div className="border-b border-border bg-muted/45 px-4 py-2 text-center text-xs text-muted-foreground sm:px-6 lg:px-8">
              {announcement}
            </div>
          ) : null}

          <main
            id="main-content"
            className={cn(
              "px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-10 lg:pt-8",
              className,
            )}
          >
            {children}
          </main>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 lg:hidden">
        <AppNavigation
          items={navigation}
          compact
          label="Mobile wallet navigation"
        />
      </div>
    </div>
  );
}
