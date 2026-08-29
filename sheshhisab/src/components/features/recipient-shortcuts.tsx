"use client";

import { Clock3, Star } from "lucide-react";

import { cn } from "@/lib/utils";
import { initials } from "./money";
import type { PersonSummary } from "./person-picker";

function ShortcutGroup({
  label,
  people,
  favorite,
  onSelect,
  onToggleFavorite,
  pendingHandle,
}: {
  label: string;
  people: PersonSummary[];
  favorite: boolean;
  onSelect: (person: PersonSummary) => void;
  onToggleFavorite: (person: PersonSummary) => void;
  pendingHandle: string | null;
}) {
  if (people.length === 0) return null;
  const LabelIcon = favorite ? Star : Clock3;

  return (
    <div>
      <p className="flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        <LabelIcon aria-hidden="true" className="size-3" />
        {label}
      </p>
      <div className="mt-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {people.map((person) => (
          <div
            key={person.id}
            className="flex shrink-0 items-center rounded-2xl bg-muted/65 p-1 ring-1 ring-foreground/8"
          >
            <button
              type="button"
              onClick={() => onSelect(person)}
              className="flex min-h-11 items-center gap-2 rounded-xl px-2 text-left outline-none transition-colors hover:bg-card focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="grid size-8 place-items-center rounded-xl bg-card font-mono text-[10px] font-semibold text-foreground">
                {initials(person.displayName)}
              </span>
              <span className="max-w-28">
                <span className="block truncate text-xs font-medium">
                  {person.displayName}
                </span>
                <span className="block truncate font-mono text-[10px] text-muted-foreground">
                  @{person.handle}
                </span>
              </span>
            </button>
            <button
              type="button"
              aria-label={
                favorite
                  ? `Remove ${person.displayName} from favorites`
                  : `Add ${person.displayName} to favorites`
              }
              disabled={pendingHandle === person.handle}
              onClick={() => onToggleFavorite(person)}
              className={cn(
                "grid size-9 place-items-center rounded-xl outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
                favorite
                  ? "text-[var(--chart-5)] hover:bg-card"
                  : "text-muted-foreground hover:bg-card hover:text-foreground",
              )}
            >
              <Star
                aria-hidden="true"
                className="size-3.5"
                fill={favorite ? "currentColor" : "none"}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RecipientShortcuts({
  favorites,
  recent,
  onSelect,
  onToggleFavorite,
  pendingHandle,
}: {
  favorites: PersonSummary[];
  recent: PersonSummary[];
  onSelect: (person: PersonSummary) => void;
  onToggleFavorite: (person: PersonSummary) => void;
  pendingHandle: string | null;
}) {
  if (favorites.length === 0 && recent.length === 0) return null;
  return (
    <section aria-label="Recipient shortcuts" className="flex flex-col gap-3">
      <ShortcutGroup
        label="Favorites"
        people={favorites}
        favorite
        onSelect={onSelect}
        onToggleFavorite={onToggleFavorite}
        pendingHandle={pendingHandle}
      />
      <ShortcutGroup
        label="Recent"
        people={recent}
        favorite={false}
        onSelect={onSelect}
        onToggleFavorite={onToggleFavorite}
        pendingHandle={pendingHandle}
      />
    </section>
  );
}
