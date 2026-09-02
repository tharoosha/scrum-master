import type { ImportJiraRequest, IterationDetail, JiraSprint } from '../../shared/types.js';
import { ConflictError, ValidationError, assert } from '../errors.js';
import type { IterationService } from './iterationService.js';
import type { TaskService } from './taskService.js';
import type { JiraService } from './jiraService.js';

export interface ImportResult {
  iteration: IterationDetail;
  sprint: JiraSprint;
  importedTaskCount: number;
  /** issues whose estimate was 0 / missing (title still imported) */
  withoutEstimate: number;
}

/** Friday of the 3rd week from a Monday start (start + 18 days). */
function suggestEnd(startIso: string): string {
  const d = new Date(startIso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + 18);
  return d.toISOString().slice(0, 10);
}

/** ImportService — creates an iteration from a Jira sprint and its issues. */
export class ImportService {
  constructor(
    private readonly jira: JiraService,
    private readonly iterations: IterationService,
    private readonly tasks: TaskService,
  ) {}

  /** Preview a sprint without creating anything (for the import dialog). */
  async previewSprint(sprintName: string) {
    return this.jira.getSprintImport(sprintName);
  }

  listSprints() {
    return this.jira.listSprints();
  }

  async importSprint(req: ImportJiraRequest): Promise<ImportResult> {
    assert(req.sprintName?.trim(), 'sprintName is required');
    const { sprint, issues } = await this.jira.getSprintImport(req.sprintName);

    // Iteration number = trailing integer in the sprint name ("Iteration 206" -> 206).
    const m = /(\d+)\s*$/.exec(sprint.name);
    if (!m) {
      throw new ValidationError(
        `Can't derive an iteration number from the sprint name "${sprint.name}" — rename the sprint or create the iteration manually`,
      );
    }
    const number = Number(m[1]);

    if (this.iterations.listIterations().some((i) => i.number === number)) {
      throw new ConflictError(
        `Iteration ${number} already exists — delete it first, then re-import`,
      );
    }

    const startDate = req.startDate ?? sprint.startDate ?? null;
    let endDate = req.endDate ?? sprint.endDate ?? null;
    if (!startDate) {
      throw new ValidationError(
        `Sprint "${sprint.name}" has no start date in Jira — provide startDate (and endDate) with the import`,
      );
    }
    if (!endDate) endDate = suggestEnd(startDate);

    const detail = this.iterations.createIteration({ number, startDate, endDate });

    let withoutEstimate = 0;
    for (const issue of issues) {
      if (issue.estimateHours <= 0) withoutEstimate += 1;
      this.tasks.createTask(detail.iteration.id, {
        title: issue.summary,
        externalId: issue.key,
        // Jira has a single "Original Estimate" — imported as Dev hours; split Dev/QA in the tool.
        devEstimateH: issue.estimateHours,
        qaEstimateH: 0,
        category: issue.category,
      });
    }

    return {
      iteration: this.iterations.getIteration(detail.iteration.id),
      sprint,
      importedTaskCount: issues.length,
      withoutEstimate,
    };
  }
}
