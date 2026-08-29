import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

export interface BrandProps {
  className?: string;
  compact?: boolean;
  href?: string;
}

function BrandMark() {
  return (
    <span
      aria-hidden="true"
      className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-[0.9rem] bg-primary text-primary-foreground shadow-sm"
    >
      <Image
        src="/brand-mark.png"
        alt=""
        width={40}
        height={40}
        priority
        className="size-10 object-cover"
      />
    </span>
  );
}

function BrandContent({ compact }: Pick<BrandProps, "compact">) {
  return (
    <>
      <BrandMark />
      <span className={cn("min-w-0", compact && "sr-only")}>
        <span className="block text-base font-semibold tracking-tight text-foreground">
          শেষহিসাব
        </span>
        <span className="block font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          SheshHisab
        </span>
      </span>
    </>
  );
}

export function Brand({ className, compact = false, href }: BrandProps) {
  const classes = cn(
    "inline-flex min-h-11 items-center gap-3 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    className,
  );

  if (href) {
    return (
      <Link href={href} className={classes} aria-label="SheshHisab home">
        <BrandContent compact={compact} />
      </Link>
    );
  }

  return (
    <div className={classes}>
      <BrandContent compact={compact} />
    </div>
  );
}
