export type RecipientShortcut = {
  id: string;
  handle: string;
  displayName: string;
  avatarSeed: string;
};

export function recipientShortcutGroups<T extends RecipientShortcut>({
  favorites,
  recent,
  limit = 6,
}: {
  favorites: T[];
  recent: T[];
  limit?: number;
}): { favorites: T[]; recent: T[] } {
  const favoriteHandles = new Set<string>();
  const uniqueFavorites = favorites.filter((person) => {
    if (favoriteHandles.has(person.handle)) return false;
    favoriteHandles.add(person.handle);
    return true;
  });
  const recentHandles = new Set<string>();
  const uniqueRecent = recent.filter((person) => {
    if (
      favoriteHandles.has(person.handle) ||
      recentHandles.has(person.handle)
    ) {
      return false;
    }
    recentHandles.add(person.handle);
    return true;
  });

  return {
    favorites: uniqueFavorites.slice(0, limit),
    recent: uniqueRecent.slice(0, limit),
  };
}
