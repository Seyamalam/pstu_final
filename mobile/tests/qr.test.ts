import { describe, expect, it } from 'vitest';

import { parsePayeeCode } from '../lib/qr';

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
