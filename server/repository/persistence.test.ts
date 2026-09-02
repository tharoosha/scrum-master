import { describe, it, expect, afterEach } from 'vitest';
import { rm, mkdtemp } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Repository } from './index.js';
import { FileStore } from './fileStore.js';
import { CalendarService } from '../services/calendarService.js';
import { IterationService } from '../services/iterationService.js';
import { RosterService } from '../services/rosterService.js';
import { TaskService } from '../services/taskService.js';

const ICS = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//x//x//EN\r\nBEGIN:VEVENT\r\nUID:1\r\nSUMMARY:Poya\r\nDTSTART;VALUE=DATE:20260819\r\nDTEND;VALUE=DATE:20260820\r\nEND:VEVENT\r\nEND:VCALENDAR`;

let dir: string;
afterEach(async () => {
  if (dir) await rm(dir, { recursive: true, force: true });
});

function wire(repo: Repository) {
  const roster = new RosterService(repo);
  const calendars = new CalendarService(repo);
  const iterations = new IterationService(repo, roster, calendars);
  const tasks = new TaskService(repo, iterations);
  return { roster, calendars, iterations, tasks };
}

/** A fresh Repository on the same folder = "restart". */
async function open(folder: string) {
  const repo = new Repository(new FileStore(folder));
  await repo.load();
  return repo;
}

describe('multi-file persistence (FileStore)', () => {
  it('holiday calendars persist across restarts, keep an .ics file, and are reused for new iterations', async () => {
    dir = await mkdtemp(join(tmpdir(), 'planner-'));

    const repo1 = await open(dir);
    wire(repo1).calendars.uploadCalendar('SL', 'sl-2026.ics', ICS);
    await repo1.flush();
    expect(existsSync(join(dir, 'calendars', 'SL.ics'))).toBe(true);

    const repo2 = await open(dir);
    const svc2 = wire(repo2);
    const sl = svc2.calendars.getSummaries().find((s) => s.locationGroup === 'SL')!;
    expect(sl.eventCount).toBe(1);
    expect(sl.sourceFileName).toBe('sl-2026.ics');
    const it = svc2.iterations.createIteration({ startDate: '2026-08-17', endDate: '2026-09-04' });
    expect(it.iteration.holidayDatesSL).toContain('2026-08-19');
  });

  it('each iteration is stored in its own file named by number, and reloads after restart', async () => {
    dir = await mkdtemp(join(tmpdir(), 'planner-'));

    const repo1 = await open(dir);
    const s1 = wire(repo1);
    const a = s1.iterations.createIteration({ startDate: '2026-08-17', endDate: '2026-09-04' });
    const b = s1.iterations.createIteration({ startDate: '2026-09-07', endDate: '2026-09-25' });
    const devA = s1.iterations.participantsOf(a.iteration.id).find((p) => p.role === 'Dev')!;
    const task = s1.tasks.createTask(a.iteration.id, { title: 'AB-1', devEstimateH: 12 });
    s1.tasks.assignTask(task.id, { devParticipantId: devA.id });
    await repo1.flush();

    expect(existsSync(join(dir, 'iterations', `iteration-${a.iteration.number}.json`))).toBe(true);
    expect(existsSync(join(dir, 'iterations', `iteration-${b.iteration.number}.json`))).toBe(true);

    const repo2 = await open(dir);
    const s2 = wire(repo2);
    expect(s2.iterations.listIterations()).toHaveLength(2);
    const reloaded = s2.tasks.listTasks(a.iteration.id);
    expect(reloaded).toHaveLength(1);
    expect(reloaded[0]!.assignedDevParticipantId).toBe(devA.id);

    s2.iterations.deleteIteration(b.iteration.id);
    await repo2.flush();
    expect(existsSync(join(dir, 'iterations', `iteration-${b.iteration.number}.json`))).toBe(false);
  });

  it('renaming an iteration number renames its file', async () => {
    dir = await mkdtemp(join(tmpdir(), 'planner-'));
    const repo = await open(dir);
    const s = wire(repo);
    const it = s.iterations.createIteration({ number: 205, startDate: '2026-08-17', endDate: '2026-09-04' });
    await repo.flush();
    expect(existsSync(join(dir, 'iterations', 'iteration-205.json'))).toBe(true);
    s.iterations.updateIteration(it.iteration.id, { number: 206 });
    await repo.flush();
    expect(existsSync(join(dir, 'iterations', 'iteration-205.json'))).toBe(false);
    expect(existsSync(join(dir, 'iterations', 'iteration-206.json'))).toBe(true);
  });
});
