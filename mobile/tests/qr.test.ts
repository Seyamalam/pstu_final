import { describe, expect, it } from 'vitest';

import {
  buildRequestCode,
  parsePayeeCode,
  parsePaymentCode,
  tryBuildRequestCode,
} from '../lib/qr';

const origins = ['https://sheshhisab.example'];

describe('parsePayeeCode', () => {
  it('accepts the versioned app scheme', () => {
    expect(parsePayeeCode('sheshhisab://pay/v1/alice_1', origins)).toEqual({
      version: 1,
      handle: 'alice_1',
      canonicalPayload: 'sheshhisab://pay/v1/alice_1',
    });
  });

  it('accepts an allowlisted HTTPS link and canonicalizes it', () => {
    expect(parsePayeeCode('https://sheshhisab.example/pay/bob?v=1', origins)).toEqual({
      version: 1,
      handle: 'bob',
      canonicalPayload: 'sheshhisab://pay/v1/bob',
    });
  });

  it.each([
    'http://sheshhisab.example/pay/alice?v=1',
    'https://evil.example/pay/alice?v=1',
    'https://sheshhisab.example/pay/alice?v=2',
    'https://sheshhisab.example/pay/alice?v=1&amount=100',
    'https://sheshhisab.example/pay/alice?v=1&v=1',
    'sheshhisab://pay/v1/ALICE',
    ' sheshhisab://pay/v1/alice',
    'sheshhisab://pay/v1/al',
  ])('rejects %s', (value) => {
    expect(parsePayeeCode(value, origins)).toBeNull();
  });
});

describe('request payment codes', () => {
  it('builds and parses amount and note without trusting a recipient field', () => {
    const payload = buildRequestCode({
      handle: '@alice_1',
      amountPoisha: 125050n,
      note: 'Club dues',
    });
    expect(payload).toBe('sheshhisab://request/v1/alice_1?amount=125050&note=Club+dues');
    expect(parsePaymentCode(payload, origins)).toMatchObject({
      kind: 'request',
      handle: 'alice_1',
      amountPoisha: 125050n,
      note: 'Club dues',
      payeePayload: 'sheshhisab://pay/v1/alice_1',
    });
  });

  it('accepts only allowlisted HTTPS request links', () => {
    expect(parsePaymentCode(
      'https://sheshhisab.example/request/bob?v=1&amount=5000&note=Lunch',
      origins,
    )).toMatchObject({ kind: 'request', handle: 'bob', amountPoisha: 5000n });
    expect(parsePaymentCode(
      'https://evil.example/request/bob?v=1&amount=5000',
      origins,
    )).toBeNull();
  });

  it.each([
    'sheshhisab://request/v1/alice?amount=0',
    'sheshhisab://request/v1/alice?amount=100&amount=100',
    'sheshhisab://request/v1/alice?amount=100&redirect=https://evil.example',
    'sheshhisab://request/v1/ALICE?amount=100',
  ])('rejects unsafe request payload %s', (payload) => {
    expect(parsePaymentCode(payload, origins)).toBeNull();
  });

  it('does not throw while rendering an invalid request amount', () => {
    expect(tryBuildRequestCode({ handle: 'alice', amountPoisha: 10_000_000_001n })).toBeNull();
  });
});
