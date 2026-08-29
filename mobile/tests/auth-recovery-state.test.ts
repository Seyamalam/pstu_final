import { describe, expect, it } from 'vitest';

import {
  PASSWORD_RESET_SENT_COPY,
  cameraRecoveryAction,
  isOffline,
  normalizeRecoveryEmail,
  shouldOfferEmailVerification,
} from '../lib/auth-recovery-state';

describe('auth recovery state', () => {
  it('normalizes valid email without exposing account state', () => {
    expect(normalizeRecoveryEmail('  Person@Example.COM ')).toBe('person@example.com');
    expect(PASSWORD_RESET_SENT_COPY).toBe('If the account exists, check your email.');
  });

  it('rejects malformed recovery addresses', () => {
    expect(normalizeRecoveryEmail('person@example')).toBeNull();
    expect(normalizeRecoveryEmail('person @example.com')).toBeNull();
  });

  it('only offers verification for an unverified session with email', () => {
    expect(shouldOfferEmailVerification({ email: 'person@example.com', emailVerified: false })).toBe(true);
    expect(shouldOfferEmailVerification({ email: 'person@example.com', emailVerified: true })).toBe(false);
    expect(shouldOfferEmailVerification({ emailVerified: false })).toBe(false);
    expect(shouldOfferEmailVerification(null)).toBe(false);
  });

  it('treats explicit connection failures as offline', () => {
    expect(isOffline({ isConnected: false })).toBe(true);
    expect(isOffline({ isConnected: true, isInternetReachable: false })).toBe(true);
    expect(isOffline({})).toBe(false);
  });

  it('routes camera recovery to the available action', () => {
    expect(cameraRecoveryAction()).toBe('checking');
    expect(cameraRecoveryAction({ granted: true, canAskAgain: true })).toBe('ready');
    expect(cameraRecoveryAction({ granted: false, canAskAgain: true })).toBe('request');
    expect(cameraRecoveryAction({ granted: false, canAskAgain: false })).toBe('settings');
  });
});
