import { describe, expect, it } from 'vitest';

import { inboxCopy, inboxRoute } from '../lib/inbox-state';

describe('inbox state', () => {
  it('maps known events to concise copy', () => {
    expect(inboxCopy('request.created').title).toBe('Payment request');
    expect(inboxCopy('split.invited').title).toBe('Split bill');
    expect(inboxCopy('unknown')).toEqual({ title: 'Wallet update', detail: 'Open for details.' });
  });

  it('only opens allowlisted local destinations', () => {
    expect(inboxRoute({ kind: 'request', referenceId: 'request_1234' }))
      .toBe('/request/request_1234');
    expect(inboxRoute({ kind: 'transfer', referenceId: '../settings' }))
      .toBe('/(tabs)/inbox');
  });

  it('routes split invitations separately from payment requests', () => {
    expect(inboxRoute({
      kind: 'request',
      eventKey: 'split.invited',
      referenceId: 'split_12345',
    })).toBe('/split/split_12345');
  });
});
