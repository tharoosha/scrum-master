import { useCallback, useEffect, useState } from 'react';
import type {
  AllocationResult,
  CapacityResult,
  IterationDetail,
  Task,
} from '@shared/types.js';
import { api } from '../api/client.js';
import { NumberField, RoleTag, StatusBadge, n2, roleRowClass, useAsyncAction } from '../ui/kit.js';

type Tab = 'people' | 'capacity' | 'tasks' | 'allocation';

export function IterationWorkspace({
  iterationId,
  onClosed,
}: {
  iterationId: string;
  onClosed: () => void;
}) {
  const [tab, setTab] = useState<Tab>('people');
  const [detail, setDetail] = useState<IterationDetail | null>(null);
  const [capacity, setCapacity] = useState<CapacityResult | null>(null);
  const [allocation, setAllocation] = useState<AllocationResult | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const run = useAsyncAction();

  const refresh = useCallback(async () => {
    const [d, c, a, t] = await Promise.all([
      api.getIteration(iterationId),
      api.getCapacity(iterationId),
      api.getAllocation(iterationId),
      api.listTasks(iterationId),
    ]);
    setDetail(d);
    setCapacity(c);
    setAllocation(a);
    setTasks(t);
  }, [iterationId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (!detail || !capacity || !allocation) return <p>Loading…</p>;
  const { iteration, participants, extraAssignments } = detail;

  const pool = (label: string, row: { available: number; remaining: number }) => (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900">
        {n2(row.available)}h
      </div>
      <div className={`text-xs ${row.remaining < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
        {n2(row.remaining)}h {row.remaining < 0 ? 'over' : 'left'}
      </div>
    </div>
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2>
          Iteration {iteration.number}{' '}
          <span className="ml-1 text-sm font-normal text-slate-400">
            {iteration.startDate} → {iteration.endDate}
          </span>
        </h2>
        <div className="flex items-center gap-2">
          <a
            className="btn-ghost no-underline hover:no-underline"
            href={api.exportUrl(iterationId)}
            data-testid="export-link"
          >
            {'↓'} Export to Excel
          </a>
          <button
            type="button"
            className="ghost"
            onClick={() =>
              run(async () => {
                if (confirm(`Delete iteration ${iteration.number}?`)) {
                  await api.deleteIteration(iterationId);
                  onClosed();
                }
              })
            }
          >
            Delete iteration
          </button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {pool('Dev pool', allocation.pools.dev)}
        {pool('QA pool', allocation.pools.qa)}
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Capex / Opex</div>
          <div className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900">
            {n2(allocation.capexOpex.totalCapex)}h / {n2(allocation.capexOpex.totalOpex)}h
          </div>
          <div className="text-xs text-slate-500">
            {n2(allocation.capexOpex.capexPct)}% / {n2(allocation.capexOpex.opexPct)}%
          </div>
        </div>
      </div>

      <div className="tabs">
        {(
          [
            ['people', 'Leave & Participants'],
            ['capacity', 'Capacity'],
            ['tasks', 'Tasks'],
            ['allocation', 'Allocation Review'],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button type="button"
            key={key}
            className={tab === key ? 'active' : ''}
            data-testid={`tab-${key}`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'people' && (
        <PeopleTab
          iterationId={iterationId}
          participants={participants}
          extraAssignments={extraAssignments}
          onChange={() => run(refresh)}
        />
      )}
      {tab === 'capacity' && (
        <CapacityTab
          iterationId={iterationId}
          capacity={capacity}
          devBufferHours={iteration.devBufferHours}
          qaBufferHours={iteration.qaBufferHours}
          onChange={() => run(refresh)}
        />
      )}
      {tab === 'tasks' && (
        <TasksTab
          iterationId={iterationId}
          tasks={tasks}
          participants={participants}
          unassigned={allocation.unassigned}
          onChange={() => run(refresh)}
        />
      )}
      {tab === 'allocation' && <AllocationTab allocation={allocation} />}
    </div>
  );
}

// --- People tab -------------------------------------------------------

function PeopleTab({
  iterationId,
  participants,
  extraAssignments,
  onChange,
}: {
  iterationId: string;
  participants: IterationDetail['participants'];
  extraAssignments: IterationDetail['extraAssignments'];
  onChange: () => void;
}) {
  const run = useAsyncAction();
  const nameById = new Map(participants.map((p) => [p.id, p.name]));

  return (
    <div className="panel">
      <h3>Participants</h3>
      <table data-testid="participants-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Role</th>
            <th>Loc</th>
            <th className="num">Capacity %</th>
            <th>Add&apos;l buffer</th>
            <th>SM</th>
            <th className="num">Leave (d)</th>
            <th>Included</th>
          </tr>
        </thead>
        <tbody>
          {participants.map((p) => (
            <tr key={p.id} data-testid={`participant-${p.name}`} className={roleRowClass(p.role)}>
              <td>{p.name}</td>
              <td>
                <RoleTag role={p.role} />
              </td>
              <td>{p.locationGroup}</td>
              <td className="num">
                <NumberField
                  value={p.capacityPercent}
                  min={1}
                  onCommit={(v) =>
                    run(async () => {
                      await api.setParticipant(iterationId, p.id, { capacityPercent: v });
                      onChange();
                    })
                  }
                />
              </td>
              <td>
                <input
                  type="checkbox"
                  checked={p.additionalDevBuffer}
                  onChange={(e) =>
                    run(async () => {
                      await api.setParticipant(iterationId, p.id, {
                        additionalDevBuffer: e.target.checked,
                      });
                      onChange();
                    })
                  }
                />
              </td>
              <td>
                <input
                  type="radio"
                  name="ws-sm"
                  checked={p.isScrumMaster}
                  onChange={() =>
                    run(async () => {
                      await api.setParticipant(iterationId, p.id, { isScrumMaster: true });
                      onChange();
                    })
                  }
                />
              </td>
              <td className="num">
                <NumberField
                  value={p.personalLeaveDays}
                  step={0.5}
                  testId={`leave-${p.name}`}
                  onCommit={(v) =>
                    run(async () => {
                      await api.setParticipant(iterationId, p.id, { personalLeaveDays: v });
                      onChange();
                    })
                  }
                />
              </td>
              <td>
                <input
                  type="checkbox"
                  checked={p.included}
                  onChange={(e) =>
                    run(async () => {
                      await api.setParticipant(iterationId, p.id, { included: e.target.checked });
                      onChange();
                    })
                  }
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Extra assignments</h3>
      <table>
        <thead>
          <tr>
            <th>Label</th>
            <th>Person</th>
            <th className="num">Capex h</th>
            <th className="num">Opex h</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {extraAssignments.map((ea) => (
            <tr key={ea.id}>
              <td>{ea.label}</td>
              <td>{nameById.get(ea.participantId) ?? '—'}</td>
              <td className="num">
                <NumberField
                  value={ea.capexHours}
                  onCommit={(v) =>
                    run(async () => {
                      await api.updateExtraAssignment(iterationId, ea.id, { capexHours: v });
                      onChange();
                    })
                  }
                />
              </td>
              <td className="num">
                <NumberField
                  value={ea.opexHours}
                  onCommit={(v) =>
                    run(async () => {
                      await api.updateExtraAssignment(iterationId, ea.id, { opexHours: v });
                      onChange();
                    })
                  }
                />
              </td>
              <td>
                {ea.kind === 'sm-activity' ? (
                  <span className="muted">auto (follows SM)</span>
                ) : (
                  <button type="button"
                    className="ghost"
                    onClick={() =>
                      run(async () => {
                        await api.deleteExtraAssignment(iterationId, ea.id);
                        onChange();
                      })
                    }
                  >
                    Remove
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <AddExtraAssignment iterationId={iterationId} participants={participants} onChange={onChange} />
    </div>
  );
}

function AddExtraAssignment({
  iterationId,
  participants,
  onChange,
}: {
  iterationId: string;
  participants: IterationDetail['participants'];
  onChange: () => void;
}) {
  const [kind, setKind] = useState<'maui-review' | 'common-automation' | 'custom'>('maui-review');
  const [participantId, setParticipantId] = useState(participants[0]?.id ?? '');
  const run = useAsyncAction();
  return (
    <div className="form-row">
      <select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
        <option value="maui-review">MAUI Review</option>
        <option value="common-automation">Common Automation (QA)</option>
        <option value="custom">Custom</option>
      </select>
      <select value={participantId} onChange={(e) => setParticipantId(e.target.value)}>
        {participants
          .filter((p) => kind !== 'common-automation' || p.role === 'QA')
          .map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
      </select>
      <button type="button"
        className="ghost"
        data-testid="add-extra-assignment"
        onClick={() =>
          run(async () => {
            await api.addExtraAssignment(iterationId, { kind, participantId });
            onChange();
          })
        }
      >
        Add
      </button>
    </div>
  );
}

// --- Capacity tab ----------------------------------------------------

function CapacityTab({
  iterationId,
  capacity,
  devBufferHours,
  qaBufferHours,
  onChange,
}: {
  iterationId: string;
  capacity: CapacityResult;
  devBufferHours: number;
  qaBufferHours: number;
  onChange: () => void;
}) {
  const run = useAsyncAction();
  return (
    <div className="panel">
      <h3>Per-person capacity</h3>
      <table data-testid="capacity-table">
        <thead>
          <tr>
            <th>Name</th>
            <th className="num">Net WD</th>
            <th className="num">Leave</th>
            <th className="num">Gross h</th>
            <th className="num">Ceremony</th>
            <th className="num">Buffer</th>
            <th className="num">Extra</th>
            <th className="num">Remaining</th>
            <th className="num">Cap %</th>
            <th className="num">Final available</th>
          </tr>
        </thead>
        <tbody>
          {capacity.breakdowns.map((b) => (
            <tr
              key={b.participantId}
              data-testid={`capacity-row-${b.name}`}
              className={roleRowClass(b.role)}
            >
              <td>
                {b.name} <RoleTag role={b.role} />{' '}
                {b.ceremonyExcluded && <span className="muted">(no ceremonies)</span>}
              </td>
              <td className="num">{b.netWorkingDays}</td>
              <td className="num">{b.personalLeaveDays}</td>
              <td className="num">{n2(b.grossHours)}</td>
              <td className="num">{n2(b.ceremonyDeduction)}</td>
              <td className="num">{n2(b.bufferDeduction)}</td>
              <td className="num">{n2(b.extraAssignmentHours)}</td>
              <td className="num">{n2(b.remaining)}</td>
              <td className="num">
                {b.capacityPercent}
                {b.additionalDevBuffer ? ' ×50%' : ''}
              </td>
              <td className="num">
                <strong>{n2(b.finalAvailable)}</strong>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={9} className="right">
              Dev pool available
            </td>
            <td className="num">
              <strong>{n2(capacity.devPoolAvailable)}</strong>
            </td>
          </tr>
          <tr>
            <td colSpan={9} className="right">
              QA pool available
            </td>
            <td className="num">
              <strong>{n2(capacity.qaPoolAvailable)}</strong>
            </td>
          </tr>
        </tfoot>
      </table>

      <h3>Manual pool buffers</h3>
      <div className="form-row">
        <label>Dev Buffer (h)</label>
        <NumberField
          value={devBufferHours}
          testId="dev-buffer"
          onCommit={(v) =>
            run(async () => {
              await api.updateIteration(iterationId, { devBufferHours: v });
              onChange();
            })
          }
        />
        <label>QA Buffer (h)</label>
        <NumberField
          value={qaBufferHours}
          testId="qa-buffer"
          onCommit={(v) =>
            run(async () => {
              await api.updateIteration(iterationId, { qaBufferHours: v });
              onChange();
            })
          }
        />
      </div>
    </div>
  );
}

// --- Tasks tab -----------------------------------------------------

function TasksTab({
  iterationId,
  tasks,
  participants,
  unassigned,
  onChange,
}: {
  iterationId: string;
  tasks: Task[];
  participants: IterationDetail['participants'];
  unassigned: { devHours: number; qaHours: number };
  onChange: () => void;
}) {
  const run = useAsyncAction();
  const [title, setTitle] = useState('');
  const [externalId, setExternalId] = useState('');
  const [dev, setDev] = useState(0);
  const [qa, setQa] = useState(0);
  const [category, setCategory] = useState<'' | 'Capex' | 'Opex'>('');
  const [jiraNote, setJiraNote] = useState('');
  const [jiraLoading, setJiraLoading] = useState(false);
  const devs = participants.filter((p) => p.role === 'Dev');
  const qas = participants.filter((p) => p.role === 'QA');

  const JIRA_KEY = /^[A-Za-z][A-Za-z0-9]+-\d+$/;

  // When a Jira-looking ID is entered and the title is still blank, fetch the summary.
  const lookupTitle = async (key: string) => {
    setJiraNote('');
    if (!JIRA_KEY.test(key.trim()) || title.trim()) return;
    setJiraLoading(true);
    try {
      const issue = await api.lookupJira(key.trim());
      setTitle(issue.summary);
      setExternalId(issue.key);
      if (issue.category) setCategory(issue.category);
    } catch (err) {
      // Non-blocking: keep the ID, leave the title blank, show a small note.
      const msg = err instanceof Error ? err.message : 'lookup failed';
      if (/not configured/i.test(msg)) {
        setJiraNote('Jira lookup not set up — add JIRA_* keys to .env, then restart. Enter the title manually for now.');
      } else if (/rejected the credentials/i.test(msg) || /doesn't look like a Jira site/i.test(msg)) {
        setJiraNote(`${msg} (restart after editing .env)`);
      } else {
        setJiraNote(`Couldn't fetch from Jira: ${msg}. Enter the title manually.`);
      }
    } finally {
      setJiraLoading(false);
    }
  };

  const add = () =>
    run(async () => {
      await api.createTask(iterationId, {
        title,
        externalId,
        devEstimateH: dev,
        qaEstimateH: qa,
        category: category === '' ? null : category,
      });
      setTitle('');
      setExternalId('');
      setDev(0);
      setQa(0);
      setCategory('');
      setJiraNote('');
      onChange();
    });

  return (
    <div className="panel">
      <p data-testid="unassigned-line">
        Unassigned — <strong>Dev: {n2(unassigned.devHours)}h</strong>,{' '}
        <strong>QA: {n2(unassigned.qaHours)}h</strong>
      </p>
      <table data-testid="tasks-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>External ID</th>
            <th className="num">Dev h</th>
            <th className="num">QA h</th>
            <th>Category</th>
            <th>Assigned Dev</th>
            <th>Assigned QA</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {tasks.map((t) => (
            <tr key={t.id} data-testid={`task-row-${t.title}`}>
              <td>{t.title}</td>
              <td>{t.externalId}</td>
              <td className="num">
                <NumberField
                  value={t.devEstimateH}
                  onCommit={(v) =>
                    run(async () => {
                      await api.updateTask(t.id, { devEstimateH: v });
                      onChange();
                    })
                  }
                />
              </td>
              <td className="num">
                <NumberField
                  value={t.qaEstimateH}
                  onCommit={(v) =>
                    run(async () => {
                      await api.updateTask(t.id, { qaEstimateH: v });
                      onChange();
                    })
                  }
                />
              </td>
              <td>
                <select
                  value={t.category ?? ''}
                  onChange={(e) =>
                    run(async () => {
                      await api.updateTask(t.id, {
                        category: e.target.value === '' ? null : (e.target.value as 'Capex' | 'Opex'),
                      });
                      onChange();
                    })
                  }
                >
                  <option value="">—</option>
                  <option>Capex</option>
                  <option>Opex</option>
                </select>
              </td>
              <td>
                <select
                  data-testid={`assign-dev-${t.title}`}
                  value={t.assignedDevParticipantId ?? ''}
                  onChange={(e) =>
                    run(async () => {
                      await api.assignTask(t.id, { devParticipantId: e.target.value || null });
                      onChange();
                    })
                  }
                >
                  <option value="">— unassigned —</option>
                  {devs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <select
                  data-testid={`assign-qa-${t.title}`}
                  value={t.assignedQaParticipantId ?? ''}
                  onChange={(e) =>
                    run(async () => {
                      await api.assignTask(t.id, { qaParticipantId: e.target.value || null });
                      onChange();
                    })
                  }
                >
                  <option value="">— unassigned —</option>
                  {qas.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <button type="button"
                  className="ghost"
                  onClick={() =>
                    run(async () => {
                      await api.deleteTask(t.id);
                      onChange();
                    })
                  }
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h4>Add task</h4>
      <div className="form-row">
        <input
          placeholder="AB-xxxxx"
          data-testid="new-task-external-id"
          value={externalId}
          onChange={(e) => setExternalId(e.target.value)}
          onBlur={(e) => void lookupTitle(e.target.value)}
        />
        <input
          placeholder="Title"
          data-testid="new-task-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        {jiraLoading && <span className="muted">looking up Jira…</span>}
        <select
          data-testid="new-task-category"
          value={category}
          onChange={(e) => setCategory(e.target.value as '' | 'Capex' | 'Opex')}
        >
          <option value="">Capex/Opex —</option>
          <option>Capex</option>
          <option>Opex</option>
        </select>
        <label>Dev h</label>
        <input type="number" value={dev} onChange={(e) => setDev(Number(e.target.value))} />
        <label>QA h</label>
        <input type="number" value={qa} onChange={(e) => setQa(Number(e.target.value))} />
        <button type="button" className="primary" data-testid="add-task" disabled={!title.trim()} onClick={add}>
          Add
        </button>
      </div>
      {jiraNote && (
        <div className="muted" data-testid="jira-note" style={{ marginTop: 4 }}>
          {jiraNote}
        </div>
      )}
      <p className="muted">
        Enter a Jira issue key (e.g. <code>AB-12510</code>) and tab out — the title, and the
        Capex/Opex category (from Jira's <code>Capex</code> field: Yes → Capex, otherwise Opex),
        are filled in automatically when Jira lookup is configured.
      </p>
    </div>
  );
}

// --- Allocation tab ------------------------------------------------

function AllocationTab({ allocation }: { allocation: AllocationResult }) {
  const sorted = [...allocation.people].sort((a, b) => {
    const rank = (s: string) => (s === 'Over' ? 0 : s === 'Under' ? 1 : 2);
    return rank(a.status) - rank(b.status);
  });
  return (
    <div className="panel">
      <table data-testid="allocation-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Role</th>
            <th>Loc</th>
            <th className="num">Available h</th>
            <th className="num">Allocated h</th>
            <th className="num">Remaining h</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((p) => (
            <tr
              key={p.participantId}
              data-testid={`allocation-row-${p.name}`}
              className={roleRowClass(p.role)}
            >
              <td>{p.name}</td>
              <td>
                <RoleTag role={p.role} />
              </td>
              <td>{p.locationGroup}</td>
              <td className="num">{n2(p.available)}</td>
              <td className="num">{n2(p.allocated)}</td>
              <td className="num">{n2(p.remaining)}</td>
              <td>
                <StatusBadge status={p.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="summary-strip" style={{ marginTop: 12 }}>
        <span>
          <span className="k">Dev pool</span>
          {n2(allocation.pools.dev.available)} / {n2(allocation.pools.dev.allocated)} /{' '}
          {n2(allocation.pools.dev.remaining)}
        </span>
        <span>
          <span className="k">QA pool</span>
          {n2(allocation.pools.qa.available)} / {n2(allocation.pools.qa.allocated)} /{' '}
          {n2(allocation.pools.qa.remaining)}
        </span>
        <span>
          <span className="k">Unassigned</span>
          Dev {n2(allocation.unassigned.devHours)}h · QA {n2(allocation.unassigned.qaHours)}h
        </span>
      </div>
    </div>
  );
}
