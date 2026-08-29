import {
  ArrowDownLeft,
  ArrowRight,
  Fingerprint,
  QrCode,
  ReceiptText,
  SendHorizontal,
} from "lucide-react";
import Link from "next/link";
import { Brand } from "@/components/app/brand";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const features = [
  { label: "QR pay", icon: QrCode },
  { label: "Receipts", icon: ReceiptText },
  { label: "Biometric lock", icon: Fingerprint },
];

export default function Home() {
  return (
    <main className="min-h-dvh overflow-hidden">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
        <Brand href="/" />
        <Link
          href="/login"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-11 rounded-xl px-4",
          )}
        >
          Sign in
        </Link>
      </header>

      <section className="mx-auto grid w-full max-w-7xl items-center gap-14 px-5 pb-20 pt-14 sm:px-8 md:pt-20 lg:grid-cols-[1fr_0.9fr] lg:px-12 lg:pb-28 lg:pt-24">
        <div className="flex max-w-2xl flex-col items-start gap-7">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Pay by handle or QR
          </p>
          <h1 className="text-balance text-5xl font-semibold leading-[0.96] tracking-[-0.065em] sm:text-6xl lg:text-7xl">
            Send. Request.
            <span className="block text-primary">Done.</span>
          </h1>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Link
              href="/login?mode=signup"
              className={cn(
                buttonVariants(),
                "h-12 rounded-xl px-5 text-[0.95rem] shadow-lg shadow-primary/15",
              )}
            >
              Create wallet
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
            <Link
              href="/login"
              className={cn(
                buttonVariants({ variant: "ghost" }),
                "h-12 rounded-xl px-5 text-[0.95rem]",
              )}
            >
              Open wallet
            </Link>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            {features.map(({ label, icon: Icon }) => (
              <span
                key={label}
                className="inline-flex min-h-10 items-center gap-2 rounded-full bg-card px-3 text-sm ring-1 ring-foreground/10"
              >
                <Icon aria-hidden="true" className="size-4 text-primary" />
                {label}
              </span>
            ))}
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-lg lg:mx-0">
          <div
            aria-hidden="true"
            className="absolute -right-20 -top-20 size-56 rounded-full bg-primary/10 blur-3xl"
          />
          <section className="paper-shadow relative overflow-hidden rounded-[2rem] bg-primary p-6 text-primary-foreground sm:p-8">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-primary-foreground/70">
                  Available balance
                </p>
                <p className="mt-2 font-mono text-4xl font-semibold tracking-[-0.055em] tabular-nums sm:text-5xl">
                  ৳100,000.00
                </p>
              </div>
              <span className="rounded-full border border-primary-foreground/20 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em]">
                BDT
              </span>
            </div>
            <div className="mt-10 grid grid-cols-2 gap-2">
              <span className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary-foreground font-semibold text-primary">
                <SendHorizontal aria-hidden="true" className="size-4" /> Send
              </span>
              <span className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-primary-foreground/25 font-semibold">
                <ArrowDownLeft aria-hidden="true" className="size-4" /> Request
              </span>
            </div>
            <div className="mt-7 border-t border-primary-foreground/15 pt-5">
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-2xl bg-primary-foreground/10 font-mono text-xs font-semibold">
                  RI
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">Rifat Islam</p>
                  <p className="text-xs text-primary-foreground/60">
                    @rifat · just now
                  </p>
                </div>
                <p className="font-mono text-sm font-semibold tabular-nums">
                  −৳2,500.00
                </p>
              </div>
            </div>
          </section>
        </div>
      </section>

      <footer className="mx-auto flex w-full max-w-7xl items-center justify-between border-t border-border px-5 py-7 text-sm text-muted-foreground sm:px-8 lg:px-12">
        <span>SheshHisab</span>
        <span>PSTU National Hackathon</span>
      </footer>
    </main>
  );
}
