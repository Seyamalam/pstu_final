export type RailIntent = {
  fingerprint: string;
  idempotencyKey: string;
};

export function railIntentFingerprint(input: {
  accountId: string;
  direction: "cash_in" | "cash_out";
  provider: string;
  amountPoisha: bigint;
  reference: string;
}): string {
  return [
    input.accountId,
    input.direction,
    input.provider,
    input.amountPoisha.toString(),
    input.reference.trim(),
  ].join("\0");
}

export function railIntent(
  previous: RailIntent | null,
  fingerprint: string,
  createKey: () => string,
): RailIntent {
  return previous?.fingerprint === fingerprint
    ? previous
    : { fingerprint, idempotencyKey: createKey() };
}
