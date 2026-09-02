import { describe, it, expect, beforeEach } from 'vitest';
import { makeInMemoryRepository } from '../repository/index.js';
import { RosterService } from './rosterService.js';
import { CalendarService } from './calendarService.js';
import { IterationService } from './iterationService.js';
import { TaskService } from './taskService.js';
import { AllocationService } from './allocationService.js';

function wire() {
  const repo = makeInMemoryRepository();
  const roster = new RosterService(repo);
  const calendars = new CalendarService(repo);
  const iterations = new IterationService(repo, roster, calendars);
  const tasks = new TaskService(repo, iterations);
  const allocation = new AllocationService(repo, iterations, tasks);
  return { repo, roster, calendars, iterations, tasks, allocation };
}

describe('IterationService', () => {
  let ctx: ReturnType<typeof wire>;
  beforeEach(() => {
    ctx = wire();
  });

  it('creates an iteration copying every active member and auto-adding SM Activity', () => {
    const sm = ctx.roster.listMembers().find((m) => m.name === 'Vihidun')!;
    ctx.roster.setScrumMaster(sm.id);

    const detail = ctx.iterations.createIteration({
      startDate: '2026-08-17',
      endDate: '2026-09-04',
    });

    expect(detail.iteration.number).toBe(1);
    expect(detail.participants).toHaveLength(11);
    const smExtra = detail.extraAssignments.find((e) => e.kind === 'sm-activity')!;
    expect(smExtra.opexHours).toBe(20);
    const smParticipant = detail.participants.find((p) => p.name === 'Vihidun')!;
    expect(smExtra.participantId).toBe(smParticipant.id);
  });

  it('auto-increments iteration numbers', () => {
    ctx.iterations.createIteration({ startDate: '2026-08-17', endDate: '2026-09-04' });
    const second = ctx.iterations.createIteration({ startDate: '2026-09-07', endDate: '2026-09-25' });
    expect(second.iteration.number).toBe(2);
  });

  it('past iterations are unaffected by later roster changes', () => {
    const it1 = ctx.iterations.createIteration({ startDate: '2026-08-17', endDate: '2026-09-04' });
    const before = ctx.iterations.computeCapacity(it1.iteration.id).devPoolAvailable;

    const arshad = ctx.roster.listMembers().find((m) => m.name === 'Arshad')!;
    ctx.roster.updateMember(arshad.id, { capacityPercent: 100 });

    const after = ctx.iterations.computeCapacity(it1.iteration.id).devPoolAvailable;
    expect(after).toBe(before); // frozen copy
  });

  it('a Malaysia holiday reduces ONLY Malaysia-group members', () => {
    // 2026-08-19 (Wed) is a Malaysia holiday; no Sri Lanka holidays.
    const myIcs = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//x//x//EN\r\nBEGIN:VEVENT\r\nUID:1\r\nSUMMARY:Merdeka\r\nDTSTART;VALUE=DATE:20260819\r\nDTEND;VALUE=DATE:20260820\r\nEND:VEVENT\r\nEND:VCALENDAR`;
    ctx.calendars.uploadCalendar('MY', 'my.ics', myIcs);

    const it = ctx.iterations.createIteration({ startDate: '2026-08-17', endDate: '2026-09-04' });
    const bd = ctx.iterations.computeCapacity(it.iteration.id).breakdowns;

    const arshad = bd.find((b) => b.name === 'Arshad')!; // MY
    const meng = bd.find((b) => b.name === 'Meng')!; // MY
    const prasanna = bd.find((b) => b.name === 'Prasanna')!; // SL
    const ishara = bd.find((b) => b.name === 'Ishara')!; // SL

    // 15 weekday dates in the window; MY members lose the one holiday, SL members do not.
    expect(arshad.netWorkingDays).toBe(14);
    expect(meng.netWorkingDays).toBe(14);
    expect(prasanna.netWorkingDays).toBe(15);
    expect(ishara.netWorkingDays).toBe(15);
  });

  it('leave >= working days zeroes ceremonies for that participant', () => {
    const it = ctx.iterations.createIteration({ startDate: '2026-08-17', endDate: '2026-09-04' });
    const p = ctx.iterations.participantsOf(it.iteration.id)[0]!;
    ctx.iterations.setParticipant(it.iteration.id, p.id, { personalLeaveDays: 15 });
    const b = ctx.iterations
      .computeCapacity(it.iteration.id)
      .breakdowns.find((x) => x.participantId === p.id)!;
    expect(b.ceremonyExcluded).toBe(true);
    expect(b.finalAvailable).toBe(0);
  });
});

describe('AllocationService', () => {
  let ctx: ReturnType<typeof wire>;
  let iterationId: string;
  beforeEach(() => {
    ctx = wire();
    iterationId = ctx.iterations.createIteration({
      startDate: '2026-08-17',
      endDate: '2026-09-04',
    }).iteration.id;
  });

  it('flags Over / Under / OK against the tolerance band', () => {
    const dev = ctx.iterations.participantsOf(iterationId).find((p) => p.role === 'Dev')!;
    const task = ctx.tasks.createTask(iterationId, { title: 'Big task', devEstimateH: 500 });
    ctx.tasks.assignTask(task.id, { devParticipantId: dev.id });

    const res = ctx.allocation.allocation(iterationId);
    const row = res.people.find((p) => p.participantId === dev.id)!;
    expect(row.allocated).toBe(500);
    expect(row.status).toBe('Over');
    expect(res.unassigned.qaHours).toBe(0);
  });

  it('reassigning a task moves the load to the other person', () => {
    const [d1, d2] = ctx.iterations.participantsOf(iterationId).filter((p) => p.role === 'Dev');
    const task = ctx.tasks.createTask(iterationId, { title: 'T', devEstimateH: 10 });
    ctx.tasks.assignTask(task.id, { devParticipantId: d1!.id });
    ctx.tasks.assignTask(task.id, { devParticipantId: d2!.id });
    const res = ctx.allocation.allocation(iterationId);
    expect(res.people.find((p) => p.participantId === d1!.id)!.allocated).toBe(0);
    expect(res.people.find((p) => p.participantId === d2!.id)!.allocated).toBe(10);
  });

  it('manual buffers count against the pool but not any person', () => {
    ctx.iterations.updateIteration(iterationId, { devBufferHours: 40 });
    const res = ctx.allocation.allocation(iterationId);
    expect(res.pools.dev.allocated).toBe(40);
  });

  it('rejects assigning a Dev task to a QA', () => {
    const qa = ctx.iterations.participantsOf(iterationId).find((p) => p.role === 'QA')!;
    const task = ctx.tasks.createTask(iterationId, { title: 'T', devEstimateH: 5 });
    expect(() => ctx.tasks.assignTask(task.id, { devParticipantId: qa.id })).toThrow();
  });
});
