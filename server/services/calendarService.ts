import ical from 'node-ical';
import type {
  CalendarSummary,
  HolidayCalendar,
  HolidayEvent,
  LocationGroup,
} from '@shared/types.js';
import type { Repository } from '../repository/index.js';
import { ValidationError, assert } from '../errors.js';
import { eachDate, isWeekday } from '../calc/workingDays.js';

/**
 * node-ical represents all-day (VALUE=DATE) events as a Date at LOCAL midnight.
 * Format from local components so we don't shift a day across the UTC boundary.
 */
function localDateOnly(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * CalendarService — stores the SL and MY holiday .ics files and answers holiday
 * queries. See business-rules.md BR-C*.
 */
export class CalendarService {
  constructor(private readonly repo: Repository) {}

  /**
   * Parse an iCalendar string to all-day holiday dates.
   * - all-day events only (timed events skipped)
   * - recurring events (RRULE) skipped
   * - multi-day spans expanded to each individual date
   */
  static parseIcs(icsText: string): HolidayEvent[] {
    let parsed: Record<string, ical.CalendarComponent>;
    try {
      parsed = ical.sync.parseICS(icsText);
    } catch {
      throw new ValidationError('File is not valid iCalendar (.ics) data');
    }

    const events = Object.values(parsed).filter(
      (c): c is ical.VEvent => (c as ical.VEvent).type === 'VEVENT',
    );
    if (events.length === 0) {
      throw new ValidationError('No calendar events found in the file');
    }

    const out: HolidayEvent[] = [];
    for (const ev of events) {
      if (ev.rrule) continue; // BR-C2: skip recurring
      const isAllDay =
        (ev.datetype && ev.datetype === 'date') ||
        (ev.start as Date & { dateOnly?: boolean })?.dateOnly === true;
      if (!isAllDay) continue; // BR-C2: skip timed

      const startIso = localDateOnly(new Date(ev.start));
      // DTEND for all-day events is exclusive; step back one day for the inclusive span.
      const endExclusive = ev.end ? new Date(ev.end) : new Date(ev.start);
      const endInclusive = new Date(endExclusive.getTime() - 86_400_000);
      const endIso =
        endInclusive.getTime() >= new Date(ev.start).getTime()
          ? localDateOnly(endInclusive)
          : startIso;

      for (const d of eachDate(startIso, endIso)) {
        out.push({ date: d, summary: String(ev.summary ?? 'Holiday') });
      }
    }

    // dedupe by date, keep first summary
    const byDate = new Map<string, HolidayEvent>();
    for (const e of out) if (!byDate.has(e.date)) byDate.set(e.date, e);
    return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  }

  uploadCalendar(
    locationGroup: LocationGroup,
    sourceFileName: string,
    icsText: string,
  ): CalendarSummary {
    assert(locationGroup === 'SL' || locationGroup === 'MY', 'Invalid location group');
    const events = CalendarService.parseIcs(icsText);

    const record: HolidayCalendar = {
      locationGroup,
      sourceFileName,
      uploadedAt: new Date().toISOString(),
      events,
      rawIcs: icsText,
    };
    const list = this.repo.db.holidayCalendars;
    const idx = list.findIndex((c) => c.locationGroup === locationGroup);
    if (idx >= 0) list[idx] = record;
    else list.push(record);
    void this.repo.save();

    return this.summaryFor(locationGroup);
  }

  getSummaries(): CalendarSummary[] {
    return (['SL', 'MY'] as LocationGroup[]).map((lg) => this.summaryFor(lg));
  }

  private summaryFor(locationGroup: LocationGroup): CalendarSummary {
    const cal = this.repo.db.holidayCalendars.find((c) => c.locationGroup === locationGroup);
    if (!cal) {
      return {
        locationGroup,
        sourceFileName: null,
        uploadedAt: null,
        eventCount: 0,
        minDate: null,
        maxDate: null,
      };
    }
    const dates = cal.events.map((e) => e.date).sort();
    return {
      locationGroup,
      sourceFileName: cal.sourceFileName,
      uploadedAt: cal.uploadedAt,
      eventCount: cal.events.length,
      minDate: dates[0] ?? null,
      maxDate: dates[dates.length - 1] ?? null,
    };
  }

  /** BR-C5/C6: distinct weekday holiday dates for a location within [start, end]. */
  holidayDatesInRange(
    locationGroup: LocationGroup,
    startIso: string,
    endIso: string,
  ): string[] {
    const cal = this.repo.db.holidayCalendars.find((c) => c.locationGroup === locationGroup);
    if (!cal) return [];
    const inWindow = new Set(eachDate(startIso, endIso));
    const out = new Set<string>();
    for (const e of cal.events) {
      if (inWindow.has(e.date) && isWeekday(e.date)) out.add(e.date);
    }
    return [...out].sort();
  }
}
