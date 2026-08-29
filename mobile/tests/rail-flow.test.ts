import { describe, expect, it } from 'vitest';

import {
  normalizeRailReference,
  providerById,
  railFingerprint,
  railIntent,
  railRoute,
} from '../lib/rail-flow';

describe('rail provider input', () => {
  it('only resolves an allowlisted provider', () => {
    expect(providerById('bkash')?.name).toBe('bKash');
    expect(providerById('made_up')).toBeNull();
  });

  it('normalizes Bangladesh MFS numbers', () => {
    const provider = providerById('nagad')!;
    expect(normalizeRailReference(provider, '01712 345-678')).toEqual({
      normalized: '+8801712345678',
      masked: '+88017••••678',
    });
    expect(normalizeRailReference(provider, '01112345678')).toBeNull();
  });

  it('accepts only the last four digits for cards', () => {
    const provider = providerById('visa')!;
    expect(normalizeRailReference(provider, '4242')).toEqual({
      normalized: '4242',
      masked: '•••• 4242',
    });
    expect(normalizeRailReference(provider, '4242424242424242')).toBeNull();
  });
});

describe('rail intent', () => {
  it('reuses the key only for the same cash movement', () => {
    const fingerprint = railFingerprint({
      accountId: 'account-1',
      direction: 'cash_out',
      providerId: 'bkash',
      amountPoisha: 5000n,
      reference: '+8801712345678',
    });
    const first = railIntent(null, fingerprint, () => 'first');
    expect(railIntent(first, fingerprint, () => 'second').idempotencyKey).toBe('first');
    expect(railIntent(first, `${fingerprint}x`, () => 'second').idempotencyKey).toBe('second');
  });

  it('maps each direction to its screen', () => {
    expect(railRoute('cash_in')).toBe('/add-money');
    expect(railRoute('cash_out')).toBe('/withdraw');
  });
});
