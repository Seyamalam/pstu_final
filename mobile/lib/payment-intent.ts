export type PaymentIntent = {
  fingerprint: string;
  idempotencyKey: string;
};

export function paymentFingerprint(input: {
  recipientHandle: string;
  amountPoisha: bigint;
  note: string;
}) {
  return `${input.recipientHandle}\u0000${input.amountPoisha}\u0000${input.note}`;
}

export function paymentIntent(
  current: PaymentIntent | null,
  fingerprint: string,
  createKey: () => string,
): PaymentIntent {
  return current?.fingerprint === fingerprint
    ? current
    : { fingerprint, idempotencyKey: createKey() };
}
