import { Repository, getRepository, makeInMemoryRepository } from './repository/index.js';
import { RosterService } from './services/rosterService.js';
import { SettingsService } from './services/settingsService.js';
import { CalendarService } from './services/calendarService.js';
import { IterationService } from './services/iterationService.js';
import { TaskService } from './services/taskService.js';
import { AllocationService } from './services/allocationService.js';
import { ReportService } from './services/reportService.js';
import { ExcelExportService } from './services/excelExportService.js';
import { JiraService } from './services/jiraService.js';
import { ImportService } from './services/importService.js';

export interface Services {
  repo: Repository;
  roster: RosterService;
  settings: SettingsService;
  calendars: CalendarService;
  iterations: IterationService;
  tasks: TaskService;
  allocation: AllocationService;
  reports: ReportService;
  excel: ExcelExportService;
  jira: JiraService;
  imports: ImportService;
}

export function buildServices(
  repo: Repository,
  jiraEnv: NodeJS.ProcessEnv = process.env,
): Services {
  const roster = new RosterService(repo);
  const settings = new SettingsService(repo);
  const calendars = new CalendarService(repo);
  const iterations = new IterationService(repo, roster, calendars);
  const tasks = new TaskService(repo, iterations);
  const allocation = new AllocationService(repo, iterations, tasks);
  const reports = new ReportService(repo, iterations, allocation);
  const excel = new ExcelExportService(repo, iterations, tasks, allocation);
  const jira = new JiraService(jiraEnv);
  const imports = new ImportService(jira, iterations, tasks);
  return { repo, roster, settings, calendars, iterations, tasks, allocation, reports, excel, jira, imports };
}

export async function buildProductionServices(): Promise<Services> {
  return buildServices(await getRepository());
}

/** For integration tests — in-memory repo, seeded roster, Jira disabled. */
export function buildTestServices(): Services {
  return buildServices(makeInMemoryRepository(), {});
}
