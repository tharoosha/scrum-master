import { describe, it, expect, beforeEach } from 'vitest';
import { RosterService } from './rosterService.js';
import { makeInMemoryRepository } from '../repository/index.js';

describe('RosterService', () => {
  let svc: RosterService;
  beforeEach(() => {
    svc = new RosterService(makeInMemoryRepository());
  });

  it('seeds 11 members with Arshad at 70% + additional dev buffer', () => {
    const members = svc.listMembers();
    expect(members).toHaveLength(11);
    const arshad = members.find((m) => m.name === 'Arshad')!;
    expect(arshad.capacityPercent).toBe(70);
    expect(arshad.additionalDevBuffer).toBe(true);
    expect(arshad.locationGroup).toBe('MY');
    expect(members.filter((m) => m.role === 'QA').map((m) => m.name).sort()).toEqual([
      'Charitha',
      'Ishara',
      'Sandun',
    ]);
  });

  it('seeds Vihidun as the default Scrum Master', () => {
    const sm = svc.getScrumMaster();
    expect(sm?.name).toBe('Vihidun');
    expect(svc.listMembers().filter((m) => m.isScrumMaster)).toHaveLength(1);
  });

  it('enforces a single Scrum Master', () => {
    const members = svc.listMembers();
    const a = members[0]!;
    const b = members[1]!;
    svc.setScrumMaster(a.id);
    expect(svc.getScrumMaster()?.id).toBe(a.id);
    svc.setScrumMaster(b.id);
    const withFlag = svc.listMembers().filter((m) => m.isScrumMaster);
    expect(withFlag).toHaveLength(1);
    expect(withFlag[0]!.id).toBe(b.id);
  });

  it('rejects invalid members and duplicate active names', () => {
    expect(() => svc.createMember({ name: '', role: 'Dev', locationGroup: 'SL' } as never)).toThrow();
    expect(() =>
      svc.createMember({ name: 'Arshad', role: 'Dev', locationGroup: 'MY' } as never),
    ).toThrow(/already exists/);
  });

  it('deactivating clears the SM flag', () => {
    const a = svc.listMembers()[0]!;
    svc.setScrumMaster(a.id);
    svc.deactivateMember(a.id);
    expect(svc.getScrumMaster()).toBeNull();
    expect(svc.listMembers({ activeOnly: true })).toHaveLength(10);
  });
});
