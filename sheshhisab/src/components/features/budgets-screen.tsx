"use client";

import { useMutation, useQuery } from "convex/react";
import { CalendarRange, Pencil, Plus, Trash2, WalletCards } from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";

import { Button } from "@/components/motion/button/base";
import {
  type ButtonState,
  StatefulButton,
} from "@/components/motion/button/stateful";
import { Input } from "@/components/motion/input";
import { cn } from "@/lib/utils";
import {
  budgetProgress,
  formatDateLocal,
  parseBudgetPeriod,
} from "@/lib/wallet-tools";
import { api } from "../../../convex/_generated/api";
import { errorMessage, formatPoisha, parseBdtInput } from "./money";
import { InlineError, PageHeading, ScreenLoading } from "./screen-states";

const PERIOD_FORMATTER = new Intl.DateTimeFormat("en-BD", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Dhaka",
});

function categoryLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/^./, (letter) => letter.toUpperCase());
}

export function BudgetsScreen() {
  const budgets = useQuery(api.budgets.list, {});
  const categories = useQuery(api.budgets.listCategories, {});
  const wallets = useQuery(api.wallets.list, {});
  const upsertBudget = useMutation(api.budgets.upsert);
  const removeBudget = useMutation(api.budgets.remove);
  const accountRef = useRef<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [category, setCategory] = useState("");
  const [limit, setLimit] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [touched, setTouched] = useState(false);
  const [state, setState] = useState<ButtonState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [removeReady, setRemoveReady] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    const accountId = wallets?.activeAccountId ?? null;
    if (accountRef.current && accountId !== accountRef.current) {
      setEditingId(null);
      setCategory("");
      setLimit("");
      setPeriodStart("");
      setPeriodEnd("");
      setTouched(false);
      setState("idle");
      setMessage(null);
      setRemoveReady(null);
    }
    accountRef.current = accountId;
  }, [wallets?.activeAccountId]);

  if (budgets === undefined || categories === undefined || !wallets) {
    return <ScreenLoading label="Loading budgets" />;
  }
  const active = wallets.contexts.find(
    (context) => context.accountId === wallets.activeAccountId,
  );
  if (!active) return <ScreenLoading label="Loading active wallet" />;
  const canManage = active.role !== "viewer";
  const limitPoisha = parseBdtInput(limit);
  const period = parseBudgetPeriod(periodStart, periodEnd);
  const limitError =
    touched && (limitPoisha === null || limitPoisha <= 0n)
      ? "Enter a limit greater than ৳0.00."
      : undefined;
  const periodError =
    touched && !period ? "Choose a period up to one year." : undefined;
  const usedCategories = new Set(budgets.map((budget) => budget.category));
  const selectableCategories = editingId
    ? categories
    : categories.filter((item) => !usedCategories.has(item));

  const clearForm = () => {
    setEditingId(null);
    setCategory("");
    setLimit("");
    setPeriodStart("");
    setPeriodEnd("");
    setTouched(false);
  };

  const chooseThisMonth = () => {
    const now = new Date();
    setPeriodStart(
      formatDateLocal(new Date(now.getFullYear(), now.getMonth(), 1).getTime()),
    );
    setPeriodEnd(
      formatDateLocal(
        new Date(now.getFullYear(), now.getMonth() + 1, 0).getTime(),
      ),
    );
    setMessage(null);
    if (state !== "idle") setState("idle");
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouched(true);
    if (!canManage || !category || !limitPoisha || !period) return;
    setState("loading");
    setMessage(null);
    try {
      await upsertBudget({ category, limitPoisha, ...period });
      clearForm();
      setState("success");
    } catch (error) {
      setMessage(errorMessage(error, "Could not save this budget."));
      setState("error");
    }
  };

  const edit = (budget: (typeof budgets)[number]) => {
    setEditingId(budget.id);
    setCategory(budget.category);
    setLimit(
      (budget.limitPoisha / 100n).toString() +
        `.${(budget.limitPoisha % 100n).toString().padStart(2, "0")}`,
    );
    setPeriodStart(formatDateLocal(budget.periodStart));
    setPeriodEnd(formatDateLocal(budget.periodEnd - 1));
    setTouched(false);
    setState("idle");
    setMessage(null);
  };

  const remove = async (budget: (typeof budgets)[number]) => {
    if (removeReady !== budget.id) {
      setRemoveReady(budget.id);
      return;
    }
    setRemovingId(budget.id);
    setMessage(null);
    try {
      await removeBudget({ budgetId: budget.id });
      if (editingId === budget.id) clearForm();
      setRemoveReady(null);
    } catch (error) {
      setMessage(errorMessage(error, "Could not remove this budget."));
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <PageHeading
        eyebrow="Planning"
        title="Budgets"
        description={`${active.name} · ${active.role}`}
      />
      {message ? <InlineError>{message}</InlineError> : null}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <section className="overflow-hidden rounded-[1.5rem] bg-card ring-1 ring-foreground/10">
          <header className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-5">
            <h2 className="text-sm font-semibold">Current budgets</h2>
            <span className="font-mono text-xs text-muted-foreground">
              {budgets.length}
            </span>
          </header>
          {budgets.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <WalletCards
                aria-hidden="true"
                className="mx-auto size-5 text-primary"
              />
              <p className="mt-3 text-sm font-medium">No budgets yet</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {budgets.map((budget) => {
                const progress = budgetProgress(
                  budget.spentPoisha,
                  budget.limitPoisha,
                );
                const over = budget.spentPoisha > budget.limitPoisha;
                return (
                  <li key={budget.id} className="px-4 py-4 sm:px-5">
                    <div className="flex items-start justify-between gap-4">
                      <span>
                        <span className="block text-sm font-semibold">
                          {categoryLabel(budget.category)}
                        </span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {PERIOD_FORMATTER.format(budget.periodStart)} –{" "}
                          {PERIOD_FORMATTER.format(budget.periodEnd - 1)}
                        </span>
                      </span>
                      <span className="text-right">
                        <span className="block font-mono text-sm font-semibold tabular-nums">
                          {formatPoisha(budget.spentPoisha)}
                        </span>
                        <span className="block font-mono text-[10px] text-muted-foreground tabular-nums">
                          of {formatPoisha(budget.limitPoisha)}
                        </span>
                      </span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          "h-full rounded-full bg-primary transition-[width] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none",
                          over && "bg-destructive",
                        )}
                        style={{ width: `${progress.percent}%` }}
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <span
                        className={cn(
                          "text-xs text-muted-foreground",
                          over && "text-destructive",
                        )}
                      >
                        {over
                          ? `${formatPoisha(budget.spentPoisha - budget.limitPoisha)} over`
                          : `${formatPoisha(progress.remainingPoisha)} left`}
                      </span>
                      {canManage ? (
                        <span className="flex items-center gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => edit(budget)}
                          >
                            <Pencil aria-hidden="true" className="size-3.5" />
                            Edit
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={removingId === budget.id}
                            onClick={() => void remove(budget)}
                            className={cn(
                              removeReady === budget.id && "text-destructive",
                            )}
                          >
                            <Trash2 aria-hidden="true" className="size-3.5" />
                            {removingId === budget.id
                              ? "Removing"
                              : removeReady === budget.id
                                ? "Confirm remove"
                                : "Remove"}
                          </Button>
                        </span>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="rounded-[1.5rem] bg-card p-5 ring-1 ring-foreground/10 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                {editingId ? (
                  <Pencil aria-hidden="true" className="size-4" />
                ) : (
                  <Plus aria-hidden="true" className="size-4" />
                )}
              </span>
              <h2 className="text-sm font-semibold">
                {editingId ? "Edit budget" : "New budget"}
              </h2>
            </div>
            {editingId ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={clearForm}
              >
                Cancel
              </Button>
            ) : null}
          </div>
          {!canManage ? (
            <p className="mt-3 text-xs text-muted-foreground">View only</p>
          ) : null}
          <form
            onSubmit={submit}
            noValidate
            className="mt-5 flex flex-col gap-3"
          >
            <label className="flex flex-col gap-1.5 px-1 text-sm font-medium">
              Category
              <select
                value={category}
                onChange={(event) => {
                  setCategory(event.target.value);
                  setState("idle");
                  setMessage(null);
                }}
                disabled={
                  !canManage || state === "loading" || Boolean(editingId)
                }
                className="h-11 rounded-full border border-border bg-transparent px-3.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
              >
                <option value="">Choose category</option>
                {selectableCategories.map((item) => (
                  <option key={item} value={item}>
                    {categoryLabel(item)}
                  </option>
                ))}
              </select>
            </label>
            <Input
              label="Limit in BDT"
              value={limit}
              onChange={(value) => {
                setLimit(value);
                setState("idle");
                setMessage(null);
              }}
              inputMode="decimal"
              placeholder="0.00"
              error={limitError}
              reserveErrorLine
              disabled={!canManage || state === "loading"}
            />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <Input
                label="Starts"
                type="date"
                value={periodStart}
                onChange={(value) => {
                  setPeriodStart(value);
                  setState("idle");
                }}
                error={periodError}
                reserveErrorLine
                disabled={!canManage || state === "loading"}
              />
              <Input
                label="Ends"
                type="date"
                value={periodEnd}
                onChange={(value) => {
                  setPeriodEnd(value);
                  setState("idle");
                }}
                error={periodError}
                reserveErrorLine
                disabled={!canManage || state === "loading"}
              />
            </div>
            {!editingId ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={chooseThisMonth}
                className="self-start"
              >
                <CalendarRange aria-hidden="true" className="size-3.5" />
                This month
              </Button>
            ) : null}
            <StatefulButton
              type="submit"
              size="lg"
              state={state}
              loadingText="Saving"
              successText="Saved"
              errorText="Try again"
              disabled={
                !canManage || (!editingId && selectableCategories.length === 0)
              }
              className="mt-1 w-full"
            >
              Save budget
            </StatefulButton>
          </form>
        </section>
      </div>
    </div>
  );
}
