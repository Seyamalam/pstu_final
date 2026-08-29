import { describe, expect, it } from 'vitest';

import { requestActions, requestIntent } from '../lib/request-state';

describe('request lifecycle state', () => {
  it('only exposes actions allowed by role and status', () => {
    expect(requestActions({ status: 'pending', isPayer: true, isRequester: false, hasReceipt: false }))
      .toEqual(['accept', 'decline']);
    expect(requestActions({ status: 'pending', isPayer: false, isRequester: true, hasReceipt: false }))
      .toEqual(['cancel']);
    expect(requestActions({ status: 'paid', isPayer: true, isRequester: false, hasReceipt: true }))
      .toEqual(['receipt']);
    expect(requestActions({ status: 'declined', isPayer: true, isRequester: false, hasReceipt: false }))
      .toEqual(['none']);
  });

  it('reuses an accept key only for the same request', () => {
    const first = requestIntent(null, 'request-a', () => 'first');
    expect(requestIntent(first, 'request-a', () => 'second').idempotencyKey).toBe('first');
    expect(requestIntent(first, 'request-b', () => 'second').idempotencyKey).toBe('second');
  });
});
