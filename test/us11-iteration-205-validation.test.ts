/**
 * US-11 — the capacity engine must reproduce the Balancer *Iteration Planning Sheet*.
 *
 * Fixture: Iteration 205 (17 Aug 2026 -> 4 Sep 2026, 15 weekday dates). Each row's
 * NET working days is taken from the sheet; here it is produced via `personalLeaveDays`
 * against a holiday-free window so the arithmetic is identical to the sheet's
 * `(workingDays - leave) * 7`.
 *
 * Sheet targets (from the supplied workbook):
 *   Dev pool  (AC13) = 401.68925
 *   QA pool   (AC15) = 160.97400
 *
 * KNOWN ACCEPTED VARIANCE (see business-logic-model.md §9.4):
 *   Sheet row 23 has the 5h of meeting ceremonies (Planning/Grooming/Retro/Demo) set to 0
 *   for a person working full days. The engine (BR-CE1) always applies ceremonies unless
 *   leave covers the whole sprint, so that person is 5h * 90% = 4.5h lower, making the
 *   engine's Dev pool ~4.5h below the sheet. The test allows for this.
 */
import { describe, it, expect } from 'vitest';
import { personBreakdown, pools } from '../server/calc/capacityEngine.js';
import type { CapacityInput } from '../server/calc/capacityEngine.js';
import { DEFAULT_SETTINGS } from '../shared/constants.js';

const WINDOW = { startDate: '2026-08-17', endDate: '2026-09-04' }; // 15 weekdays
const CAL_WD = 15;

interface Row {
  name: string;
  role: 'Dev' | 'QA';
  netWorkingDays: number;
  capacityPercent: number;
  additionalDevBuffer?: boolean;
  extraAssignmentHours?: number; // SM Activity
}

// Iteration 205, per the sheet
const ROWS: Row[] = [
  { name: 'Arshad', role: 'Dev', netWorkingDays: 13, capacityPercent: 70, additionalDevBuffer: true },
  { name: 'Prasanna', role: 'Dev', netWorkingDays: 12, capacityPercent: 90 },
  { name: 'Meng', role: 'Dev', netWorkingDays: 12, capacityPercent: 90 },
  { name: 'SM', role: 'Dev', netWorkingDays: 12, capacityPercent: 90, extraAssignmentHours: 20 },
  { name: 'Ameerah', role: 'Dev', netWorkingDays: 10, capacityPercent: 90 },
  { name: 'RowTwentyThree', role: 'Dev', netWorkingDays: 13, capacityPercent: 90 }, // the variance row
  { name: 'Thilina', role: 'Dev', netWorkingDays: 12, capacityPercent: 90 },
  { name: 'Chamath', role: 'Dev', netWorkingDays: 13, capacityPercent: 90 },
  { name: 'Ishara', role: 'QA', netWorkingDays: 10, capacityPercent: 90 },
  { name: 'Sandun', role: 'QA', netWorkingDays: 13, capacityPercent: 90 },
  { name: 'Charitha', role: 'QA', netWorkingDays: 13, capacityPercent: 90 },
];

function toInput(r: Row): CapacityInput {
  return {
    participantId: r.name,
    name: r.name,
    role: r.role,
    locationGroup: 'SL',
    startDate: WINDOW.startDate,
    endDate: WINDOW.endDate,
    holidayDates: [],
    personalLeaveDays: CAL_WD - r.netWorkingDays,
    capacityPercent: r.capacityPercent,
    additionalDevBuffer: r.additionalDevBuffer ?? false,
    extraAssignmentHours: r.extraAssignmentHours ?? 0,
  };
}

describe('US-11: Iteration 205 pool validation', () => {
  const breakdowns = ROWS.map((r) => personBreakdown(toInput(r), DEFAULT_SETTINGS));
  const { devPoolAvailable, qaPoolAvailable } = pools(breakdowns);

  it('QA pool matches the sheet within +/- 0.5h', () => {
    expect(qaPoolAvailable).toBeCloseTo(160.974, 1);
  });

  it('Dev pool matches the sheet within the documented variance (<= 5h low)', () => {
    // sheet = 401.68925; engine is lower only by the row-23 ceremony variance
    expect(devPoolAvailable).toBeLessThanOrEqual(401.68925 + 0.5);
    expect(devPoolAvailable).toBeGreaterThanOrEqual(401.68925 - 5);
  });

  it('Dev pool matches the sheet exactly once the row-23 ceremony variance is added back', () => {
    // sheet row 23: the 5h of meeting ceremonies were zeroed for a full-time worker.
    // Add them back at that row's 90% capacity to recover the sheet's Dev pool.
    const adjusted = devPoolAvailable + 5 * 0.9;
    expect(adjusted).toBeCloseTo(401.68925, 2);
  });

  it('per-row figures match the sheet (spot checks)', () => {
    const byName = new Map(breakdowns.map((b) => [b.name, b]));
    expect(byName.get('Arshad')!.finalAvailable).toBeCloseTo(23.70725, 4); // 13wd
    expect(byName.get('Chamath')!.finalAvailable).toBeCloseTo(60.9615, 4); // 13wd, 90%
    expect(byName.get('SM')!.capacityAdjusted).toBeCloseTo(37.926, 3); // 12wd + 20h SM
  });
});
