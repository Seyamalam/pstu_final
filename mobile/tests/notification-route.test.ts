import { describe, expect, it } from 'vitest';

import { notificationRoute } from '../lib/notification-route';

describe('notificationRoute', () => {
  it('opens a valid receipt', () => {
    expect(notificationRoute({ kind: 'transfer', receiptId: 'receipt_1234' })).toBe(
      '/receipt/receipt_1234',
    );
  });

  it('rejects route injection through receipt data', () => {
    expect(notificationRoute({ receiptId: '../settings?admin=1' })).toBe('/(tabs)/home');
  });

  it('routes known activity without accepting arbitrary paths', () => {
    expect(notificationRoute({ kind: 'rail_transfer', route: 'https://example.com' })).toBe(
      '/(tabs)/activity',
    );
    expect(notificationRoute({ route: '/settings' })).toBe('/(tabs)/home');
  });
});
