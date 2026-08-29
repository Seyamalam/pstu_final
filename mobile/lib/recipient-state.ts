export type RecipientLike = { id: string; handle: string; displayName: string };

export function uniqueRecentRecipients(
  recipients: readonly RecipientLike[],
  currentHandle?: string,
  limit = 6,
): RecipientLike[] {
  const seen = new Set<string>();
  const result: RecipientLike[] = [];
  for (const recipient of recipients) {
    if (recipient.handle === currentHandle || seen.has(recipient.handle)) continue;
    seen.add(recipient.handle);
    result.push(recipient);
    if (result.length === limit) break;
  }
  return result;
}

export function isFavoriteHandle(
  favorites: readonly { recipient: RecipientLike }[],
  handle: string,
): boolean {
  return favorites.some((favorite) => favorite.recipient.handle === handle);
}
