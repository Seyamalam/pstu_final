import { Check, FlaskConical, X } from "lucide-react";
import type { ReactNode } from "react";

import {
  AnimatedBadge,
  type AnimatedBadgeStatus,
} from "@/components/motion/animated-badge";
import { cn } from "@/lib/utils";

export type TrustScenarioStatus = "idle" | "running" | "passed" | "failed";

export interface TrustMetric {
  label: string;
  value: string;
}

export interface TrustCheck {
  label: string;
  passed: boolean;
  detail?: string;
}

export interface TrustScenario {
  id: string;
  title: string;
  description: string;
  status: TrustScenarioStatus;
  statusLabel: string;
  metrics: TrustMetric[];
  checks: TrustCheck[];
  result?: string;
  action?: ReactNode;
}

export interface TrustLabProps {
  scenarios: TrustScenario[];
  title?: string;
  description?: string;
  className?: string;
}

const scenarioBadgeStatus: Record<TrustScenarioStatus, AnimatedBadgeStatus> = {
  idle: "neutral",
  running: "loading",
  passed: "success",
  failed: "danger",
};

function TrustScenarioCard({ scenario }: { scenario: TrustScenario }) {
  return (
    <article className="rounded-[1.5rem] bg-card p-4 ring-1 ring-foreground/10 sm:p-5">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold tracking-tight text-card-foreground">
            {scenario.title}
          </h3>
          <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">
            {scenario.description}
          </p>
        </div>
        <AnimatedBadge
          status={scenarioBadgeStatus[scenario.status]}
          size="sm"
          aria-live="polite"
        >
          {scenario.statusLabel}
        </AnimatedBadge>
      </header>

      {scenario.metrics.length > 0 ? (
        <dl className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-border ring-1 ring-border sm:grid-cols-4">
          {scenario.metrics.map((metric) => (
            <div key={metric.label} className="min-w-0 bg-background px-3 py-3">
              <dt className="truncate text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                {metric.label}
              </dt>
              <dd className="mt-1 truncate font-mono text-sm font-semibold text-foreground tabular-nums">
                {metric.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      {scenario.checks.length > 0 ? (
        <ul
          className="mt-4 flex flex-col gap-2"
          aria-label={`${scenario.title} checks`}
        >
          {scenario.checks.map((check) => {
            const Icon = check.passed ? Check : X;

            return (
              <li
                key={check.label}
                className="flex items-start gap-3 rounded-2xl bg-muted/50 px-3 py-3"
              >
                <span
                  className={cn(
                    "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full",
                    check.passed
                      ? "bg-primary text-primary-foreground"
                      : "bg-destructive/10 text-destructive ring-1 ring-destructive/20",
                  )}
                >
                  <Icon aria-hidden="true" className="size-3" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-foreground">
                    {check.label}
                  </span>
                  {check.detail ? (
                    <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                      {check.detail}
                    </span>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}

      {scenario.result ? (
        <p className="mt-4 border-l-2 border-primary pl-3 text-sm leading-6 text-muted-foreground">
          {scenario.result}
        </p>
      ) : null}

      {scenario.action ? (
        <div className="mt-5 flex min-h-11 items-center border-t border-border pt-4">
          {scenario.action}
        </div>
      ) : null}
    </article>
  );
}

export function TrustLab({
  scenarios,
  title = "Trust Lab",
  description = "Run controlled failures and inspect the proof after the database commits.",
  className,
}: TrustLabProps) {
  return (
    <section className={cn("flex flex-col gap-5", className)}>
      <header className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground">
          <FlaskConical aria-hidden="true" className="size-5" />
        </span>
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </div>
      </header>

      <div className="grid gap-4 xl:grid-cols-2">
        {scenarios.map((scenario) => (
          <TrustScenarioCard key={scenario.id} scenario={scenario} />
        ))}
      </div>
    </section>
  );
}
