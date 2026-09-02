import { nanoid } from 'nanoid';
import type { NewTask, Task, TaskAssignment, TaskPatch } from '@shared/types.js';
import type { Repository } from '../repository/index.js';
import { NotFoundError, assert } from '../errors.js';
import type { IterationService } from './iterationService.js';

export class TaskService {
  constructor(
    private readonly repo: Repository,
    private readonly iterations: IterationService,
  ) {}

  listTasks(iterationId: string): Task[] {
    this.iterations.getIterationRecord(iterationId);
    return this.repo.db.tasks.filter((t) => t.iterationId === iterationId);
  }

  getTask(taskId: string): Task {
    const t = this.repo.db.tasks.find((x) => x.id === taskId);
    if (!t) throw new NotFoundError('Task');
    return t;
  }

  createTask(iterationId: string, input: NewTask): Task {
    this.iterations.getIterationRecord(iterationId);
    assert(input.title && input.title.trim().length > 0, 'Task title is required');
    const dev = input.devEstimateH ?? 0;
    const qa = input.qaEstimateH ?? 0;
    assert(dev >= 0 && qa >= 0, 'Estimates must be >= 0');
    assert(
      input.category == null || input.category === 'Capex' || input.category === 'Opex',
      'Category must be Capex, Opex or none',
    );
    const task: Task = {
      id: nanoid(),
      iterationId,
      title: input.title.trim(),
      externalId: input.externalId?.trim() ?? '',
      devEstimateH: dev,
      qaEstimateH: qa,
      category: input.category ?? null,
      assignedDevParticipantId: null,
      assignedQaParticipantId: null,
      notes: input.notes?.trim() ?? '',
    };
    this.repo.db.tasks.push(task);
    void this.repo.save();
    return task;
  }

  updateTask(taskId: string, patch: TaskPatch): Task {
    const t = this.getTask(taskId);
    if (patch.title !== undefined) {
      assert(patch.title.trim().length > 0, 'Task title is required');
      t.title = patch.title.trim();
    }
    if (patch.externalId !== undefined) t.externalId = patch.externalId.trim();
    if (patch.devEstimateH !== undefined) {
      assert(patch.devEstimateH >= 0, 'Dev estimate must be >= 0');
      t.devEstimateH = patch.devEstimateH;
    }
    if (patch.qaEstimateH !== undefined) {
      assert(patch.qaEstimateH >= 0, 'QA estimate must be >= 0');
      t.qaEstimateH = patch.qaEstimateH;
    }
    if (patch.category !== undefined) {
      assert(
        patch.category == null || patch.category === 'Capex' || patch.category === 'Opex',
        'Category must be Capex, Opex or none',
      );
      t.category = patch.category;
    }
    if (patch.notes !== undefined) t.notes = patch.notes.trim();
    if (patch.assignedDevParticipantId !== undefined || patch.assignedQaParticipantId !== undefined) {
      this.assignTask(taskId, {
        devParticipantId: patch.assignedDevParticipantId ?? t.assignedDevParticipantId,
        qaParticipantId: patch.assignedQaParticipantId ?? t.assignedQaParticipantId,
      });
    }
    void this.repo.save();
    return this.getTask(taskId);
  }

  deleteTask(taskId: string): void {
    this.getTask(taskId);
    this.repo.db.tasks = this.repo.db.tasks.filter((t) => t.id !== taskId);
    void this.repo.save();
  }

  assignTask(taskId: string, assignment: TaskAssignment): Task {
    const t = this.getTask(taskId);

    if (assignment.devParticipantId) {
      const p = this.iterations.getParticipant(t.iterationId, assignment.devParticipantId);
      assert(p.role === 'Dev', 'The Dev side of a task must be assigned to a Dev');
      t.assignedDevParticipantId = p.id;
    } else if (assignment.devParticipantId === null) {
      t.assignedDevParticipantId = null;
    }

    if (assignment.qaParticipantId) {
      const p = this.iterations.getParticipant(t.iterationId, assignment.qaParticipantId);
      assert(p.role === 'QA', 'The QA side of a task must be assigned to a QA');
      t.assignedQaParticipantId = p.id;
    } else if (assignment.qaParticipantId === null) {
      t.assignedQaParticipantId = null;
    }

    void this.repo.save();
    return t;
  }
}
