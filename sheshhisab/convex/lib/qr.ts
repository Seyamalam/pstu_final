import { fail } from "./errors";
import { normalizeHandle } from "./money";

const PAYEE_QR_PREFIX = "sheshhisab://pay/v1/";
const PAYEE_QR_PATTERN = /^sheshhisab:\/\/pay\/v1\/([a-z0-9_]{3,24})$/;
const MAX_PAYEE_QR_LENGTH = PAYEE_QR_PREFIX.length + 24;

export function createPayeeQrPayload(handle: string): string {
  return `${PAYEE_QR_PREFIX}${normalizeHandle(handle)}`;
}

export function parsePayeeQrPayload(payload: string): string {
  if (payload.length > MAX_PAYEE_QR_LENGTH) {
    throwInvalidQr();
  }
  const match = PAYEE_QR_PATTERN.exec(payload);
  if (!match) {
    throwInvalidQr();
  }
  return match[1];
}

function throwInvalidQr(): never {
  fail("INVALID_PAYEE_QR", "This payment code is invalid.");
}
