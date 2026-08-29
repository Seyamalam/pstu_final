import type { Metadata } from "next";

import { Brand } from "@/components/app/brand";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in or create your SheshHisab wallet.",
};

export default function LoginPage() {
  return (
    <main className="flex min-h-svh w-full flex-1 flex-col px-4 py-5 sm:px-6 sm:py-7">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between">
        <Brand href="/" />
      </header>

      <div className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 py-8 lg:grid-cols-[minmax(0,1fr)_36rem] lg:py-12">
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
