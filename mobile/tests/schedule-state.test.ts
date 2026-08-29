import { describe, expect, it } from 'vitest';

import { scheduleFingerprint, scheduleIntent, scheduleTime } from '../lib/schedule-state';

describe('scheduled transfer state', () => {
  it('creates deterministic future presets', () => {
    const now = new Date('2026-08-29T10:00:00Z').getTime();
    expect(scheduleTime(now, 'one_hour')).toBe(now + 3_600_000);
    expect(scheduleTime(now, 'next_week') - scheduleTime(now, 'tomorrow')).toBe(6 * 86_400_000);
  });

  it('rotates its key when any financial field changes', () => {
    const fingerprint = scheduleFingerprint({
      accountId: 'account',
      recipientHandle: 'alice',
      amountPoisha: 1000n,
      note: '',
      category: '',
      executeAt: 123,
    });
    const first = scheduleIntent(null, fingerprint, () => 'first');
    expect(scheduleIntent(first, fingerprint, () => 'second').idempotencyKey).toBe('first');
    expect(scheduleIntent(first, `${fingerprint}x`, () => 'second').idempotencyKey).toBe('second');
  });
});
