import { nanoid } from 'nanoid';
import type {
  CapacityResult,
  ExtraAssignment,
  ExtraAssignmentKind,
  ExtraAssignmentPatch,
  Iteration,
  IterationDetail,
  IterationParticipant,
  IterationSummary,
  NewExtraAssignment,
  NewIteration,
  ParticipantPatch,
  PersonBreakdown,
} from '../../shared/types.js';
import type { Repository } from '../repository/index.js';
import { NotFoundError, assert } from '../errors.js';
import { personBreakdown, pools } from '../calc/capacityEngine.js';
import type { RosterService } from './rosterService.js';
import type { CalendarService } from './calendarService.js';

export class IterationService {
  constructor(
    private readonly repo: Repository,
    private readonly roster: RosterService,
    private readonly calendars: CalendarService,
  ) {}

  // ---- queries -----------------------------------------------------------

  listIterations(): IterationSummary[] {
    return [...this.repo.db.iterations]
      .sort((a, b) => b.number - a.number)
      .map((it) => {
        const cap = this.computeCapacity(it.id);
        return {
          id: it.id,
          number: it.number,
          startDate: it.startDate,
          endDate: it.endDate,
          participantCount: this.participantsOf(it.id).filter((p) => p.included).length,
          devPoolAvailable: cap.devPoolAvailable,
          qaPoolAvailable: cap.qaPoolAvailable,
        };
      });
  }

  getIterationRecord(id: string): Iteration {
    const it = this.repo.db.iterations.find((x) => x.id === id);
    if (!it) throw new NotFoundError('Iteration');
    return it;
  }

  getIteration(id: string): IterationDetail {
    return {
      iteration: this.getIterationRecord(id),
      participants: this.participantsOf(id),
      extraAssignments: this.extraAssignmentsOf(id),
    };
  }

  participantsOf(iterationId: string): IterationParticipant[] {
    return this.repo.db.iterationParticipants
      .filter((p) => p.iterationId === iterationId)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  extraAssignmentsOf(iterationId: string): ExtraAssignment[] {
    return this.repo.db.extraAssignments.filter((e) => e.iterationId === iterationId);
  }

  getParticipant(iterationId: string, participantId: string): IterationParticipant {
    const p = this.repo.db.iterationParticipants.find(
      (x) => x.id === participantId && x.iterationId === iterationId,
    );
    if (!p) throw new NotFoundError('Participant');
    return p;
  }

  // ---- creation --------------------------------------------------------

  createIteration(input: NewIteration): IterationDetail {
    assert(input.startDate && input.endDate, 'Start and end dates are required');
    assert(input.endDate >= input.startDate, 'End date must be on or after the start date');

    const latest = [...this.repo.db.iterations].sort((a, b) => b.number - a.number)[0];
    const number = input.number ?? (latest ? latest.number + 1 : 1);
    assert(Number.isInteger(number) && number >= 1, 'Iteration number must be a positive integer');

    const settings = this.repo.db.settings;
    const iteration: Iteration = {
      id: nanoid(),
      number,
      startDate: input.startDate,
      endDate: input.endDate,
      toleranceHours: settings.defaultToleranceHours,
      devBufferHours: 0,
      qaBufferHours: 0,
      holidayDatesSL: this.calendars.holidayDatesInRange('SL', input.startDate, input.endDate),
      holidayDatesMY: this.calendars.holidayDatesInRange('MY', input.startDate, input.endDate),
      createdAt: new Date().toISOString(),
    };
    this.repo.db.iterations.push(iteration);

    for (const m of this.roster.listMembers({ activeOnly: true })) {
      this.repo.db.iterationParticipants.push({
        id: nanoid(),
        iterationId: iteration.id,
        sourceMemberId: m.id,
        name: m.name,
        role: m.role,
        locationGroup: m.locationGroup,
        capacityPercent: m.capacityPercent,
        additionalDevBuffer: m.additionalDevBuffer,
        isScrumMaster: m.isScrumMaster,
        personalLeaveDays: 0,
        included: true,
      });
    }

    const sm = this.participantsOf(iteration.id).find((p) => p.isScrumMaster);
    if (sm) {
      this.repo.db.extraAssignments.push({
        id: nanoid(),
        iterationId: iteration.id,
        participantId: sm.id,
        kind: 'sm-activity',
        label: 'SM Activity',
        capexHours: 0,
        opexHours: settings.smActivityHours,
      });
    }

    void this.repo.save();
    return this.getIteration(iteration.id);
  }

  // ---- edits ----------------------------------------------------------

  updateIteration(
    id: string,
    patch: Partial<Pick<Iteration, 'number' | 'startDate' | 'endDate' | 'toleranceHours' | 'devBufferHours' | 'qaBufferHours'>>,
  ): IterationDetail {
    const it = this.getIterationRecord(id);
    const start = patch.startDate ?? it.startDate;
    const end = patch.endDate ?? it.endDate;
    assert(end >= start, 'End date must be on or after the start date');
    if (patch.number !== undefined)
      assert(Number.isInteger(patch.number) && patch.number >= 1, 'Iteration number must be a positive integer');
    for (const k of ['toleranceHours', 'devBufferHours', 'qaBufferHours'] as const) {
      if (patch[k] !== undefined) assert((patch[k] as number) >= 0, `${k} must be >= 0`);
    }

    const datesChanged = patch.startDate !== undefined || patch.endDate !== undefined;
    Object.assign(it, patch, { startDate: start, endDate: end });
    if (datesChanged) {
      it.holidayDatesSL = this.calendars.holidayDatesInRange('SL', start, end);
      it.holidayDatesMY = this.calendars.holidayDatesInRange('MY', start, end);
    }
    void this.repo.save();
    return this.getIteration(id);
  }

  setParticipant(
    iterationId: string,
    participantId: string,
    patch: ParticipantPatch,
  ): IterationParticipant {
    const p = this.getParticipant(iterationId, participantId);

    if (patch.personalLeaveDays !== undefined) {
      assert(
        patch.personalLeaveDays >= 0 && Number.isFinite(patch.personalLeaveDays),
        'Leave days must be >= 0',
      );
      assert(
        Math.round(patch.personalLeaveDays * 2) === patch.personalLeaveDays * 2,
        'Leave days must be in 0.5 increments',
      );
      p.personalLeaveDays = patch.personalLeaveDays;
    }
    if (patch.capacityPercent !== undefined) {
      assert(patch.capacityPercent >= 1 && patch.capacityPercent <= 100, 'Capacity % 1..100');
      p.capacityPercent = patch.capacityPercent;
    }
    if (patch.additionalDevBuffer !== undefined) p.additionalDevBuffer = patch.additionalDevBuffer;
    if (patch.included !== undefined) p.included = patch.included;

    if (patch.isScrumMaster === true) {
      for (const other of this.participantsOf(iterationId)) other.isScrumMaster = other.id === p.id;
      // move the sm-activity extra assignment to the new SM
      const sm = this.repo.db.extraAssignments.find(
        (e) => e.iterationId === iterationId && e.kind === 'sm-activity',
      );
      if (sm) sm.participantId = p.id;
      else
        this.repo.db.extraAssignments.push({
          id: nanoid(),
          iterationId,
          participantId: p.id,
          kind: 'sm-activity',
          label: 'SM Activity',
          capexHours: 0,
          opexHours: this.repo.db.settings.smActivityHours,
        });
    }
    void this.repo.save();
    return p;
  }

  // ---- extra assignments --------------------------------------------

  addExtraAssignment(iterationId: string, input: NewExtraAssignment): ExtraAssignment {
    this.getIterationRecord(iterationId);
    const participant = this.getParticipant(iterationId, input.participantId);
    const s = this.repo.db.settings;

    const defaults: Record<ExtraAssignmentKind, { label: string; capexHours: number; opexHours: number }> = {
      'sm-activity': { label: 'SM Activity', capexHours: 0, opexHours: s.smActivityHours },
      'maui-review': { label: 'MAUI Review', capexHours: 0, opexHours: s.defaultMauiReviewHours },
      'common-automation': {
        label: 'Common Automation',
        capexHours: s.commonAutomation.capexHours,
        opexHours: s.commonAutomation.opexHours,
      },
      custom: { label: input.label ?? 'Extra', capexHours: 0, opexHours: 0 },
    };
    const d = defaults[input.kind];
    if (input.kind === 'common-automation')
      assert(participant.role === 'QA', 'Common Automation must be assigned to a QA');
    if (input.kind === 'sm-activity')
      assert(
        !this.extraAssignmentsOf(iterationId).some((e) => e.kind === 'sm-activity'),
        'SM Activity already exists for this iteration',
      );

    const rec: ExtraAssignment = {
      id: nanoid(),
      iterationId,
      participantId: input.participantId,
      kind: input.kind,
      label: input.label ?? d.label,
      capexHours: input.capexHours ?? d.capexHours,
      opexHours: input.opexHours ?? d.opexHours,
    };
    assert(rec.capexHours >= 0 && rec.opexHours >= 0, 'Hours must be >= 0');
    this.repo.db.extraAssignments.push(rec);
    void this.repo.save();
    return rec;
  }

  updateExtraAssignment(iterationId: string, id: string, patch: ExtraAssignmentPatch): ExtraAssignment {
    const rec = this.repo.db.extraAssignments.find((e) => e.id === id && e.iterationId === iterationId);
    if (!rec) throw new NotFoundError('Extra assignment');
    if (patch.participantId) {
      this.getParticipant(iterationId, patch.participantId);
      rec.participantId = patch.participantId;
    }
    if (patch.label !== undefined) rec.label = patch.label;
    if (patch.capexHours !== undefined) {
      assert(patch.capexHours >= 0, 'capexHours >= 0');
      rec.capexHours = patch.capexHours;
    }
    if (patch.opexHours !== undefined) {
      assert(patch.opexHours >= 0, 'opexHours >= 0');
      rec.opexHours = patch.opexHours;
    }
    void this.repo.save();
    return rec;
  }

  deleteExtraAssignment(iterationId: string, id: string): void {
    const rec = this.repo.db.extraAssignments.find((e) => e.id === id && e.iterationId === iterationId);
    if (!rec) throw new NotFoundError('Extra assignment');
    assert(rec.kind !== 'sm-activity', 'SM Activity cannot be removed (reassign the Scrum Master instead)');
    this.repo.db.extraAssignments = this.repo.db.extraAssignments.filter((e) => e.id !== id);
    void this.repo.save();
  }

  // ---- capacity -----------------------------------------------------

  computeCapacity(iterationId: string): CapacityResult {
    const it = this.getIterationRecord(iterationId);
    const settings = this.repo.db.settings;
    const extras = this.extraAssignmentsOf(iterationId);

    const breakdowns: PersonBreakdown[] = this.participantsOf(iterationId)
      .filter((p) => p.included)
      .map((p) => {
        const extraHours = extras
          .filter((e) => e.participantId === p.id)
          .reduce((sum, e) => sum + e.capexHours + e.opexHours, 0);
        return personBreakdown(
          {
            participantId: p.id,
            name: p.name,
            role: p.role,
            locationGroup: p.locationGroup,
            startDate: it.startDate,
            endDate: it.endDate,
            holidayDates: p.locationGroup === 'MY' ? it.holidayDatesMY : it.holidayDatesSL,
            personalLeaveDays: p.personalLeaveDays,
            capacityPercent: p.capacityPercent,
            additionalDevBuffer: p.additionalDevBuffer,
            extraAssignmentHours: extraHours,
          },
          settings,
        );
      });

    const { devPoolAvailable, qaPoolAvailable } = pools(breakdowns);
    return {
      iterationId,
      breakdowns,
      devPoolAvailable,
      qaPoolAvailable,
      devBufferHours: it.devBufferHours,
      qaBufferHours: it.qaBufferHours,
    };
  }

  deleteIteration(id: string): void {
    this.getIterationRecord(id);
    this.repo.db.iterations = this.repo.db.iterations.filter((x) => x.id !== id);
    this.repo.db.iterationParticipants = this.repo.db.iterationParticipants.filter(
      (x) => x.iterationId !== id,
    );
    this.repo.db.extraAssignments = this.repo.db.extraAssignments.filter((x) => x.iterationId !== id);
    this.repo.db.tasks = this.repo.db.tasks.filter((x) => x.iterationId !== id);
    void this.repo.save();
  }
}
