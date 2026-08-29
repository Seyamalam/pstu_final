import { LoaderCircle } from "lucide-react";

export default function WalletLoading() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <output className="flex items-center gap-3 rounded-2xl bg-card px-4 py-3 text-sm text-muted-foreground ring-1 ring-foreground/10">
        <LoaderCircle
          aria-hidden="true"
          className="size-4 animate-spin motion-reduce:animate-none"
        />
        Loading wallet
      </output>
    </main>
  );
}
