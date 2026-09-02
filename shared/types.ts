/**
 * Shared domain + API types for the Balancer Sprint Planner.
 * Imported by both server/ and web/. See:
 *   aidlc-docs/construction/sprint-planner/functional-design/domain-entities.md
 */

export type LocationGroup = 'SL' | 'MY';
export type Role = 'Dev' | 'QA';
export type ExpenseCategory = 'Capex' | 'Opex';
export type ExtraAssignmentKind =
  | 'sm-activity'
  | 'maui-review'
  | 'common-automation'
  | 'custom';
export type AllocationStatus = 'Over' | 'Under' | 'OK';

// ---------------------------------------------------------------------------
// Settings (singleton)
// ---------------------------------------------------------------------------

export interface BufferLineConfig {
  /** % of the person's gross hours, capitalised as capex */
  capexPct: number;
  /** % of the person's gross hours, treated as opex */
  opexPct: number;
  /** roles this buffer line applies to */
  appliesTo: Role[];
}

export interface BufferConfig {
  discussion: BufferLineConfig;
  devBuffer: BufferLineConfig;
  buffer: BufferLineConfig;
  commonQa: BufferLineConfig;
}

export interface CeremonyConfig {
  /** hours of daily scrum per working day (0.25 = 15 min) */
  dailyScrumPerWorkingDay: number;
  planning: number;
  grooming: number;
  retro: number;
  demo: number;
}

export interface Settings {
  hoursPerDay: number;
  defaultCapacityPercent: number;
  defaultToleranceHours: number;
  ceremonies: CeremonyConfig;
  smActivityHours: number;
  defaultMauiReviewHours: number;
  commonAutomation: { capexHours: number; opexHours: number };
  bufferConfig: BufferConfig;
  additionalDevBufferPercent: number;
}

// ---------------------------------------------------------------------------
// Master roster
// ---------------------------------------------------------------------------

export interface TeamMember {
  id: string;
  name: string;
  role: Role;
  locationGroup: LocationGroup;
  capacityPercent: number;
  additionalDevBuffer: boolean;
  isScrumMaster: boolean;
  active: boolean;
}

export type NewTeamMember = Omit<TeamMember, 'id' | 'isScrumMaster' | 'active'> &
  Partial<Pick<TeamMember, 'isScrumMaster' | 'active'>>;

// ---------------------------------------------------------------------------
// Holiday calendars
// ---------------------------------------------------------------------------

export interface HolidayEvent {
  /** YYYY-MM-DD */
  date: string;
  summary: string;
}

export interface HolidayCalendar {
  locationGroup: LocationGroup;
  sourceFileName: string;
  uploadedAt: string;
  events: HolidayEvent[];
  rawIcs: string;
}

export interface CalendarSummary {
  locationGroup: LocationGroup;
  sourceFileName: string | null;
  uploadedAt: string | null;
  eventCount: number;
  minDate: string | null;
  maxDate: string | null;
}

// ---------------------------------------------------------------------------
// Iteration + participants + extra assignments + tasks
// ---------------------------------------------------------------------------

export interface Iteration {
  id: string;
  number: number;
  startDate: string;
  endDate: string;
  toleranceHours: number;
  devBufferHours: number;
  qaBufferHours: number;
  holidayDatesSL: string[];
  holidayDatesMY: string[];
  createdAt: string;
}

export interface NewIteration {
  number?: number;
  startDate: string;
  endDate: string;
}

export interface IterationParticipant {
  id: string;
  iterationId: string;
  sourceMemberId: string;
  name: string;
  role: Role;
  locationGroup: LocationGroup;
  capacityPercent: number;
  additionalDevBuffer: boolean;
  isScrumMaster: boolean;
  personalLeaveDays: number;
  included: boolean;
}

export type ParticipantPatch = Partial<
  Pick<
    IterationParticipant,
    | 'capacityPercent'
    | 'additionalDevBuffer'
    | 'isScrumMaster'
    | 'personalLeaveDays'
    | 'included'
  >
>;

export interface ExtraAssignment {
  id: string;
  iterationId: string;
  participantId: string;
  kind: ExtraAssignmentKind;
  label: string;
  capexHours: number;
  opexHours: number;
}

export interface NewExtraAssignment {
  participantId: string;
  kind: ExtraAssignmentKind;
  label?: string;
  capexHours?: number;
  opexHours?: number;
}

export type ExtraAssignmentPatch = Partial<
  Pick<ExtraAssignment, 'participantId' | 'label' | 'capexHours' | 'opexHours'>
>;

export interface Task {
  id: string;
  iterationId: string;
  title: string;
  externalId: string;
  devEstimateH: number;
  qaEstimateH: number;
  category: ExpenseCategory | null;
  assignedDevParticipantId: string | null;
  assignedQaParticipantId: string | null;
  notes: string;
}

export interface NewTask {
  title: string;
  externalId?: string;
  devEstimateH?: number;
  qaEstimateH?: number;
  category?: ExpenseCategory | null;
  notes?: string;
}

export type TaskPatch = Partial<Omit<Task, 'id' | 'iterationId'>>;

export interface TaskAssignment {
  devParticipantId?: string | null;
  qaParticipantId?: string | null;
}

// ---------------------------------------------------------------------------
// Computed / response DTOs
// ---------------------------------------------------------------------------

export interface PersonBreakdown {
  participantId: string;
  name: string;
  role: Role;
  locationGroup: LocationGroup;
  netWorkingDays: number;
  personalLeaveDays: number;
  personWorkingDays: number;
  grossHours: number;
  ceremonyExcluded: boolean;
  ceremonyDeduction: number;
  bufferPercent: number;
  bufferDeduction: number;
  extraAssignmentHours: number;
  remaining: number;
  capacityPercent: number;
  capacityAdjusted: number;
  additionalDevBuffer: boolean;
  finalAvailable: number;
}

export interface CapacityResult {
  iterationId: string;
  breakdowns: PersonBreakdown[];
  devPoolAvailable: number;
  qaPoolAvailable: number;
  devBufferHours: number;
  qaBufferHours: number;
}

export interface PersonAllocation {
  participantId: string;
  name: string;
  role: Role;
  locationGroup: LocationGroup;
  available: number;
  allocated: number;
  remaining: number;
  status: AllocationStatus;
}

export interface PoolRow {
  available: number;
  allocated: number;
  remaining: number;
}

export interface CapexOpexSummary {
  totalCapex: number;
  totalOpex: number;
  capexPct: number;
  opexPct: number;
  breakdown: {
    bufferCapex: number;
    bufferOpex: number;
    extraCapex: number;
    extraOpex: number;
    taskCapex: number;
    taskOpex: number;
  };
}

export interface AllocationResult {
  iterationId: string;
  people: PersonAllocation[];
  unassigned: { devHours: number; qaHours: number };
  pools: { dev: PoolRow; qa: PoolRow };
  capexOpex: CapexOpexSummary;
}

export interface IterationDetail {
  iteration: Iteration;
  participants: IterationParticipant[];
  extraAssignments: ExtraAssignment[];
}

export interface IterationSummary {
  id: string;
  number: number;
  startDate: string;
  endDate: string;
  participantCount: number;
  devPoolAvailable: number;
  qaPoolAvailable: number;
}

export interface ReportRow {
  iterationId: string;
  number: number;
  startDate: string;
  endDate: string;
  devPoolCapacity: number;
  qaPoolCapacity: number;
  devPoolAllocated: number;
  qaPoolAllocated: number;
  overCount: number;
  underCount: number;
}

export interface ApiError {
  error: string;
  message: string;
  details?: unknown;
}

export interface JiraIssueSummary {
  key: string;
  summary: string;
  /** From the Jira "Capex" field: "Yes" -> Capex, "No"/blank -> Opex, unknown -> null */
  category: ExpenseCategory | null;
}

export interface JiraStatus {
  configured: boolean;
  baseUrl: string | null;
  authenticated: boolean;
  accountLabel: string | null;
  /** set when configured but the connection/credentials don't work */
  problem: string | null;
  /** the agile board the sprint import reads from (JIRA_BOARD_ID) */
  boardId: number | null;
}

export interface JiraSprint {
  id: number;
  name: string;
  state: 'active' | 'future' | 'closed' | string;
  startDate: string | null; // YYYY-MM-DD
  endDate: string | null;
}

export interface JiraImportIssue {
  key: string;
  summary: string;
  category: ExpenseCategory | null;
  estimateHours: number;
  issueType: string;
}

export interface JiraSprintImport {
  sprint: JiraSprint;
  issues: JiraImportIssue[];
}

export interface ImportJiraRequest {
  sprintName: string;
  startDate?: string;
  endDate?: string;
}
