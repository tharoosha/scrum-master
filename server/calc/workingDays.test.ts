import { describe, it, expect } from 'vitest';
import {
  calendarWorkingDays,
  netWorkingDays,
  personWorkingDays,
  grossHours,
  isWeekday,
  eachDate,
} from './workingDays.js';

describe('workingDays', () => {
  it('counts Mon-Fri in a 3-week window', () => {
    // 2026-08-17 (Mon) .. 2026-09-04 (Fri) = 15 weekdays
    expect(calendarWorkingDays('2026-08-17', '2026-09-04')).toBe(15);
  });

  it('isWeekday', () => {
    expect(isWeekday('2026-08-17')).toBe(true); // Mon
    expect(isWeekday('2026-08-22')).toBe(false); // Sat
    expect(isWeekday('2026-08-23')).toBe(false); // Sun
  });

  it('eachDate is inclusive', () => {
    expect(eachDate('2026-08-17', '2026-08-19')).toEqual([
      '2026-08-17',
      '2026-08-18',
      '2026-08-19',
    ]);
  });

  it('netWorkingDays subtracts only weekday holidays in window, deduped', () => {
    const holidays = ['2026-08-18', '2026-08-18', '2026-08-22' /* Sat */, '2027-01-01'];
    expect(netWorkingDays('2026-08-17', '2026-09-04', holidays)).toBe(14);
  });

  it('personWorkingDays floors at 0 and supports half days', () => {
    expect(personWorkingDays(13, 0)).toBe(13);
    expect(personWorkingDays(13, 2.5)).toBe(10.5);
    expect(personWorkingDays(3, 10)).toBe(0);
  });

  it('grossHours', () => {
    expect(grossHours(13, 7)).toBe(91);
    expect(grossHours(10.5, 7)).toBe(73.5);
  });
});
