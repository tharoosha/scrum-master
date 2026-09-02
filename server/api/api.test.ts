import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { buildTestServices } from '../container.js';
import { createApp } from './index.js';

function app() {
  return createApp(buildTestServices());
}

describe('HTTP API', () => {
  let a: ReturnType<typeof app>;
  beforeEach(() => {
    a = app();
  });

  it('GET /api/members returns the seed roster', async () => {
    const res = await request(a).get('/api/members');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(11);
  });

  it('validation errors map to 400', async () => {
    const res = await request(a).post('/api/members').send({ name: '', role: 'Dev' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('validation_error');
  });

  it('unknown iteration maps to 404', async () => {
    const res = await request(a).get('/api/iterations/nope/capacity');
    expect(res.status).toBe(404);
  });

  it('full flow: SM -> iteration -> task -> allocation', async () => {
    const members = (await request(a).get('/api/members')).body as { id: string; name: string; role: string }[];
    const sm = members.find((m) => m.name === 'Vihidun')!;
    await request(a).post(`/api/members/${sm.id}/scrum-master`).expect(200);

    const created = await request(a)
      .post('/api/iterations')
      .send({ startDate: '2026-08-17', endDate: '2026-09-04' })
      .expect(201);
    const iterationId = created.body.iteration.id as string;
    expect(created.body.participants).toHaveLength(11);

    const devParticipant = (created.body.participants as { id: string; role: string }[]).find(
      (p) => p.role === 'Dev',
    )!;

    const task = await request(a)
      .post(`/api/iterations/${iterationId}/tasks`)
      .send({ title: 'Do the thing', devEstimateH: 1000 })
      .expect(201);
    await request(a)
      .put(`/api/tasks/${task.body.id}/assign`)
      .send({ devParticipantId: devParticipant.id })
      .expect(200);

    const alloc = await request(a).get(`/api/iterations/${iterationId}/allocation`).expect(200);
    const row = (alloc.body.people as { participantId: string; status: string }[]).find(
      (p) => p.participantId === devParticipant.id,
    )!;
    expect(row.status).toBe('Over');
  });

  it('GET /api/jira/status reports not configured in tests', async () => {
    const res = await request(a).get('/api/jira/status');
    expect(res.status).toBe(200);
    expect(res.body.configured).toBe(false);
    expect(res.body.boardId).toBeNull();
  });

  it('POST /api/iterations/import-jira -> 501 when Jira is not configured', async () => {
    const res = await request(a).post('/api/iterations/import-jira').send({ sprintName: 'Iteration 206' });
    expect(res.status).toBe(501);
  });

  it('GET /api/jira/issue/:key returns 501 when Jira is not configured', async () => {
    const res = await request(a).get('/api/jira/issue/AB-12510');
    expect(res.status).toBe(501);
    expect(res.body.error).toBe('jira_not_configured');
  });

  it('GET /api/iterations/:id/export returns an xlsx', async () => {
    const created = await request(a)
      .post('/api/iterations')
      .send({ startDate: '2026-08-17', endDate: '2026-09-04' })
      .expect(201);
    const res = await request(a).get(`/api/iterations/${created.body.iteration.id}/export`).expect(200);
    expect(res.headers['content-type']).toContain('spreadsheetml');
    expect(res.body.length ?? res.text.length).toBeGreaterThan(0);
  });
});
