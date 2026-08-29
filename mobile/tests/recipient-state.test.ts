import { describe, expect, it } from 'vitest';

import { isFavoriteHandle, uniqueRecentRecipients } from '../lib/recipient-state';

describe('recipient shortcuts', () => {
  const alice = { id: '1', handle: 'alice', displayName: 'Alice' };
  const bob = { id: '2', handle: 'bob', displayName: 'Bob' };

  it('deduplicates recent recipients and excludes the viewer', () => {
    expect(uniqueRecentRecipients([alice, alice, bob], 'bob')).toEqual([alice]);
  });

  it('matches favorites by normalized handle', () => {
    expect(isFavoriteHandle([{ recipient: alice }], 'alice')).toBe(true);
    expect(isFavoriteHandle([{ recipient: alice }], 'bob')).toBe(false);
  });
});
