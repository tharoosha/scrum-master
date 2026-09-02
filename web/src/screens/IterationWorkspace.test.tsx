import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type {
  AllocationResult,
  CapacityResult,
  IterationDetail,
  Task,
} from '@shared/types.js';

/**
 * Mutable fake backend: changing a participant's leave changes what
 * getCapacity() returns next time — exactly the user scenario
 * "change leave in the People tab, Capacity tab adjusts".
 */
const state = {
  leaveByName: { Arshad: 0, Prasanna: 0 } as Record<string, number>,
};

function makeDetail(): IterationDetail {
  return {
    iteration: {
      id: 'it1',
      number: 6,
      startDate: '2026-08-17',
      endDate: '2026-09-04',
      toleranceHours: 4,
      devBufferHours: 0,
      qaBufferHours: 0,
      holidayDatesSL: [],
      holidayDatesMY: [],
      createdAt: '',
    },
    participants: [mkP('p-Arshad', 'Arshad', 'Dev', 'MY'), mkP('p-Prasanna', 'Prasanna', 'Dev', 'SL')],
    extraAssignments: [],
  };
}
function mkP(id: string, name: string, role: 'Dev' | 'QA', lg: 'SL' | 'MY') {
  return {
    id,
    iterationId: 'it1',
    sourceMemberId: id,
    name,
    role,
    locationGroup: lg,
    capacityPercent: 90,
    additionalDevBuffer: false,
    isScrumMaster: false,
    personalLeaveDays: state.leaveByName[name] ?? 0,
    included: true,
  };
}
function makeCapacity(): CapacityResult {
  const breakdowns = Object.entries(state.leaveByName).map(([name, leave]) => {
    const pwd = 15 - leave;
    const gross = pwd * 7;
    return {
      participantId: 'p-' + name,
      name,
      role: 'Dev' as const,
      locationGroup: 'SL' as const,
      netWorkingDays: 15,
      personalLeaveDays: leave,
      personWorkingDays: pwd,
      grossHours: gross,
      ceremonyExcluded: false,
      ceremonyDeduction: pwd * 0.25 + 5,
      bufferPercent: 16.5,
      bufferDeduction: gross * 0.165,
      extraAssignmentHours: 0,
      remaining: gross - (pwd * 0.25 + 5) - gross * 0.165,
      capacityPercent: 90,
      capacityAdjusted: 0,
      additionalDevBuffer: false,
      finalAvailable: (gross - (pwd * 0.25 + 5) - gross * 0.165) * 0.9,
    };
  });
  return {
    iterationId: 'it1',
    breakdowns,
    devPoolAvailable: breakdowns.reduce((s, b) => s + b.finalAvailable, 0),
    qaPoolAvailable: 0,
    devBufferHours: 0,
    qaBufferHours: 0,
  };
}
const emptyAllocation: AllocationResult = {
  iterationId: 'it1',
  people: [],
  unassigned: { devHours: 0, qaHours: 0 },
  pools: {
    dev: { available: 0, allocated: 0, remaining: 0 },
    qa: { available: 0, allocated: 0, remaining: 0 },
  },
  capexOpex: {
    totalCapex: 0,
    totalOpex: 0,
    capexPct: 0,
    opexPct: 0,
    breakdown: { bufferCapex: 0, bufferOpex: 0, extraCapex: 0, extraOpex: 0, taskCapex: 0, taskOpex: 0 },
  },
};

vi.mock('../api/client.js', () => ({
  api: {
    getIteration: vi.fn(async () => makeDetail()),
    getCapacity: vi.fn(async () => makeCapacity()),
    getAllocation: vi.fn(async () => emptyAllocation),
    listTasks: vi.fn(async (): Promise<Task[]> => []),
    setParticipant: vi.fn(async (_i: string, pid: string, patch: { personalLeaveDays?: number }) => {
      if (patch.personalLeaveDays !== undefined) {
        const name = pid.replace('p-', '');
        state.leaveByName[name] = patch.personalLeaveDays;
      }
      return mkP(pid, pid.replace('p-', ''), 'Dev', 'SL');
    }),
    createTask: vi.fn(async () => ({}) as never),
    lookupJira: vi.fn(async (key: string) => {
      if (key === 'AB-12510')
        return {
          key: 'AB-12510',
          summary: 'Database Performance optimization',
          category: 'Capex' as const,
        };
      throw new Error('Jira issue not found');
    }),
    exportUrl: () => '/x',
  },
}));

import { IterationWorkspace } from './IterationWorkspace.js';
import { ToastProvider } from '../ui/kit.js';

const renderWs = () =>
  render(
    <ToastProvider>
      <IterationWorkspace iterationId="it1" onClosed={() => {}} />
    </ToastProvider>,
  );

describe('IterationWorkspace — leave change flows to the Capacity tab', () => {
  beforeEach(() => {
    state.leaveByName = { Arshad: 0, Prasanna: 0 };
    vi.clearAllMocks();
  });

  it('typing a Jira key on the Tasks tab auto-fills the title', async () => {
    renderWs();
    await screen.findByTestId('participants-table');
    await userEvent.click(screen.getByTestId('tab-tasks'));

    const idInput = await screen.findByTestId('new-task-external-id');
    await userEvent.type(idInput, 'AB-12510');
    await userEvent.tab(); // blur -> lookup

    await waitFor(() =>
      expect(screen.getByTestId('new-task-title')).toHaveValue('Database Performance optimization'),
    );
    // Capex/Opex comes from Jira's Capex field too
    expect(screen.getByTestId('new-task-category')).toHaveValue('Capex');
  });

  it('a failed Jira lookup keeps the ID and shows a note (title stays blank)', async () => {
    renderWs();
    await screen.findByTestId('participants-table');
    await userEvent.click(screen.getByTestId('tab-tasks'));

    const idInput = await screen.findByTestId('new-task-external-id');
    await userEvent.type(idInput, 'AB-99999');
    await userEvent.tab();

    await waitFor(() => expect(screen.getByTestId('jira-note')).toBeInTheDocument());
    expect(screen.getByTestId('new-task-external-id')).toHaveValue('AB-99999');
    expect(screen.getByTestId('new-task-title')).toHaveValue('');
  });

  it('editing leave on People tab updates the Capacity tab numbers', async () => {
    renderWs();
    await screen.findByTestId('participants-table');

    // Capacity BEFORE: Arshad gross = 15*7 = 105
    await userEvent.click(screen.getByTestId('tab-capacity'));
    const rowBefore = await screen.findByTestId('capacity-row-Arshad');
    expect(within(rowBefore).getByText('105')).toBeInTheDocument();

    // Change Arshad's leave to 5 on the People tab
    await userEvent.click(screen.getByTestId('tab-people'));
    const leaveInput = screen.getByTestId('leave-Arshad');
    await userEvent.clear(leaveInput);
    await userEvent.type(leaveInput, '5');
    await userEvent.tab(); // blur -> commit

    // Capacity AFTER: gross = (15-5)*7 = 70
    await userEvent.click(screen.getByTestId('tab-capacity'));
    const rowAfter = await screen.findByTestId('capacity-row-Arshad');
    await waitFor(() => expect(within(rowAfter).getByText('70')).toBeInTheDocument());
  });
});
