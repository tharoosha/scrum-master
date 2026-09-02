/**
 * Pure working-day / gross-hour calculation.
 * See functional-design/business-logic-model.md §2 and business-rules.md BR-W*.
 * All dates are 'YYYY-MM-DD' strings, handled date-only (no timezone).
 */

const MS_PER_DAY = 86_400_000;

/** Parse a 'YYYY-MM-DD' string to a UTC Date at midnight. */
export function parseDate(iso: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) throw new Error(`Invalid date: ${iso}`);
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

export function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** true for Monday..Friday */
export function isWeekday(iso: string): boolean {
  const day = parseDate(iso).getUTCDay(); // 0 = Sun, 6 = Sat
  return day >= 1 && day <= 5;
}

/** Every calendar date from start to end inclusive. */
export function eachDate(startIso: string, endIso: string): string[] {
  const start = parseDate(startIso).getTime();
  const end = parseDate(endIso).getTime();
  const out: string[] = [];
  for (let t = start; t <= end; t += MS_PER_DAY) {
    out.push(formatDate(new Date(t)));
  }
  return out;
}

/** BR-W1: count of Mon..Fri dates in [start, end] inclusive. */
export function calendarWorkingDays(startIso: string, endIso: string): number {
  return eachDate(startIso, endIso).filter(isWeekday).length;
}

/**
 * BR-W2: calendarWorkingDays minus the distinct holiday dates that fall within
 * the window and on a weekday.
 */
export function netWorkingDays(
  startIso: string,
  endIso: string,
  holidayDates: readonly string[],
): number {
  const inWindow = new Set(eachDate(startIso, endIso).filter(isWeekday));
  let holidayHits = 0;
  for (const h of new Set(holidayDates)) {
    if (inWindow.has(h)) holidayHits += 1;
  }
  return calendarWorkingDays(startIso, endIso) - holidayHits;
}

/** BR-W3/W4: net working days for a person after their personal leave, floored at 0. */
export function personWorkingDays(net: number, personalLeaveDays: number): number {
  return Math.max(0, net - personalLeaveDays);
}

/** BR-W5 */
export function grossHours(personWorkingDaysValue: number, hoursPerDay: number): number {
  return personWorkingDaysValue * hoursPerDay;
}
