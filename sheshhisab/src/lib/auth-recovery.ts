export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeRecoveryEmail(value: string): string | null {
  const email = value.trim().toLowerCase();
  return EMAIL_PATTERN.test(email) ? email : null;
}

export function validateNewPassword(password: string, confirmation: string) {
  if (password.length < 8) return "Use at least 8 characters.";
  if (password.length > 128) return "Use 128 characters or fewer.";
  if (password !== confirmation) return "Passwords do not match.";
  return null;
}

export function validResetToken(value: string | undefined): value is string {
  return Boolean(value && value.length >= 16 && value.length <= 4096);
}
