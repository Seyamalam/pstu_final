export function monthPeriod(timestamp: number): { periodStart: number; periodEnd: number } {
  if (!Number.isSafeInteger(timestamp) || timestamp < 0) {
    throw new Error('Invalid budget date.');
  }
  const date = new Date(timestamp);
  const periodStart = new Date(date.getFullYear(), date.getMonth(), 1).getTime();
  const periodEnd = new Date(date.getFullYear(), date.getMonth() + 1, 1).getTime();
  return { periodStart, periodEnd };
}

export function budgetPercent(spentPoisha: bigint, limitPoisha: bigint): number {
  if (limitPoisha <= 0n) return 0;
  const basisPoints = (spentPoisha * 10_000n) / limitPoisha;
  return Math.max(0, Math.min(100, Number(basisPoints) / 100));
}

export function budgetTone(percent: number): 'primary' | 'warning' | 'destructive' {
  if (percent >= 100) return 'destructive';
  if (percent >= 75) return 'warning';
  return 'primary';
}

export function periodForBudgetUpsert(
  existing: { periodStart: number; periodEnd: number } | undefined,
  current: { periodStart: number; periodEnd: number },
  now: number,
): { periodStart: number; periodEnd: number } {
  return existing && now < existing.periodEnd ? existing : current;
}
