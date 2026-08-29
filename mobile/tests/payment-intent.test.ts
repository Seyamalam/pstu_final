import { describe, expect, it } from 'vitest';

import { paymentFingerprint, paymentIntent } from '../lib/payment-intent';

describe('payment intent', () => {
  it('reuses the key for an unchanged retry', () => {
    const fingerprint = paymentFingerprint({
      recipientHandle: 'alice',
      amountPoisha: 5000n,
      note: 'Lunch',
    });
    const first = paymentIntent(null, fingerprint, () => 'first-key');
    const retry = paymentIntent(first, fingerprint, () => 'second-key');
    expect(retry.idempotencyKey).toBe('first-key');
  });

  it('rotates the key when the intent changes', () => {
    const first = paymentIntent(null, 'alice\u00005000\u0000Lunch', () => 'first-key');
    const changed = paymentIntent(first, 'alice\u00006000\u0000Lunch', () => 'second-key');
    expect(changed.idempotencyKey).toBe('second-key');
  });
});
