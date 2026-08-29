export type SchedulePreset = 'one_hour' | 'tomorrow' | 'next_week';

export type ScheduleIntent = {
  fingerprint: string;
  idempotencyKey: string;
};

export function scheduleTime(now: number, preset: SchedulePreset): number {
  if (!Number.isSafeInteger(now) || now < 0) throw new Error('Invalid current time.');
  if (preset === 'one_hour') return now + 60 * 60 * 1_000;
  const date = new Date(now);
  date.setHours(9, 0, 0, 0);
  date.setDate(date.getDate() + (preset === 'tomorrow' ? 1 : 7));
  return date.getTime();
}

export function scheduleFingerprint(input: {
  accountId: string;
  recipientHandle: string;
  amountPoisha: bigint;
  note: string;
  category: string;
  executeAt: number;
}): string {
  return [
    input.accountId,
    input.recipientHandle,
    input.amountPoisha.toString(),
    input.note,
    input.category,
    input.executeAt.toString(),
  ].join('\u0000');
}

export function scheduleIntent(
  current: ScheduleIntent | null,
  fingerprint: string,
  createKey: () => string,
): ScheduleIntent {
  return current?.fingerprint === fingerprint
    ? current
    : { fingerprint, idempotencyKey: createKey() };
}
