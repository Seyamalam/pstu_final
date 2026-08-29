const MIN_SCHEDULE_DELAY_MS = 60_000;
const MAX_SCHEDULE_AHEAD_MS = 366 * 24 * 60 * 60 * 1_000;
const MAX_BUDGET_PERIOD_MS = 366 * 24 * 60 * 60 * 1_000;

function localDateParts(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return { year, month, day, timestamp: date.getTime() };
}

export function parseScheduleDateTime(
  value: string,
  now = Date.now(),
): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const [year, month, day, hour, minute] = match
    .slice(1)
    .map((part) => Number(part));
  const date = new Date(year, month - 1, day, hour, minute);
  const timestamp = date.getTime();
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute ||
    timestamp < now + MIN_SCHEDULE_DELAY_MS ||
    timestamp > now + MAX_SCHEDULE_AHEAD_MS
  ) {
    return null;
  }
  return timestamp;
}

export function formatDateTimeLocal(timestamp: number): string {
  const date = new Date(timestamp);
  const pad = (value: number) => value.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function parseBudgetPeriod(
  startValue: string,
  endValue: string,
): { periodStart: number; periodEnd: number } | null {
  const start = localDateParts(startValue);
  const end = localDateParts(endValue);
  if (!start || !end) return null;
  const periodEnd = new Date(end.year, end.month - 1, end.day + 1).getTime();
  if (
    periodEnd <= start.timestamp ||
    periodEnd - start.timestamp > MAX_BUDGET_PERIOD_MS
  ) {
    return null;
  }
  return { periodStart: start.timestamp, periodEnd };
}

export function formatDateLocal(timestamp: number): string {
  const date = new Date(timestamp);
  const pad = (value: number) => value.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function budgetProgress(spentPoisha: bigint, limitPoisha: bigint) {
  const remainingPoisha =
    limitPoisha > spentPoisha ? limitPoisha - spentPoisha : 0n;
  const percent =
    limitPoisha > 0n
      ? Math.min(100, Number((spentPoisha * 10_000n) / limitPoisha) / 100)
      : 0;
  return { remainingPoisha, percent };
}

export function remainingSplitShare(
  sharePoisha: bigint,
  contributedPoisha: bigint,
): bigint {
  return sharePoisha > contributedPoisha ? sharePoisha - contributedPoisha : 0n;
}

export function uniqueParticipantHandles(handles: string[]): boolean {
  const normalized = handles.map((handle) => handle.trim().toLowerCase());
  return new Set(normalized).size === normalized.length;
}
