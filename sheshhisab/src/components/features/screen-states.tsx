import { AlertCircle } from "lucide-react";
import type { ReactNode } from "react";

export function ScreenLoading({
  label = "Loading wallet",
}: {
  label?: string;
}) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center px-4">
      <output className="w-full max-w-sm" aria-label={label}>
        <span className="mx-auto flex w-fit items-center gap-2.5 rounded-full bg-card px-4 py-2.5 text-sm text-muted-foreground ring-1 ring-foreground/10">
          <span className="flex items-center gap-1" aria-hidden="true">
            {[0, 1, 2].map((index) => (
              <span
                key={index}
                className="size-1.5 animate-pulse rounded-full bg-primary motion-reduce:animate-none"
                style={{ animationDelay: `${index * 120}ms` }}
              />
            ))}
          </span>
          <span>{label}</span>
        </span>
        <span className="mt-6 block space-y-3" aria-hidden="true">
          <span className="block h-24 animate-pulse rounded-3xl bg-muted motion-reduce:animate-none" />
          <span className="grid grid-cols-2 gap-3">
            <span className="h-12 animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />
            <span className="h-12 animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />
          </span>
        </span>
      </output>
    </div>
  );
}

export function InlineError({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-2xl border border-destructive/25 bg-destructive/5 px-3 py-3 text-sm text-destructive"
    >
      <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        {eyebrow ? (
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-1 text-3xl font-semibold tracking-[-0.045em] text-foreground sm:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
