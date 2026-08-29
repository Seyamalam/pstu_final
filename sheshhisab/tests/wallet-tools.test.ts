import { describe, expect, it } from "vitest";

import {
  budgetProgress,
  formatDateLocal,
  formatDateTimeLocal,
  parseBudgetPeriod,
  parseScheduleDateTime,
  remainingSplitShare,
  uniqueParticipantHandles,
} from "../src/lib/wallet-tools";

describe("wallet tool helpers", () => {
  it("round trips a local schedule time and enforces its window", () => {
    const now = new Date(2026, 7, 29, 12, 0).getTime();
    const valid = new Date(2026, 7, 29, 12, 2).getTime();

    expect(parseScheduleDateTime(formatDateTimeLocal(valid), now)).toBe(valid);
    expect(parseScheduleDateTime("2026-08-29T12:00", now)).toBeNull();
    expect(parseScheduleDateTime("2026-02-30T12:00", now)).toBeNull();
  });

  it("uses an exclusive day boundary for budget periods", () => {
    const period = parseBudgetPeriod("2026-08-01", "2026-08-31");
    expect(period).not.toBeNull();
    expect(formatDateLocal(period?.periodStart ?? 0)).toBe("2026-08-01");
    expect(formatDateLocal((period?.periodEnd ?? 0) - 1)).toBe("2026-08-31");
    expect(parseBudgetPeriod("2026-08-31", "2026-08-01")).toBeNull();
  });

  it("keeps budget progress and split balances exact", () => {
    expect(budgetProgress(2_500n, 10_000n)).toEqual({
      remainingPoisha: 7_500n,
      percent: 25,
    });
    expect(budgetProgress(12_000n, 10_000n)).toEqual({
      remainingPoisha: 0n,
      percent: 100,
    });
    expect(remainingSplitShare(10_000n, 4_001n)).toBe(5_999n);
  });

  it("detects duplicate participants case-insensitively", () => {
    expect(uniqueParticipantHandles(["alice", "bob"])).toBe(true);
    expect(uniqueParticipantHandles(["Alice", " alice "])).toBe(false);
  });
});
