import {
  ArrowRightIcon,
  CheckCircle2Icon,
  FingerprintIcon,
  GaugeIcon,
  Repeat2Icon,
  ShieldCheckIcon,
  WalletCardsIcon,
} from "lucide-react";
import Link from "next/link";
import { ViewTransition } from "react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const trustFeatures = [
  {
    icon: Repeat2Icon,
    title: "Duplicate safe",
    copy: "One intent key always resolves to one transfer.",
  },
  {
    icon: GaugeIcon,
    title: "Race tested",
    copy: "Concurrent spending can never push a balance below zero.",
  },
  {
    icon: FingerprintIcon,
    title: "Auditable",
    copy: "Every transfer produces one equal debit and credit.",
  },
];

export default function Home() {
  return (
    <main className="min-h-dvh overflow-hidden">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
        <Link
          href="/"
          className="group flex min-h-11 items-center gap-3 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          aria-label="SheshHisab home"
        >
          <ViewTransition name="brand-mark" share="morph" default="none">
            <span className="flex size-10 items-center justify-center rounded-xl bg-foreground text-background transition-transform duration-150 group-hover:-rotate-2 motion-reduce:transform-none">
              <WalletCardsIcon className="size-5" aria-hidden="true" />
            </span>
          </ViewTransition>
          <span className="font-heading text-lg font-semibold tracking-[-0.03em]">
            SheshHisab
          </span>
        </Link>
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

      <section className="mx-auto grid w-full max-w-7xl items-center gap-14 px-5 pb-20 pt-14 sm:px-8 md:pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:px-12 lg:pb-28 lg:pt-24">
        <div className="flex max-w-2xl flex-col items-start gap-7">
          <div className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
            <span
              className="size-2 rounded-full bg-primary"
              aria-hidden="true"
            />
            Closed-loop demo wallet · fake BDT only
          </div>
          <div className="flex flex-col gap-5">
            <h1 className="text-balance font-heading text-5xl font-semibold leading-[0.98] tracking-[-0.065em] sm:text-6xl lg:text-7xl">
              Money that settles
              <span className="text-primary"> once.</span>
            </h1>
            <p className="max-w-xl text-balance text-lg leading-8 text-muted-foreground sm:text-xl">
              Send and request fake taka in seconds. Every committed payment has
              one receipt, two balanced ledger entries, and no room for a
              double-charge.
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Link
              href="/login?mode=signup"
              className={cn(
                buttonVariants(),
                "h-12 rounded-xl px-5 text-[0.95rem] shadow-lg shadow-primary/15",
              )}
            >
              Open your wallet
              <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
            </Link>
            <Link
              href="/#trust"
              className={cn(
                buttonVariants({ variant: "ghost" }),
                "h-12 rounded-xl px-5 text-[0.95rem]",
              )}
            >
              See how trust works
            </Link>
          </div>
          <div className="grid w-full grid-cols-3 gap-3 pt-3 text-sm">
            {[
              ["৳100k", "opening balance"],
              ["1×", "per payment intent"],
              ["0", "floating-point taka"],
            ].map(([value, label]) => (
              <div
                key={label}
                className="flex flex-col gap-1 border-l-2 border-border pl-3"
              >
                <span className="font-mono text-base font-semibold text-foreground sm:text-lg">
                  {value}
                </span>
                <span className="text-xs leading-4 text-muted-foreground">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-xl lg:mx-0">
          <div
            className="absolute -right-24 -top-24 size-72 rounded-full border border-primary/15"
            aria-hidden="true"
          />
          <div
            className="absolute -bottom-12 -left-12 size-36 rounded-full border border-warning/20"
            aria-hidden="true"
          />
          <div className="paper-shadow relative overflow-hidden rounded-[1.75rem] border bg-card p-5 sm:p-7">
            <div className="flex items-center justify-between border-b pb-5">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  Available balance
                </span>
                <span className="font-mono text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">
                  ৳100,000.00
                </span>
              </div>
              <span className="flex size-11 items-center justify-center rounded-full bg-secondary text-primary">
                <ShieldCheckIcon aria-hidden="true" />
              </span>
            </div>
            <div className="flex flex-col gap-4 py-6">
              <div className="flex items-start justify-between gap-5">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-foreground font-mono text-sm font-semibold text-background">
                    RI
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium">Rent with Rifat</span>
                    <span className="text-sm text-muted-foreground">
                      @rifat · just now
                    </span>
                  </div>
                </div>
                <span className="font-mono font-semibold">−৳2,500.00</span>
              </div>
              <div className="rounded-xl bg-secondary/70 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium text-primary">
                  <CheckCircle2Icon className="size-4" aria-hidden="true" />
                  Transfer committed
                </div>
                <div className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 font-mono text-xs">
                  <span className="text-muted-foreground">Rifat credit</span>
                  <span>+৳2,500.00</span>
                  <span className="text-muted-foreground">Your debit</span>
                  <span>−৳2,500.00</span>
                  <span className="border-t pt-2 font-sans font-medium">
                    Ledger difference
                  </span>
                  <span className="border-t pt-2 font-semibold text-primary">
                    ৳0.00
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-dashed px-4 py-3 text-xs text-muted-foreground">
              <span>Receipt SH-8F2K-19QP</span>
              <span className="font-medium text-foreground">Verified once</span>
            </div>
          </div>
        </div>
      </section>

      <section id="trust" className="border-y bg-foreground text-background">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:px-12 lg:py-20">
          <div className="flex max-w-md flex-col gap-4">
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-background/55">
              The Trust Lab
            </span>
            <h2 className="text-balance font-heading text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">
              We demo the failure paths, not just the happy path.
            </h2>
            <p className="leading-7 text-background/65">
              Retry the same payment five times or race two oversized payments.
              SheshHisab shows what committed, what failed, and why the balance
              stayed correct.
            </p>
          </div>
          <div className="grid gap-px overflow-hidden rounded-2xl border border-background/15 bg-background/15 sm:grid-cols-3">
            {trustFeatures.map(({ icon: FeatureIcon, title, copy }) => (
              <article
                key={title}
                className="flex flex-col gap-5 bg-foreground p-6"
              >
                <FeatureIcon
                  className="size-5 text-[#73d7b3]"
                  aria-hidden="true"
                />
                <div className="flex flex-col gap-2">
                  <h3 className="font-medium">{title}</h3>
                  <p className="text-sm leading-6 text-background/60">{copy}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-5 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
        <span>SheshHisab · built for the PSTU National Hackathon</span>
        <span>Fake funds. Real correctness.</span>
      </footer>
    </main>
  );
}
