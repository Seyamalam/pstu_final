"use client";

import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { AtSign, Search, UserRound } from "lucide-react";
import { useEffect } from "react";
import { Input } from "@/components/motion/input";
import { cn } from "@/lib/utils";
import { api } from "../../../convex/_generated/api";

import { canSearchHandle, initials, normalizeHandleInput } from "./money";

export type PersonSummary = FunctionReturnType<typeof api.users.search>[number];

export interface PersonPickerProps {
  query: string;
  onQueryChange: (value: string) => void;
  selected: PersonSummary | null;
  onSelect: (person: PersonSummary) => void;
  label: string;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  autoSelectExact?: boolean;
}

export function PersonPicker({
  query,
  onQueryChange,
  selected,
  onSelect,
  label,
  placeholder = "Search by handle",
  disabled = false,
  error,
  autoSelectExact = false,
}: PersonPickerProps) {
  const normalized = normalizeHandleInput(query);
  const searchable = canSearchHandle(query);
  const results = useQuery(
    api.users.search,
    searchable ? { handlePrefix: normalized } : "skip",
  );
  const showResults = searchable && !selected;

  useEffect(() => {
    if (!autoSelectExact || selected || !results) return;
    const exact = results.find((person) => person.handle === normalized);
    if (exact) onSelect(exact);
  }, [autoSelectExact, normalized, onSelect, results, selected]);

  return (
    <div className="flex flex-col gap-2">
      <Input
        label={label}
        value={query}
        onChange={(value) => {
          onQueryChange(value);
        }}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        leftIcon={<AtSign aria-hidden="true" />}
        rightIcon={
          selected ? (
            <span
              aria-hidden="true"
              className="font-mono text-xs font-semibold text-primary"
            >
              {initials(selected.displayName)}
            </span>
          ) : (
            <Search aria-hidden="true" />
          )
        }
        disabled={disabled}
        error={error}
        reserveErrorLine
      />

      {selected ? (
        <div className="flex items-center justify-between rounded-2xl border border-primary/25 bg-primary/5 px-3 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-primary font-mono text-xs font-semibold text-primary-foreground">
              {initials(selected.displayName)}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-foreground">
                {selected.displayName}
              </span>
              <span className="block truncate font-mono text-xs text-muted-foreground">
                @{selected.handle}
              </span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => onQueryChange("")}
            disabled={disabled}
            className="min-h-11 rounded-xl px-3 text-xs font-medium text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
          >
            Change
          </button>
        </div>
      ) : null}

      {showResults ? (
        <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10">
          {results === undefined ? (
            <output className="block px-4 py-4 text-sm text-muted-foreground">
              Searching…
            </output>
          ) : results.length > 0 ? (
            <ul
              aria-label="People matching this handle"
              className="divide-y divide-border"
            >
              {results.map((person) => (
                <li key={person.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(person)}
                    className={cn(
                      "flex min-h-14 w-full items-center gap-3 px-3 py-2 text-left outline-none transition-colors",
                      "hover:bg-muted/65 focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                    )}
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-muted font-mono text-xs font-semibold text-foreground">
                      {initials(person.displayName)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {person.displayName}
                      </span>
                      <span className="block truncate font-mono text-xs text-muted-foreground">
                        @{person.handle}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex items-start gap-3 px-4 py-4 text-sm text-muted-foreground">
              <UserRound
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0"
              />
              <p>No wallet starts with @{normalized}.</p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
