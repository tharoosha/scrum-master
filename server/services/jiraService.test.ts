import { describe, it, expect, vi, afterEach } from 'vitest';
import { JiraService } from './jiraService.js';

const ENV = {
  JIRA_BASE_URL: 'https://example.atlassian.net',
  JIRA_EMAIL: 'me@x.com',
  JIRA_API_TOKEN: 'tok',
  JIRA_BOARD_ID: '27',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const CAPEX_FIELD = [{ id: 'customfield_13821', name: 'Capex' }];

/** Stub fetch with a router keyed by substring of the URL. */
function stubFetch(routes: Record<string, () => Response | Promise<Response> | never>) {
  const fn = vi.fn((...args: unknown[]) => {
    const url = String(args[0]);
    for (const [needle, handler] of Object.entries(routes)) {
      if (url.includes(needle)) return Promise.resolve(handler());
    }
    throw new Error(`unrouted fetch: ${url}`);
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

afterEach(() => vi.unstubAllGlobals());

describe('JiraService', () => {
  it('validates issue keys', () => {
    expect(JiraService.isValidKey('AB-12510')).toBe(true);
    expect(JiraService.isValidKey('ab-1')).toBe(true);
    expect(JiraService.isValidKey('AB12510')).toBe(false);
    expect(JiraService.isValidKey('not a key')).toBe(false);
  });

  it('reports not-configured when env vars are missing', async () => {
    const svc = new JiraService({});
    expect(svc.isConfigured).toBe(false);
    await expect(svc.status()).resolves.toEqual({
      configured: false,
      baseUrl: null,
      authenticated: false,
      accountLabel: null,
      problem: null,
      boardId: null,
    });
    await expect(svc.getIssueSummary('AB-1')).rejects.toMatchObject({ code: 'jira_not_configured' });
  });

  it('rejects a malformed key before calling Jira', async () => {
    const svc = new JiraService(ENV);
    await expect(svc.getIssueSummary('nope')).rejects.toMatchObject({ code: 'validation_error' });
  });

  it('returns the summary, sends Basic auth, and trims token/email whitespace', async () => {
    const fn = stubFetch({
      '/rest/api/3/field': () => json(CAPEX_FIELD),
      '/rest/api/3/issue/': () => json({ fields: { summary: 'Fix the thing', customfield_13821: null } }),
    });
    const svc = new JiraService({
      JIRA_BASE_URL: 'https://x.jira.com/',
      JIRA_EMAIL: '  me@x.com \n',
      JIRA_API_TOKEN: 'tok\n',
    });
    await expect(svc.getIssueSummary('ab-12510')).resolves.toEqual({
      key: 'AB-12510',
      summary: 'Fix the thing',
      category: 'Opex', // null capex field -> Opex
    });
    const calls = fn.mock.calls as unknown as [string, RequestInit][];
    const issueCall = calls.find((c) => c[0].includes('/issue/'))!;
    expect(issueCall[0]).toBe(
      'https://x.jira.com/rest/api/3/issue/AB-12510?fields=summary,customfield_13821',
    );
    expect(issueCall[1].headers).toMatchObject({
      Authorization: `Basic ${Buffer.from('me@x.com:tok').toString('base64')}`,
    });
  });

  it('maps the Jira "Capex" field: Yes -> Capex, No -> Opex, missing -> Opex', async () => {
    const make = (capexValue: unknown) =>
      stubFetch({
        '/rest/api/3/field': () => json(CAPEX_FIELD),
        '/rest/api/3/issue/': () =>
          json({ fields: { summary: 'x', customfield_13821: capexValue } }),
      });
    const svc = new JiraService(ENV);

    make({ value: 'Yes', id: '11328' });
    expect((await svc.getIssueSummary('AB-1')).category).toBe('Capex');

    make({ value: 'No', id: '11329' });
    expect((await new JiraService(ENV).getIssueSummary('AB-2')).category).toBe('Opex');

    make(null);
    expect((await new JiraService(ENV).getIssueSummary('AB-3')).category).toBe('Opex');
  });

  it('category is null when the site has no "Capex" field', async () => {
    stubFetch({
      '/rest/api/3/field': () => json([{ id: 'customfield_1', name: 'Sprint' }]),
      '/rest/api/3/issue/': () => json({ fields: { summary: 'x' } }),
    });
    const svc = new JiraService(ENV);
    const issue = await svc.getIssueSummary('AB-1');
    expect(issue.category).toBeNull();
  });

  it('404 issue + authenticated /myself -> not-found', async () => {
    stubFetch({
      '/rest/api/3/field': () => json(CAPEX_FIELD),
      '/rest/api/3/myself': () => json({ displayName: 'Vihidun' }),
      '/rest/api/3/issue/': () =>
        json({ errorMessages: ['Issue does not exist or you do not have permission to see it.'] }, 404),
    });
    const svc = new JiraService(ENV);
    await expect(svc.getIssueSummary('AB-999')).rejects.toMatchObject({ status: 404 });
  });

  it('404 issue + 401 /myself -> auth failed', async () => {
    stubFetch({
      '/rest/api/3/field': () => json(CAPEX_FIELD),
      '/rest/api/3/myself': () => new Response('', { status: 401 }),
      '/rest/api/3/issue/': () => json({}, 404),
    });
    const svc = new JiraService(ENV);
    await expect(svc.getIssueSummary('AB-12510')).rejects.toMatchObject({ code: 'jira_auth_failed' });
  });

  it('HTML response -> jira_bad_base_url', async () => {
    stubFetch({
      '/rest/api/3/field': () => json(CAPEX_FIELD),
      '/rest/api/3/issue/': () =>
        new Response('<!DOCTYPE html><title>Page Unavailable</title>', {
          status: 404,
          headers: { 'content-type': 'text/html; charset=utf-8' },
        }),
    });
    const svc = new JiraService({ ...ENV, JIRA_BASE_URL: 'https://wrong.atlassian.net' });
    await expect(svc.getIssueSummary('AB-12510')).rejects.toMatchObject({ code: 'jira_bad_base_url' });
  });

  it('JSON 404 "site unavailable" (wrong tenant URL) -> jira_bad_base_url', async () => {
    stubFetch({
      '/rest/api/3/field': () => json(CAPEX_FIELD),
      '/rest/api/3/myself': () => json({ errorMessage: 'Site temporarily unavailable', errorCode: 'OTHER' }, 404),
      '/rest/api/3/issue/': () => json({ errorMessage: 'Site temporarily unavailable' }, 404),
    });
    const svc = new JiraService({ ...ENV, JIRA_BASE_URL: 'https://wrong.atlassian.net' });
    await expect(svc.getIssueSummary('AB-12510')).rejects.toMatchObject({ code: 'jira_bad_base_url' });
  });

  it('401 on the issue -> auth failed', async () => {
    stubFetch({
      '/rest/api/3/field': () => json(CAPEX_FIELD),
      '/rest/api/3/issue/': () => new Response('', { status: 401 }),
    });
    const svc = new JiraService(ENV);
    await expect(svc.getIssueSummary('AB-1')).rejects.toMatchObject({ code: 'jira_auth_failed' });
  });

  it('network error -> jira_unreachable', async () => {
    stubFetch({
      '/rest/api/3/field': () => json(CAPEX_FIELD),
      '/rest/api/3/issue/': () => {
        throw new Error('ECONNREFUSED');
      },
    });
    const svc = new JiraService(ENV);
    await expect(svc.getIssueSummary('AB-1')).rejects.toMatchObject({ code: 'jira_unreachable' });
  });
});

describe('JiraService — sprint import', () => {
  const SPRINTS = [
    { id: 2022, name: 'Iteration 205', state: 'active', startDate: '2026-08-17T10:30:00Z', endDate: '2026-09-04T21:30:00Z' },
    { id: 2023, name: 'Iteration 206', state: 'future' },
  ];

  it('needs JIRA_BOARD_ID', async () => {
    const svc = new JiraService({ ...ENV, JIRA_BOARD_ID: '' });
    await expect(svc.listSprints()).rejects.toMatchObject({ code: 'jira_no_board' });
  });

  it('lists sprints newest-first with date-only fields', async () => {
    stubFetch({
      '/board/27/sprint': () => json({ isLast: true, maxResults: 50, values: SPRINTS }),
    });
    const svc = new JiraService(ENV);
    const list = await svc.listSprints();
    expect(list.map((s) => s.name)).toEqual(['Iteration 206', 'Iteration 205']);
    expect(list[1]!.startDate).toBe('2026-08-17');
    expect(list[0]!.startDate).toBeNull();
  });

  it('imports a sprint: issues -> summary + Capex category + estimate hours', async () => {
    stubFetch({
      '/rest/api/3/field': () => json(CAPEX_FIELD),
      '/board/27/sprint': () => json({ isLast: true, values: SPRINTS }),
      '/sprint/2023/issue': () =>
        json({
          total: 2,
          issues: [
            {
              key: 'AB-11895',
              fields: {
                summary: 'Overall epic testing',
                issuetype: { name: 'Task' },
                timetracking: { originalEstimateSeconds: 216000 },
                customfield_13821: null,
              },
            },
            {
              key: 'AB-12138',
              fields: {
                summary: 'DB mismatch',
                issuetype: { name: 'Clarification' },
                timetracking: { originalEstimateSeconds: 90000 },
                customfield_13821: { value: 'Yes' },
              },
            },
          ],
        }),
    });
    const svc = new JiraService(ENV);
    const { sprint, issues } = await svc.getSprintImport('206');
    expect(sprint.name).toBe('Iteration 206');
    expect(issues).toEqual([
      { key: 'AB-11895', summary: 'Overall epic testing', category: 'Opex', estimateHours: 60, issueType: 'Task' },
      { key: 'AB-12138', summary: 'DB mismatch', category: 'Capex', estimateHours: 25, issueType: 'Clarification' },
    ]);
  });

  it('reports an unknown sprint with the available names', async () => {
    stubFetch({ '/board/27/sprint': () => json({ isLast: true, values: SPRINTS }) });
    const svc = new JiraService(ENV);
    await expect(svc.getSprintImport('999')).rejects.toMatchObject({ status: 404 });
  });
});
