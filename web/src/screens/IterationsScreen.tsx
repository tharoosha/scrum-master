import { useEffect, useState } from 'react';
import type { IterationSummary, JiraSprint, JiraStatus } from '@shared/types.js';
import { api } from '../api/client.js';
import { FormRow, n2, useAsyncAction, useToast } from '../ui/kit.js';

/** Friday of the third week from a Monday start (start + 18 days). */
function suggestEnd(start: string): string {
  if (!start) return '';
  const d = new Date(start + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + 18);
  return d.toISOString().slice(0, 10);
}

export function IterationsScreen({ onOpen }: { onOpen: (id: string) => void }) {
  const [rows, setRows] = useState<IterationSummary[]>([]);
  const [creating, setCreating] = useState(false);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [number, setNumber] = useState<number | ''>('');
  const [warning, setWarning] = useState('');
  const run = useAsyncAction();

  const reload = () => api.listIterations().then(setRows);
  useEffect(() => {
    void reload();
  }, []);

  const beginCreate = () => {
    const next = rows.length ? Math.max(...rows.map((r) => r.number)) + 1 : 1;
    setNumber(next);
    setStart('');
    setEnd('');
    setWarning('');
    setCreating(true);
  };

  const create = () =>
    run(async () => {
      const detail = await api.createIteration({
        number: number === '' ? undefined : Number(number),
        startDate: start,
        endDate: end,
      });
      setCreating(false);
      await reload();
      onOpen(detail.iteration.id);
    }, 'Iteration created');

  return (
    <div>
      <h2>Iterations</h2>
      <button type="button" className="primary" data-testid="new-iteration" onClick={beginCreate}>
        New iteration
      </button>{' '}
      <JiraImport
        existingNumbers={rows.map((r) => r.number)}
        onImported={async (id) => {
          await reload();
          onOpen(id);
        }}
      />

      {creating && (
        <div className="panel">
          <h3>New iteration</h3>
          <FormRow label="Number">
            <input
              type="number"
              data-testid="iteration-number"
              value={number}
              onChange={(e) => {
                const v = e.target.value === '' ? '' : Number(e.target.value);
                setNumber(v);
                setWarning(
                  typeof v === 'number' && rows.some((r) => r.number === v)
                    ? `Iteration ${v} already exists`
                    : '',
                );
              }}
            />
          </FormRow>
          <FormRow label="Start date (Mon)">
            <input
              type="date"
              data-testid="iteration-start"
              value={start}
              onChange={(e) => {
                setStart(e.target.value);
                if (!end) setEnd(suggestEnd(e.target.value));
              }}
            />
          </FormRow>
          <FormRow label="End date (Fri)">
            <input
              type="date"
              data-testid="iteration-end"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </FormRow>
          {warning && <div className="field-error">{warning} (allowed, just checking)</div>}
          <button type="button" className="primary" data-testid="create-iteration" disabled={!start || !end} onClick={create}>
            Create
          </button>{' '}
          <button type="button" className="ghost" onClick={() => setCreating(false)}>
            Cancel
          </button>
        </div>
      )}

      <div className="panel">
        <table data-testid="iterations-table">
          <thead>
            <tr>
              <th>Number</th>
              <th>Start</th>
              <th>End</th>
              <th className="num">Participants</th>
              <th className="num">Dev pool</th>
              <th className="num">QA pool</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} data-testid={`iteration-row-${r.number}`}>
                <td>{r.number}</td>
                <td>{r.startDate}</td>
                <td>{r.endDate}</td>
                <td className="num">{r.participantCount}</td>
                <td className="num">{n2(r.devPoolAvailable)}</td>
                <td className="num">{n2(r.qaPoolAvailable)}</td>
                <td>
                  <button type="button" className="ghost" onClick={() => onOpen(r.id)}>
                    Open
                  </button>{' '}
                  <button type="button"
                    className="ghost"
                    onClick={() =>
                      run(async () => {
                        if (confirm(`Delete iteration ${r.number}?`)) {
                          await api.deleteIteration(r.id);
                          await reload();
                        }
                      })
                    }
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="muted">
                  No iterations yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- Import from Jira ---------------------------------------------------

function JiraImport({
  existingNumbers,
  onImported,
}: {
  existingNumbers: number[];
  onImported: (iterationId: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<JiraStatus | null>(null);
  const [sprints, setSprints] = useState<JiraSprint[]>([]);
  const [sprintName, setSprintName] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [preview, setPreview] = useState<{ count: number; withEst: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const { show } = useToast();
  const run = useAsyncAction();

  useEffect(() => {
    void api.jiraStatus().then(setStatus).catch(() => setStatus(null));
  }, []);

  const beginImport = () =>
    run(async () => {
      setOpen(true);
      const list = await api.listSprints();
      setSprints(list);
      const firstFuture = list.find((s) => s.state === 'future') ?? list[0];
      if (firstFuture) selectSprint(firstFuture, list);
    });

  const selectSprint = (s: JiraSprint, list = sprints) => {
    setSprintName(s.name);
    setStart(s.startDate ?? '');
    setEnd(s.endDate ?? (s.startDate ? suggestEnd(s.startDate) : ''));
    setPreview(null);
    void list;
  };

  const doPreview = () =>
    run(async () => {
      setBusy(true);
      try {
        const p = await api.previewSprint(sprintName);
        setPreview({ count: p.issues.length, withEst: p.issues.filter((i) => i.estimateHours > 0).length });
        if (!start && p.sprint.startDate) setStart(p.sprint.startDate);
        if (!end && (p.sprint.endDate || start)) setEnd(p.sprint.endDate ?? suggestEnd(start));
      } finally {
        setBusy(false);
      }
    });

  const doImport = () =>
    run(async () => {
      setBusy(true);
      try {
        const res = await api.importSprint({ sprintName, startDate: start || undefined, endDate: end || undefined });
        show(
          `Imported ${res.sprint.name}: ${res.importedTaskCount} tasks` +
            (res.withoutEstimate ? ` (${res.withoutEstimate} without an estimate)` : ''),
        );
        setOpen(false);
        await onImported(res.iteration.iteration.id);
      } finally {
        setBusy(false);
      }
    });

  if (status && status.configured && !status.boardId) {
    return (
      <span className="muted" data-testid="jira-import-disabled">
        (set <code>JIRA_BOARD_ID</code> in .env to import sprints)
      </span>
    );
  }
  if (!status || !status.configured) return null;

  const numFromName = Number(/(\d+)\s*$/.exec(sprintName)?.[1] ?? '');
  const dup = Number.isInteger(numFromName) && existingNumbers.includes(numFromName);

  return (
    <>
      <button type="button" className="ghost" data-testid="import-jira" onClick={beginImport}>
        Import from Jira
      </button>
      {open && (
        <div className="panel" data-testid="jira-import-panel">
          <h3>Import a sprint from Jira</h3>
          {status.authenticated ? (
            <p className="muted">
              Board {status.boardId} · authenticated as {status.accountLabel}
            </p>
          ) : (
            <p className="field-error">{status.problem}</p>
          )}
          <FormRow label="Sprint">
            <select
              data-testid="jira-sprint-select"
              value={sprintName}
              onChange={(e) => {
                const s = sprints.find((x) => x.name === e.target.value);
                if (s) selectSprint(s);
              }}
            >
              {sprints.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name} {s.state === 'active' ? '(current)' : s.state === 'future' ? '(upcoming)' : '(closed)'}
                </option>
              ))}
            </select>
          </FormRow>
          <FormRow label="Start date">
            <input
              type="date"
              data-testid="jira-import-start"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </FormRow>
          <FormRow label="End date">
            <input
              type="date"
              data-testid="jira-import-end"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </FormRow>
          {dup && (
            <div className="field-error">
              Iteration {numFromName} already exists — delete it first, then re-import.
            </div>
          )}
          {preview && (
            <p className="muted" data-testid="jira-preview">
              {preview.count} issues in this sprint · {preview.withEst} have an estimate. Estimates
              import as Dev hours — split Dev/QA in the workspace.
            </p>
          )}
          <button type="button" className="ghost" disabled={busy || !sprintName} onClick={doPreview}>
            Preview
          </button>{' '}
          <button type="button"
            className="primary"
            data-testid="do-import"
            disabled={busy || !sprintName || !start || !end || dup}
            onClick={doImport}
          >
            Import
          </button>{' '}
          <button type="button" className="ghost" onClick={() => setOpen(false)}>
            Cancel
          </button>
        </div>
      )}
    </>
  );
}
