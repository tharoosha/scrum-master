import { describe, it, expect, beforeEach } from 'vitest';
import { CalendarService } from './calendarService.js';
import { makeInMemoryRepository } from '../repository/index.js';

const ICS = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//test//test//EN
BEGIN:VEVENT
UID:1
SUMMARY:Independence Day
DTSTART;VALUE=DATE:20260819
DTEND;VALUE=DATE:20260820
END:VEVENT
BEGIN:VEVENT
UID:2
SUMMARY:Long Weekend
DTSTART;VALUE=DATE:20260828
DTEND;VALUE=DATE:20260831
END:VEVENT
BEGIN:VEVENT
UID:3
SUMMARY:Timed meeting (ignored)
DTSTART:20260825T090000Z
DTEND:20260825T100000Z
END:VEVENT
END:VCALENDAR`;

describe('CalendarService.parseIcs', () => {
  it('keeps all-day events, expands multi-day, skips timed', () => {
    const events = CalendarService.parseIcs(ICS);
    const dates = events.map((e) => e.date);
    expect(dates).toContain('2026-08-19');
    // 28,29,30 expanded (DTEND 31 is exclusive)
    expect(dates).toContain('2026-08-28');
    expect(dates).toContain('2026-08-29');
    expect(dates).toContain('2026-08-30');
    expect(dates).not.toContain('2026-08-31');
    expect(dates).not.toContain('2026-08-25'); // timed event skipped
  });

  it('rejects non-ical text', () => {
    expect(() => CalendarService.parseIcs('not a calendar')).toThrow();
  });
});

describe('CalendarService holiday queries', () => {
  let svc: CalendarService;
  beforeEach(() => {
    svc = new CalendarService(makeInMemoryRepository());
  });

  it('stores, replaces, and reports a summary', () => {
    const s1 = svc.uploadCalendar('SL', 'sl-2026.ics', ICS);
    expect(s1.eventCount).toBeGreaterThan(0);
    expect(s1.sourceFileName).toBe('sl-2026.ics');

    const s2 = svc.uploadCalendar('SL', 'sl-2026-v2.ics', ICS);
    expect(s2.sourceFileName).toBe('sl-2026-v2.ics');
    expect(svc.getSummaries().filter((s) => s.locationGroup === 'SL')).toHaveLength(1);
  });

  it('holidayDatesInRange returns weekday holidays in window only', () => {
    svc.uploadCalendar('SL', 'sl.ics', ICS);
    const dates = svc.holidayDatesInRange('SL', '2026-08-17', '2026-09-04');
    expect(dates).toContain('2026-08-19'); // Wed
    expect(dates).toContain('2026-08-28'); // Fri
    expect(dates).not.toContain('2026-08-29'); // Sat
    expect(dates).not.toContain('2026-08-30'); // Sun
    expect(svc.holidayDatesInRange('MY', '2026-08-17', '2026-09-04')).toEqual([]);
  });
});
