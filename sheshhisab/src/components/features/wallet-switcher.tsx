"use client";

import { useMutation, useQuery } from "convex/react";
import { Building2, ChevronDown, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { api } from "../../../convex/_generated/api";

export function WalletSwitcher() {
  const router = useRouter();
  const wallets = useQuery(api.wallets.list, {});
  const switchContext = useMutation(api.wallets.switchContext);
  const [pending, setPending] = useState(false);

  if (!wallets) {
    return (
      <span className="h-10 w-32 animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />
    );
  }

  const active =
    wallets.contexts.find(
      (context) => context.accountId === wallets.activeAccountId,
    ) ?? wallets.contexts[0];
  const Icon = active.kind === "organization" ? Building2 : UserRound;

  return (
    <label className="relative flex min-w-0 items-center">
      <span className="sr-only">Active wallet</span>
      <Icon
        aria-hidden="true"
        className="pointer-events-none absolute left-3 z-10 size-4 text-primary"
      />
      <select
        value={wallets.activeAccountId}
        disabled={pending}
        onChange={(event) => {
          const accountId = event.target
            .value as typeof wallets.activeAccountId;
          setPending(true);
          void switchContext({ accountId })
            .then(() => router.refresh())
            .finally(() => setPending(false));
        }}
        className="h-10 max-w-44 appearance-none truncate rounded-xl border border-border bg-card py-0 pl-9 pr-8 text-sm font-medium text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 sm:max-w-56"
      >
        {wallets.contexts.map((context) => (
          <option key={context.accountId} value={context.accountId}>
            {context.name}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-2.5 size-4 text-muted-foreground"
      />
    </label>
  );
}
