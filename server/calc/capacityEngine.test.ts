import { describe, it, expect } from 'vitest';
import { personBreakdown, pools, totalBufferPercent, bufferSplitPercent } from './capacityEngine.js';
import type { CapacityInput } from './capacityEngine.js';
import { DEFAULT_SETTINGS } from '../../shared/constants.js';

const S = DEFAULT_SETTINGS;

// A window with 13 net working days: 2026-08-17..2026-09-04 is 15 weekdays,
// minus two holiday weekdays -> 13.
const HOLIDAYS = ['2026-08-19', '2026-08-20'];
const base: CapacityInput = {
  participantId: 'p1',
  name: 'Test',
  role: 'Dev',
  locationGroup: 'SL',
  startDate: '2026-08-17',
  endDate: '2026-09-04',
  holidayDates: HOLIDAYS,
  personalLeaveDays: 0,
  capacityPercent: 90,
  additionalDevBuffer: false,
  extraAssignmentHours: 0,
};

describe('buffer percentages', () => {
  it('Dev buffer = 16.5%, QA buffer = 19.5%', () => {
    expect(totalBufferPercent('Dev', S.bufferConfig)).toBeCloseTo(16.5, 10);
    expect(totalBufferPercent('QA', S.bufferConfig)).toBeCloseTo(19.5, 10);
  });
  it('capex/opex split', () => {
    expect(bufferSplitPercent('Dev', S.bufferConfig)).toEqual({ capexPct: 11, opexPct: 5.5 });
    expect(bufferSplitPercent('QA', S.bufferConfig)).toEqual({ capexPct: 13, opexPct: 6.5 });
  });
});

describe('personBreakdown — reproduces Iteration Planning Sheet (Iteration 205)', () => {
  it('standard 90% Dev, no leave (sheet row 25)', () => {
    const b = personBreakdown(base, S);
    expect(b.grossHours).toBe(91);
    expect(b.ceremonyDeduction).toBeCloseTo(8.25, 10); // 13*0.25 + 5
    expect(b.bufferDeduction).toBeCloseTo(15.015, 10); // 91 * 16.5%
    expect(b.remaining).toBeCloseTo(67.735, 10);
    expect(b.capacityAdjusted).toBeCloseTo(60.9615, 10);
    expect(b.finalAvailable).toBeCloseTo(60.9615, 10);
  });

  it('Arshad: 70% + Additional Dev Buffer (sheet row 18)', () => {
    const b = personBreakdown(
      { ...base, capacityPercent: 70, additionalDevBuffer: true, locationGroup: 'MY' },
      S,
    );
    expect(b.remaining).toBeCloseTo(67.735, 10);
    expect(b.capacityAdjusted).toBeCloseTo(47.4145, 10);
    expect(b.finalAvailable).toBeCloseTo(23.70725, 10);
  });

  it('Scrum Master: SM Activity as 20h extra assignment (sheet row 21 shape)', () => {
    // sheet row 21: 12 working days -> gross 84
    const b = personBreakdown(
      {
        ...base,
        holidayDates: ['2026-08-19', '2026-08-20', '2026-08-21'], // 15 - 3 = 12
        extraAssignmentHours: 20,
      },
      S,
    );
    expect(b.grossHours).toBe(84);
    expect(b.ceremonyDeduction).toBeCloseTo(8, 10); // 12*0.25 + 5
    expect(b.bufferDeduction).toBeCloseTo(13.86, 10); // 84 * 16.5%
    expect(b.remaining).toBeCloseTo(42.14, 10);
    expect(b.capacityAdjusted).toBeCloseTo(37.926, 10);
  });
});

describe('personBreakdown — ceremony auto-exclusion (BR-CE2)', () => {
  it('leave covering the whole sprint zeroes ceremonies', () => {
    const b = personBreakdown({ ...base, personalLeaveDays: 13 }, S);
    expect(b.netWorkingDays).toBe(13);
    expect(b.personWorkingDays).toBe(0);
    expect(b.grossHours).toBe(0);
    expect(b.ceremonyExcluded).toBe(true);
    expect(b.ceremonyDeduction).toBe(0);
    expect(b.finalAvailable).toBe(0);
  });

  it('partial leave keeps proportional daily scrum', () => {
    const b = personBreakdown({ ...base, personalLeaveDays: 3 }, S);
    expect(b.personWorkingDays).toBe(10);
    expect(b.grossHours).toBe(70);
    expect(b.ceremonyDeduction).toBeCloseTo(10 * 0.25 + 5, 10);
  });
});

describe('pools', () => {
  it('sums finalAvailable by role', () => {
    const dev = personBreakdown(base, S);
    const qa = personBreakdown({ ...base, role: 'QA', participantId: 'p2' }, S);
    const p = pools([dev, qa]);
    expect(p.devPoolAvailable).toBeCloseTo(dev.finalAvailable, 10);
    expect(p.qaPoolAvailable).toBeCloseTo(qa.finalAvailable, 10);
  });
});
