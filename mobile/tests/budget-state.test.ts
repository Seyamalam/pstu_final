import { describe, expect, it } from 'vitest';

import {
  budgetPercent,
  budgetTone,
  monthPeriod,
  periodForBudgetUpsert,
} from '../lib/budget-state';

describe('budget state', () => {
  it('uses exact local calendar month boundaries', () => {
    const period = monthPeriod(new Date(2028, 1, 20, 12).getTime());
    expect(new Date(period.periodStart).getDate()).toBe(1);
    expect(new Date(period.periodStart).getMonth()).toBe(1);
    expect(new Date(period.periodEnd).getMonth()).toBe(2);
  });

  it('keeps bigint progress precise and visually bounded', () => {
    expect(budgetPercent(7500n, 10_000n)).toBe(75);
    expect(budgetPercent(15_000n, 10_000n)).toBe(100);
    expect(budgetPercent(100n, 0n)).toBe(0);
    expect(budgetTone(74.99)).toBe('primary');
    expect(budgetTone(75)).toBe('warning');
    expect(budgetTone(100)).toBe('destructive');
  });

  it('preserves an active period and rolls an expired one forward', () => {
    const current = { periodStart: 100, periodEnd: 200 };
    const active = { periodStart: 50, periodEnd: 150 };
    expect(periodForBudgetUpsert(active, current, 149)).toBe(active);
    expect(periodForBudgetUpsert(active, current, 150)).toBe(current);
    expect(periodForBudgetUpsert(undefined, current, 120)).toBe(current);
  });
});
