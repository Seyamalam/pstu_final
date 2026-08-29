import type { ReactNode } from "react";

import { Brand } from "@/components/app/brand";

export function AuthPageShell({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-svh w-full flex-col px-4 py-3 sm:px-6 sm:py-7">
      <header className="mx-auto flex w-full max-w-6xl items-center">
        <Brand href="/" />
      </header>
      <div className="mx-auto grid w-full max-w-6xl flex-1 place-items-center py-6">
        {children}
      </div>
    </main>
  );
}
