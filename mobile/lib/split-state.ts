import { parseTakaToPoisha } from './format';

const MAX_SPLIT_TOTAL_POISHA = 10_000_000_000n;

export type SplitParticipantInput = {
  handle: string;
  amount: string;
};

export type SplitParticipant = {
  handle: string;
  sharePoisha: bigint;
};

export type SplitIntent = {
  fingerprint: string;
  idempotencyKey: string;
};

export function parseSplitParticipants(
  rows: readonly SplitParticipantInput[],
): { ok: true; participants: SplitParticipant[]; totalPoisha: bigint } | {
  ok: false;
  message: string;
} {
  if (rows.length < 1 || rows.length > 20) {
    return { ok: false, message: 'Choose 1 to 20 people.' };
  }
  const seen = new Set<string>();
  const participants: SplitParticipant[] = [];
  for (const row of rows) {
    const handle = row.handle.trim().replace(/^@/, '').toLowerCase();
    if (!/^[a-z0-9_]{3,24}$/.test(handle)) {
      return { ok: false, message: 'Enter a valid handle for each person.' };
    }
    if (seen.has(handle)) {
      return { ok: false, message: 'Each person can appear once.' };
    }
    const sharePoisha = parseTakaToPoisha(row.amount);
    if (!sharePoisha) {
      return { ok: false, message: 'Enter a valid share for each person.' };
    }
    seen.add(handle);
    participants.push({ handle, sharePoisha });
  }
  const totalPoisha = participants.reduce(
    (sum, participant) => sum + participant.sharePoisha,
    0n,
  );
  if (totalPoisha > MAX_SPLIT_TOTAL_POISHA) {
    return { ok: false, message: 'Split total is above the transfer limit.' };
  }
  return {
    ok: true,
    participants,
    totalPoisha,
  };
}

export function splitCreateFingerprint(input: {
  receivingAccountId: string;
  title: string;
  participants: readonly SplitParticipant[];
}): string {
  const participants = [...input.participants]
    .sort((left, right) => left.handle.localeCompare(right.handle))
    .map((participant) => `${participant.handle}:${participant.sharePoisha}`)
    .join('|');
  return [input.receivingAccountId, input.title.trim(), participants].join('\u0000');
}

export function contributionFingerprint(billId: string, amountPoisha: bigint): string {
  return `split\u0000${billId}\u0000${amountPoisha}`;
}

export function splitIntent(
  current: SplitIntent | null,
  fingerprint: string,
  createKey: () => string,
): SplitIntent {
  return current?.fingerprint === fingerprint
    ? current
    : { fingerprint, idempotencyKey: createKey() };
}

export function remainingShare(sharePoisha: bigint, contributedPoisha: bigint): bigint {
  return sharePoisha > contributedPoisha ? sharePoisha - contributedPoisha : 0n;
}

export function validContribution(amountPoisha: bigint | null, remainingPoisha: bigint): boolean {
  return amountPoisha !== null && amountPoisha > 0n && amountPoisha <= remainingPoisha;
}
