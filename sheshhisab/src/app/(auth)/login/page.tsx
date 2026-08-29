import type { Metadata } from "next";
import Link from "next/link";

import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in or create your SheshHisab demo wallet.",
};

export default function LoginPage() {
  return (
    <main className="flex min-h-svh w-full flex-1 flex-col px-4 py-5 sm:px-6 sm:py-7">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full py-2 pr-3 text-sm font-semibold tracking-tight text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <span
            aria-hidden
            className="grid size-8 place-items-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-sm"
          >
            শে
          </span>
          <span>শেষহিসাব</span>
        </Link>
        <span className="hidden text-xs font-medium text-muted-foreground sm:block">
          A closed-loop demo wallet
        </span>
      </header>

      <div className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_28rem] lg:py-14">
        <section
          className="hidden max-w-xl lg:block"
          aria-labelledby="auth-promise"
        >
          <p className="text-sm font-semibold text-primary">
            শেষহিসাব / SheshHisab
          </p>
          <h2
            id="auth-promise"
            className="mt-4 text-balance text-5xl font-semibold leading-[1.04] tracking-[-0.045em] text-foreground"
          >
            Money moves once. Your হিসাব always adds up.
          </h2>
          <p className="mt-5 max-w-lg text-lg leading-8 text-muted-foreground">
            Send fake BDT, collect what friends owe, and keep a clear receipt
            for every move.
          </p>
          <dl className="mt-9 grid max-w-lg grid-cols-2 gap-3">
            <div className="rounded-2xl border border-foreground/10 bg-card/80 p-4">
              <dt className="text-sm text-muted-foreground">Opening balance</dt>
              <dd className="font-mono text-2xl font-semibold tabular-nums text-foreground">
                ৳100,000
              </dd>
            </div>
            <div className="rounded-2xl border border-foreground/10 bg-card/80 p-4">
              <dt className="text-sm text-muted-foreground">Transfer rule</dt>
              <dd className="text-2xl font-semibold text-foreground">
                One commit
              </dd>
            </div>
          </dl>
        </section>

        <AuthForm />
      </div>
    </main>
  );
}
