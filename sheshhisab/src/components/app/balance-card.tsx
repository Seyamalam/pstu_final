import { EyeOff } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface BalanceCardProps {
  formattedBalance: string;
  accessibleBalance: string;
  accountName: string;
  accountHandle?: string;
  label?: string;
  fundsLabel?: string;
  hidden?: boolean;
  actions?: ReactNode;
  status?: ReactNode;
  className?: string;
}

export function BalanceCard({
  formattedBalance,
  accessibleBalance,
  accountName,
  accountHandle,
  label = "Available balance",
  fundsLabel = "BDT",
  hidden = false,
  actions,
  status,
  className,
}: BalanceCardProps) {
  return (
    <section
      aria-labelledby="balance-card-title"
      className={cn(
        "relative overflow-hidden rounded-[1.75rem] bg-primary p-5 text-primary-foreground shadow-sm sm:p-7",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-1 bg-primary-foreground/45"
      />

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p
            id="balance-card-title"
            className="text-sm font-medium text-primary-foreground/70"
          >
            {label}
          </p>
          <p className="mt-1 truncate text-sm text-primary-foreground/90">
            {accountName}
            {accountHandle ? (
              <span className="ml-2 font-mono text-xs text-primary-foreground/60">
                {accountHandle}
              </span>
            ) : null}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {status}
          <span className="rounded-full border border-primary-foreground/20 px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-primary-foreground/75">
            {fundsLabel}
          </span>
        </div>
      </div>

      <p
        aria-live="polite"
        aria-atomic="true"
        className="mt-8 flex min-h-14 items-center font-mono text-[clamp(2rem,8vw,3.5rem)] font-semibold leading-none tracking-[-0.055em] tabular-nums"
      >
        <span className="sr-only">
          {hidden ? "Balance hidden" : accessibleBalance}
        </span>
        {hidden ? (
          <>
            <EyeOff aria-hidden="true" className="mr-3 size-6 opacity-60" />
            <span aria-hidden="true" className="tracking-[0.12em]">
              ••••••
            </span>
          </>
        ) : (
          <span aria-hidden="true">{formattedBalance}</span>
        )}
      </p>

      {actions ? (
        <div className="mt-8 flex flex-wrap gap-2 border-t border-primary-foreground/15 pt-4">
          {actions}
        </div>
      ) : null}
    </section>
  );
}
