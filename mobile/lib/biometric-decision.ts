export type BiometricDecision = 'skip' | 'authenticate' | 'unavailable';

export function decideBiometricGate(input: {
  enabled: boolean;
  hasHardware: boolean;
  isEnrolled: boolean;
}): BiometricDecision {
  if (!input.enabled) return 'skip';
  if (!input.hasHardware || !input.isEnrolled) return 'unavailable';
  return 'authenticate';
}

