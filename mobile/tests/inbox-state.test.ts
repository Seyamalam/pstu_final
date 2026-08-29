import { describe, expect, it } from 'vitest';

import { inboxCopy, inboxRoute } from '../lib/inbox-state';

describe('inbox state', () => {
  it('maps known events to concise copy', () => {
    expect(inboxCopy('request.created').title).toBe('Payment request');
    expect(inboxCopy('unknown')).toEqual({ title: 'Wallet update', detail: 'Open for details.' });
  });

  it('only opens allowlisted local destinations', () => {
    expect(inboxRoute({ kind: 'request', referenceId: 'request_1234' }))
      .toBe('/request/request_1234');
    expect(inboxRoute({ kind: 'transfer', referenceId: '../settings' }))
      .toBe('/(tabs)/inbox');
  });
});
