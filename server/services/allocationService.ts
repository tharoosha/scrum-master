import type {
  AllocationResult,
  CapexOpexSummary,
  PersonAllocation,
  AllocationStatus,
} from '../../shared/types.js';
import type { Repository } from '../repository/index.js';
import { bufferSplitPercent } from '../calc/capacityEngine.js';
import type { IterationService } from './iterationService.js';
import type { TaskService } from './taskService.js';

export class AllocationService {
  constructor(
    private readonly repo: Repository,
    private readonly iterations: IterationService,
    private readonly tasks: TaskService,
  ) {}

  allocation(iterationId: string): AllocationResult {
    const it = this.iterations.getIterationRecord(iterationId);
    const cap = this.iterations.computeCapacity(iterationId);
    const tasks = this.tasks.listTasks(iterationId);
    const tol = it.toleranceHours;

    const people: PersonAllocation[] = cap.breakdowns.map((b) => {
      const allocated =
        tasks
          .filter((t) => t.assignedDevParticipantId === b.participantId)
          .reduce((s, t) => s + t.devEstimateH, 0) +
        tasks
          .filter((t) => t.assignedQaParticipantId === b.participantId)
          .reduce((s, t) => s + t.qaEstimateH, 0);
      const remaining = b.finalAvailable - allocated;
      const status: AllocationStatus =
        remaining < -tol ? 'Over' : remaining > tol ? 'Under' : 'OK';
      return {
        participantId: b.participantId,
        name: b.name,
        role: b.role,
        locationGroup: b.locationGroup,
        available: b.finalAvailable,
        allocated,
        remaining,
        status,
      };
    });

    const unassigned = {
      devHours: tasks.filter((t) => !t.assignedDevParticipantId).reduce((s, t) => s + t.devEstimateH, 0),
      qaHours: tasks.filter((t) => !t.assignedQaParticipantId).reduce((s, t) => s + t.qaEstimateH, 0),
    };

    const devAssigned =
      tasks.filter((t) => t.assignedDevParticipantId).reduce((s, t) => s + t.devEstimateH, 0) +
      it.devBufferHours;
    const qaAssigned =
      tasks.filter((t) => t.assignedQaParticipantId).reduce((s, t) => s + t.qaEstimateH, 0) +
      it.qaBufferHours;

    return {
      iterationId,
      people,
      unassigned,
      pools: {
        dev: {
          available: cap.devPoolAvailable,
          allocated: devAssigned,
          remaining: cap.devPoolAvailable - devAssigned,
        },
        qa: {
          available: cap.qaPoolAvailable,
          allocated: qaAssigned,
          remaining: cap.qaPoolAvailable - qaAssigned,
        },
      },
      capexOpex: this.capexOpexSummary(iterationId),
    };
  }

  /** BR-CX — on-screen only. */
  capexOpexSummary(iterationId: string): CapexOpexSummary {
    const settings = this.repo.db.settings;
    const cap = this.iterations.computeCapacity(iterationId);
    const extras = this.iterations.extraAssignmentsOf(iterationId);
    const tasks = this.tasks.listTasks(iterationId);

    let bufferCapex = 0;
    let bufferOpex = 0;
    for (const b of cap.breakdowns) {
      const split = bufferSplitPercent(b.role, settings.bufferConfig);
      bufferCapex += (b.grossHours * split.capexPct) / 100;
      bufferOpex += (b.grossHours * split.opexPct) / 100;
    }

    const extraCapex = extras.reduce((s, e) => s + e.capexHours, 0);
    const extraOpex = extras.reduce((s, e) => s + e.opexHours, 0);

    const taskCapex = tasks
      .filter((t) => t.category === 'Capex')
      .reduce((s, t) => s + t.devEstimateH + t.qaEstimateH, 0);
    const taskOpex = tasks
      .filter((t) => t.category === 'Opex')
      .reduce((s, t) => s + t.devEstimateH + t.qaEstimateH, 0);

    const totalCapex = bufferCapex + extraCapex + taskCapex;
    const totalOpex = bufferOpex + extraOpex + taskOpex;
    const denom = totalCapex + totalOpex || 1;

    return {
      totalCapex,
      totalOpex,
      capexPct: (totalCapex / denom) * 100,
      opexPct: (totalOpex / denom) * 100,
      breakdown: { bufferCapex, bufferOpex, extraCapex, extraOpex, taskCapex, taskOpex },
    };
  }
}
