import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { makeInMemoryRepository } from '../repository/index.js';
import { RosterService } from './rosterService.js';
import { CalendarService } from './calendarService.js';
import { IterationService } from './iterationService.js';
import { TaskService } from './taskService.js';
import { JiraService } from './jiraService.js';
import { ImportService } from './importService.js';

const ENV = {
  JIRA_BASE_URL: 'https://x.jira.com',
  JIRA_EMAIL: 'me@x.com',
  JIRA_API_TOKEN: 'tok',
  JIRA_BOARD_ID: '27',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const SPRINTS = [
  { id: 2022, name: 'Iteration 205', state: 'active', startDate: '2026-08-17T00:00:00Z', endDate: '2026-09-04T00:00:00Z' },
  { id: 2023, name: 'Iteration 206', state: 'future' },
];

function stubJira(issues: unknown[]) {
  const fn = vi.fn((...args: unknown[]) => {
    const url = String(args[0]);
    if (url.includes('/rest/api/3/field')) return Promise.resolve(json([{ id: 'customfield_13821', name: 'Capex' }]));
    if (url.includes('/board/27/sprint')) return Promise.resolve(json({ isLast: true, values: SPRINTS }));
    if (/\/sprint\/\d+\/issue/.test(url)) return Promise.resolve(json({ total: issues.length, issues }));
    throw new Error('unrouted ' + url);
  });
  vi.stubGlobal('fetch', fn);
}

function wire() {
  const repo = makeInMemoryRepository();
  const roster = new RosterService(repo);
  const iterations = new IterationService(repo, roster, new CalendarService(repo));
  const tasks = new TaskService(repo, iterations);
  const imports = new ImportService(new JiraService(ENV), iterations, tasks);
  return { repo, iterations, tasks, imports };
}

afterEach(() => vi.unstubAllGlobals());

describe('ImportService', () => {
  let ctx: ReturnType<typeof wire>;
  beforeEach(() => {
    ctx = wire();
  });

  it('creates Iteration 206 with a task per Jira issue', async () => {
    stubJira([
      {
        key: 'AB-11895',
        fields: { summary: 'Overall epic testing', issuetype: { name: 'Task' }, timetracking: { originalEstimateSeconds: 216000 }, customfield_13821: null },
      },
      {
        key: 'AB-12138',
        fields: { summary: 'DB mismatch', issuetype: { name: 'Clarification' }, timetracking: {}, customfield_13821: { value: 'Yes' } },
      },
    ]);

    const res = await ctx.imports.importSprint({
      sprintName: 'Iteration 206',
      startDate: '2026-09-07',
      endDate: '2026-09-25',
    });

    expect(res.iteration.iteration.number).toBe(206);
    expect(res.importedTaskCount).toBe(2);
    expect(res.withoutEstimate).toBe(1); // AB-12138 has no estimate

    const tasks = ctx.tasks.listTasks(res.iteration.iteration.id);
    expect(tasks.map((t) => [t.externalId, t.title, t.devEstimateH, t.qaEstimateH, t.category])).toEqual([
      ['AB-11895', 'Overall epic testing', 60, 0, 'Opex'],
      ['AB-12138', 'DB mismatch', 0, 0, 'Capex'],
    ]);
    // iteration created with all active participants
    expect(res.iteration.participants).toHaveLength(11);
  });

  it('rejects re-importing an existing iteration number', async () => {
    stubJira([]);
    await ctx.imports.importSprint({ sprintName: 'Iteration 206', startDate: '2026-09-07', endDate: '2026-09-25' });
    await expect(
      ctx.imports.importSprint({ sprintName: 'Iteration 206', startDate: '2026-09-07', endDate: '2026-09-25' }),
    ).rejects.toMatchObject({ code: 'conflict' });
  });

  it('uses the sprint dates when Jira provides them', async () => {
    stubJira([]);
    const res = await ctx.imports.importSprint({ sprintName: 'Iteration 205' });
    expect(res.iteration.iteration.startDate).toBe('2026-08-17');
    expect(res.iteration.iteration.endDate).toBe('2026-09-04');
  });

  it('needs dates when the future sprint has none', async () => {
    stubJira([]);
    await expect(ctx.imports.importSprint({ sprintName: 'Iteration 206' })).rejects.toMatchObject({
      code: 'validation_error',
    });
  });
});
