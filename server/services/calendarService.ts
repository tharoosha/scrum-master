import type {
  CalendarSummary,
  HolidayCalendar,
  HolidayEvent,
  LocationGroup,
} from '@shared/types.js';
import type { Repository } from '../repository/index.js';
import { ValidationError, assert } from '../errors.js';
import { eachDate, isWeekday } from '../calc/workingDays.js';

/** `20260819` -> `2026-08-19`; `20260819T090000Z` -> null (a date-time, not a date). */
function icsDateOnly(value: string): string | null {
  const m = /^(\d{4})(\d{2})(\d{2})$/.exec(value.trim());
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

/** step an ISO date back one day (DTEND is exclusive for all-day events) */
function prevDay(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** RFC 5545 line unfolding: a CRLF followed by a space or tab continues the previous line. */
function unfold(text: string): string[] {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\n[ \t]/g, '')
    .split('\n');
}

function unescapeText(s: string): string {
  return s
    .replace(/\\n/gi, ' ')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
    .trim();
}

/**
 * CalendarService — stores the SL and MY holiday .ics files and answers holiday
 * queries. See business-rules.md BR-C*.
 */
export class CalendarService {
  constructor(private readonly repo: Repository) {}

  /**
   * Minimal, dependency-free iCalendar parser for holiday feeds:
   *  - all-day VEVENTs only (DTSTART with an 8-digit date); timed events skipped
   *  - recurring events (RRULE) skipped
   *  - multi-day spans expanded to each individual date
   * (A hand-rolled parser is used instead of a library so it bundles cleanly for serverless.)
   */
  static parseIcs(icsText: string): HolidayEvent[] {
    const lines = unfold(icsText);
    if (!lines.some((l) => l.toUpperCase().startsWith('BEGIN:VCALENDAR'))) {
      throw new ValidationError('File is not valid iCalendar (.ics) data');
    }

    const out: HolidayEvent[] = [];
    let inEvent = false;
    let cur: { start?: string; end?: string; summary?: string; recurring?: boolean } = {};

    const flush = () => {
      if (cur.start) {
        const endIso = cur.end ? prevDay(cur.end) : cur.start;
        const finalEnd = endIso < cur.start ? cur.start : endIso;
        for (const d of eachDate(cur.start, finalEnd)) {
          out.push({ date: d, summary: cur.summary || 'Holiday' });
        }
      }
      cur = {};
    };

    for (const raw of lines) {
      const line = raw.trim();
      const upper = line.toUpperCase();
      if (upper === 'BEGIN:VEVENT') {
        inEvent = true;
        cur = {};
        continue;
      }
      if (upper === 'END:VEVENT') {
        if (inEvent && !cur.recurring) flush();
        else cur = {};
        inEvent = false;
        continue;
      }
      if (!inEvent) continue;

      const colon = line.indexOf(':');
      if (colon < 0) continue;
      const name = upper.slice(0, colon).split(';')[0];
      const value = line.slice(colon + 1);

      if (name === 'RRULE') cur.recurring = true;
      else if (name === 'DTSTART') cur.start = icsDateOnly(value) ?? undefined;
      else if (name === 'DTEND') cur.end = icsDateOnly(value) ?? undefined;
      else if (name === 'SUMMARY') cur.summary = unescapeText(value);
    }

    if (out.length === 0) {
      throw new ValidationError(
        'No all-day events found in the file (holiday calendars use all-day dates)',
      );
    }

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
