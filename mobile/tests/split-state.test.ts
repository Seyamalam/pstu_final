import { describe, expect, it } from 'vitest';

import {
  contributionFingerprint,
  parseSplitParticipants,
  remainingShare,
  splitCreateFingerprint,
  splitIntent,
  validContribution,
} from '../lib/split-state';

describe('split bill state', () => {
  it('parses shares exactly in poisha', () => {
    expect(parseSplitParticipants([
      { handle: '@alice', amount: '10.05' },
      { handle: 'bob', amount: '20' },
    ])).toEqual({
      ok: true,
      participants: [
        { handle: 'alice', sharePoisha: 1005n },
        { handle: 'bob', sharePoisha: 2000n },
      ],
      totalPoisha: 3005n,
    });
  });

  it('rejects duplicate people and invalid shares', () => {
    expect(parseSplitParticipants([
      { handle: 'alice', amount: '10' },
      { handle: '@alice', amount: '20' },
    ])).toEqual({ ok: false, message: 'Each person can appear once.' });
    expect(parseSplitParticipants([{ handle: 'alice', amount: '0' }])).toEqual({
      ok: false,
      message: 'Enter a valid share for each person.',
    });
  });

  it('enforces the participant count boundary', () => {
    expect(parseSplitParticipants([])).toEqual({
      ok: false,
      message: 'Choose 1 to 20 people.',
    });
    const tooMany = Array.from({ length: 21 }, (_, index) => ({
      handle: `person_${index}`,
      amount: '1',
    }));
    expect(parseSplitParticipants(tooMany)).toEqual({
      ok: false,
      message: 'Choose 1 to 20 people.',
    });
  });

  it('rejects a combined total above the backend transfer limit', () => {
    expect(parseSplitParticipants([
      { handle: 'alice', amount: '60000000' },
      { handle: 'bob', amount: '60000000' },
    ])).toEqual({
      ok: false,
      message: 'Split total is above the transfer limit.',
    });
  });

  it('makes creation keys independent of participant row order', () => {
    const first = splitCreateFingerprint({
      receivingAccountId: 'account',
      title: 'Dinner',
      participants: [
        { handle: 'bob', sharePoisha: 2000n },
        { handle: 'alice', sharePoisha: 1000n },
      ],
    });
    const reordered = splitCreateFingerprint({
      receivingAccountId: 'account',
      title: 'Dinner',
      participants: [
        { handle: 'alice', sharePoisha: 1000n },
        { handle: 'bob', sharePoisha: 2000n },
      ],
    });
    expect(first).toBe(reordered);
    const intent = splitIntent(null, first, () => 'first');
    expect(splitIntent(intent, reordered, () => 'second').idempotencyKey).toBe('first');
  });

  it('bounds partial contributions by the exact remaining share', () => {
    expect(remainingShare(5000n, 1250n)).toBe(3750n);
    expect(remainingShare(5000n, 6000n)).toBe(0n);
    expect(validContribution(3750n, 3750n)).toBe(true);
    expect(validContribution(3751n, 3750n)).toBe(false);
    expect(contributionFingerprint('bill', 3750n)).toBe('split\u0000bill\u00003750');
  });
});
