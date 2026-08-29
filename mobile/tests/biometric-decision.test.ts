import { describe, expect, it } from 'vitest';

import { decideBiometricGate } from '../lib/biometric-decision';

describe('decideBiometricGate', () => {
  it('skips when the preference is off', () => {
    expect(decideBiometricGate({ enabled: false, hasHardware: false, isEnrolled: false })).toBe('skip');
  });

  it('fails closed when an enabled gate is unavailable', () => {
    expect(decideBiometricGate({ enabled: true, hasHardware: true, isEnrolled: false })).toBe('unavailable');
  });

  it('authenticates only when hardware and enrollment are ready', () => {
    expect(decideBiometricGate({ enabled: true, hasHardware: true, isEnrolled: true })).toBe('authenticate');
  });
});

