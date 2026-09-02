import type {
  Settings,
  TeamMember,
  HolidayCalendar,
  Iteration,
  IterationParticipant,
  ExtraAssignment,
  Task,
} from '@shared/types.js';
import { DEFAULT_SETTINGS } from '@shared/constants.js';

/**
 * In-memory aggregate the services work against. On disk it is split
 * (see repository/index.ts):
 *   data/planner.json                    -> version, settings, teamMembers, holidayCalendars
 *   data/iterations/iteration-<n>.json   -> one file per iteration:
 *                                           { iteration, participants, extraAssignments, tasks }
 */
export interface DbData {
  version: number;
  settings: Settings;
  teamMembers: TeamMember[];
  holidayCalendars: HolidayCalendar[];
  iterations: Iteration[];
  iterationParticipants: IterationParticipant[];
  extraAssignments: ExtraAssignment[];
  tasks: Task[];
}

/** The per-iteration file shape. */
export interface IterationFile {
  iteration: Iteration;
  participants: IterationParticipant[];
  extraAssignments: ExtraAssignment[];
  tasks: Task[];
}

/** The master file shape. Raw .ics text is stored in data/calendars/<loc>.ics, not here. */
export interface MasterFile {
  version: number;
  settings: Settings;
  teamMembers: TeamMember[];
  holidayCalendars: Omit<HolidayCalendar, 'rawIcs'>[];
}

export const DB_VERSION = 1;

export function emptyDb(): DbData {
  return {
    version: DB_VERSION,
    settings: structuredClone(DEFAULT_SETTINGS),
    teamMembers: [],
    holidayCalendars: [],
    iterations: [],
    iterationParticipants: [],
    extraAssignments: [],
    tasks: [],
  };
}
