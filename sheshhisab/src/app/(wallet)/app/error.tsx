"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/motion/button/base";

export default function WalletError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-[65vh] items-center justify-center px-4 py-10">
      <section className="w-full max-w-md rounded-[1.75rem] bg-card p-6 text-center ring-1 ring-foreground/10">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-destructive/10 text-destructive">
          <AlertTriangle aria-hidden="true" className="size-5" />
        </span>
        <h1 className="mt-5 text-2xl font-semibold tracking-[-0.035em] text-foreground">
          This wallet view did not load.
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          No payment is complete unless a receipt appears. Retry the view, then
          check activity before sending again.
        </p>
        <Button size="lg" onClick={reset} className="mt-6 w-full">
          <RotateCcw aria-hidden="true" className="size-4" />
          Retry
        </Button>
      </section>
    </main>
  );
}
