/**
 * Pure capacity engine. See functional-design/business-logic-model.md §3
 * and business-rules.md BR-CE*, BR-X*, BR-CAP*, BR-POOL*.
 */
import type {
  Settings,
  Role,
  PersonBreakdown,
  BufferConfig,
} from '@shared/types.js';
import { grossHours, netWorkingDays, personWorkingDays } from './workingDays.js';

export interface CapacityInput {
  participantId: string;
  name: string;
  role: Role;
  locationGroup: 'SL' | 'MY';
  /** working-day window */
  startDate: string;
  endDate: string;
  /** holiday dates for THIS participant's location group, already scoped to the iteration */
  holidayDates: readonly string[];
  personalLeaveDays: number;
  capacityPercent: number;
  additionalDevBuffer: boolean;
  /** sum of this participant's extra-assignment hours (capex + opex) */
  extraAssignmentHours: number;
}

/** Total buffer % of gross hours for a role, from the buffer config. */
export function totalBufferPercent(role: Role, cfg: BufferConfig): number {
  return Object.values(cfg)
    .filter((line) => line.appliesTo.includes(role))
    .reduce((sum, line) => sum + line.capexPct + line.opexPct, 0);
}

/** Capex / Opex % of gross hours for a role. */
export function bufferSplitPercent(
  role: Role,
  cfg: BufferConfig,
): { capexPct: number; opexPct: number } {
  const lines = Object.values(cfg).filter((line) => line.appliesTo.includes(role));
  return {
    capexPct: lines.reduce((s, l) => s + l.capexPct, 0),
    opexPct: lines.reduce((s, l) => s + l.opexPct, 0),
  };
}

export function personBreakdown(input: CapacityInput, settings: Settings): PersonBreakdown {
  const net = netWorkingDays(input.startDate, input.endDate, input.holidayDates);
  const pwd = personWorkingDays(net, input.personalLeaveDays);
  const gross = grossHours(pwd, settings.hoursPerDay);

  // BR-CE2: ceremonies auto-zero when leave covers the whole sprint.
  const ceremonyExcluded = net > 0 && input.personalLeaveDays >= net;
  const c = settings.ceremonies;
  const ceremonyDeduction = ceremonyExcluded
    ? 0
    : pwd * c.dailyScrumPerWorkingDay + c.planning + c.grooming + c.retro + c.demo;

  const bufferPercent = totalBufferPercent(input.role, settings.bufferConfig);
  const bufferDeduction = (gross * bufferPercent) / 100;

  const extraAssignmentHours = input.extraAssignmentHours;

  const remaining = Math.max(
    0,
    gross - ceremonyDeduction - bufferDeduction - extraAssignmentHours,
  );

  const capacityAdjusted = (remaining * input.capacityPercent) / 100;
  const finalAvailable = input.additionalDevBuffer
    ? (capacityAdjusted * settings.additionalDevBufferPercent) / 100
    : capacityAdjusted;

  return {
    participantId: input.participantId,
    name: input.name,
    role: input.role,
    locationGroup: input.locationGroup,
    netWorkingDays: net,
    personalLeaveDays: input.personalLeaveDays,
    personWorkingDays: pwd,
    grossHours: gross,
    ceremonyExcluded,
    ceremonyDeduction,
    bufferPercent,
    bufferDeduction,
    extraAssignmentHours,
    remaining,
    capacityPercent: input.capacityPercent,
    capacityAdjusted,
    additionalDevBuffer: input.additionalDevBuffer,
    finalAvailable,
  };
}

export function pools(breakdowns: readonly PersonBreakdown[]): {
  devPoolAvailable: number;
  qaPoolAvailable: number;
} {
  let devPoolAvailable = 0;
  let qaPoolAvailable = 0;
  for (const b of breakdowns) {
    if (b.role === 'Dev') devPoolAvailable += b.finalAvailable;
    else qaPoolAvailable += b.finalAvailable;
  }
  return { devPoolAvailable, qaPoolAvailable };
}

/** Round to 2 dp for display (BR-CAP7). Internal math stays full precision. */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
