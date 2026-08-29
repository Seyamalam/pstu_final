import { fail } from "./errors";

export const OPENING_BALANCE_POISHA = BigInt(10_000_000);

const MAX_AMOUNT_POISHA = BigInt(10_000_000_000);
const MAX_INT64 = BigInt("9223372036854775807");
const HANDLE_PATTERN = /^[a-z0-9_]{3,24}$/;
const MAX_NOTE_LENGTH = 120;
const MAX_IDEMPOTENCY_KEY_LENGTH = 100;

export function assertAmount(amountPoisha: bigint): void {
  if (amountPoisha <= BigInt(0)) {
    fail("INVALID_AMOUNT", "Amount must be greater than zero.");
  }
  if (amountPoisha > MAX_AMOUNT_POISHA) {
    fail("AMOUNT_TOO_LARGE", "Amount is above the transfer limit.");
  }
}

export function calculateTransferBalances(
  senderBalancePoisha: bigint,
  recipientBalancePoisha: bigint,
  amountPoisha: bigint,
) {
  assertAmount(amountPoisha);
  if (senderBalancePoisha < amountPoisha) {
    fail("INSUFFICIENT_FUNDS", "The wallet does not have enough funds.");
  }
  if (recipientBalancePoisha > MAX_INT64 - amountPoisha) {
    fail("ACCOUNT_LIMIT", "The recipient wallet cannot hold this amount.");
  }
  return {
    senderBalanceAfterPoisha: senderBalancePoisha - amountPoisha,
    recipientBalanceAfterPoisha: recipientBalancePoisha + amountPoisha,
  };
}

export function normalizeHandle(value: string): string {
  const handle = value.trim().replace(/^@/, "").toLowerCase();
  if (!HANDLE_PATTERN.test(handle)) {
    fail(
      "INVALID_HANDLE",
      "Handle must use 3 to 24 lowercase letters, numbers, or underscores.",
    );
  }
  return handle;
}

export function normalizeHandlePrefix(value: string): string {
  const prefix = value.trim().replace(/^@/, "").toLowerCase();
  if (prefix.length < 1 || prefix.length > 24 || !/^[a-z0-9_]+$/.test(prefix)) {
    fail("INVALID_SEARCH", "Enter letters, numbers, or underscores.");
  }
  return prefix;
}

export function normalizeDisplayName(value: string): string {
  const displayName = value.trim().replace(/\s+/g, " ");
  if (displayName.length < 2 || displayName.length > 60) {
    fail("INVALID_DISPLAY_NAME", "Display name must be 2 to 60 characters.");
  }
  return displayName;
}

export function normalizeNote(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  const note = value.trim();
  if (note.length > MAX_NOTE_LENGTH) {
    fail(
      "NOTE_TOO_LONG",
      `Note must be ${MAX_NOTE_LENGTH} characters or fewer.`,
    );
  }
  return note || undefined;
}

export function normalizeIdempotencyKey(value: string): string {
  const key = value.trim();
  if (key.length < 8 || key.length > MAX_IDEMPOTENCY_KEY_LENGTH) {
    fail("INVALID_IDEMPOTENCY_KEY", "Payment key must be 8 to 100 characters.");
  }
  return key;
}
