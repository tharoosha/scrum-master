import { useEffect, useState } from 'react';
import type { CalendarSummary, LocationGroup } from '@shared/types.js';
import { api } from '../api/client.js';
import { FileDrop, useAsyncAction } from '../ui/kit.js';

const LABELS: Record<LocationGroup, string> = { SL: 'Sri Lanka', MY: 'Malaysia' };

export function CalendarsScreen() {
  const [summaries, setSummaries] = useState<CalendarSummary[]>([]);
  const run = useAsyncAction();

  const reload = () => api.getCalendars().then(setSummaries);
  useEffect(() => {
    void reload();
  }, []);

  const upload = (location: LocationGroup, file: File) =>
    run(async () => {
      await api.uploadCalendar(location, file);
      await reload();
    }, `Loaded ${LABELS[location]} holidays`);

  return (
    <div>
      <h2>Holiday Calendars</h2>
      <p className="muted">
        Upload a public-holiday <code>.ics</code> file for each location. Stored and reused for
        every iteration until you replace it. Malaysia team = Arshad, Meng, Ameerah.
      </p>
      {(['SL', 'MY'] as LocationGroup[]).map((loc) => {
        const s = summaries.find((x) => x.locationGroup === loc);
        return (
          <div className="panel" key={loc} data-testid={`calendar-${loc}`}>
            <h3>{LABELS[loc]}</h3>
            {s && s.eventCount > 0 ? (
              <p>
                <strong>{s.sourceFileName}</strong> — {s.eventCount} holidays, {s.minDate} to{' '}
                {s.maxDate}
                <br />
                <span className="muted">uploaded {new Date(s.uploadedAt!).toLocaleString()}</span>
              </p>
            ) : (
              <p className="muted">No calendar uploaded yet.</p>
            )}
            <FileDrop
              accept=".ics,text/calendar"
              label="Drop an .ics file here, or click to choose"
              testId={`filedrop-${loc}`}
              onFile={(f) => upload(loc, f)}
            />
          </div>
        );
      })}
    </div>
  );
}
