export const PASSWORD_RESET_SENT_COPY = 'If the account exists, check your email.';

export function normalizeRecoveryEmail(value: string): string | null {
  const email = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

export function shouldOfferEmailVerification(user?: {
  email?: string | null;
  emailVerified?: boolean | null;
} | null): boolean {
  return Boolean(user?.email && user.emailVerified === false);
}

export function isOffline(state: {
  isConnected?: boolean;
  isInternetReachable?: boolean;
}): boolean {
  return state.isConnected === false || state.isInternetReachable === false;
}

export function cameraRecoveryAction(permission?: {
  granted: boolean;
  canAskAgain: boolean;
} | null): 'checking' | 'ready' | 'request' | 'settings' {
  if (!permission) return 'checking';
  if (permission.granted) return 'ready';
  return permission.canAskAgain ? 'request' : 'settings';
}
