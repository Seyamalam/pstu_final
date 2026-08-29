import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

import { decideBiometricGate } from '@/lib/biometric-decision';

const BIOMETRIC_PAYMENT_KEY = 'payment_biometrics_v1';

export async function getBiometricPaymentsEnabled() {
  return (await SecureStore.getItemAsync(BIOMETRIC_PAYMENT_KEY)) === 'enabled';
}

export async function setBiometricPaymentsEnabled(enabled: boolean) {
  if (enabled) {
    await SecureStore.setItemAsync(BIOMETRIC_PAYMENT_KEY, 'enabled', {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  } else {
    await SecureStore.deleteItemAsync(BIOMETRIC_PAYMENT_KEY);
  }
}

export async function confirmPayment(): Promise<{
  ok: boolean;
  reason?: 'unavailable' | 'cancelled';
}> {
  const enabled = await getBiometricPaymentsEnabled();
  const [hasHardware, isEnrolled] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
  ]);
  const decision = decideBiometricGate({ enabled, hasHardware, isEnrolled });
  if (decision === 'skip') return { ok: true };
  if (decision === 'unavailable') return { ok: false, reason: 'unavailable' };

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Confirm payment',
    cancelLabel: 'Cancel',
    fallbackLabel: 'Use device passcode',
    disableDeviceFallback: false,
    biometricsSecurityLevel: 'strong',
  });
  return result.success ? { ok: true } : { ok: false, reason: 'cancelled' };
}
