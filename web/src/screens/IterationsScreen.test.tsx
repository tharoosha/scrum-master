import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { IterationDetail, JiraSprint, JiraStatus } from '@shared/types.js';

const sprints: JiraSprint[] = [
  { id: 2022, name: 'Iteration 205', state: 'active', startDate: '2026-08-17', endDate: '2026-09-04' },
  { id: 2023, name: 'Iteration 206', state: 'future', startDate: null, endDate: null },
];

const status: JiraStatus = {
  configured: true,
  authenticated: true,
  baseUrl: 'https://x.jira.com',
  accountLabel: 'Vihidun',
  problem: null,
  boardId: 27,
};

vi.mock('../api/client.js', () => ({
  api: {
    listIterations: vi.fn(async () => []),
    jiraStatus: vi.fn(async () => status),
    listSprints: vi.fn(async () => sprints),
    previewSprint: vi.fn(async (name: string) => ({
      sprint: sprints.find((s) => s.name === name)!,
      issues: [
        { key: 'AB-1', summary: 'a', category: 'Opex', estimateHours: 10, issueType: 'Task' },
        { key: 'AB-2', summary: 'b', category: 'Capex', estimateHours: 0, issueType: 'Bug' },
      ],
    })),
    importSprint: vi.fn(async () => ({
      iteration: { iteration: { id: 'it206', number: 206 }, participants: [], extraAssignments: [] } as unknown as IterationDetail,
      sprint: sprints[1],
      importedTaskCount: 2,
      withoutEstimate: 1,
    })),
    deleteIteration: vi.fn(),
    createIteration: vi.fn(),
  },
}));

import { api } from '../api/client.js';
import { IterationsScreen } from './IterationsScreen.js';
import { ToastProvider } from '../ui/kit.js';

const renderScreen = (onOpen = vi.fn()) =>
  render(
    <ToastProvider>
      <IterationsScreen onOpen={onOpen} />
    </ToastProvider>,
  );

describe('IterationsScreen — import from Jira', () => {
  beforeEach(() => vi.clearAllMocks());

  it('imports the selected sprint and opens it', async () => {
    const onOpen = vi.fn();
    renderScreen(onOpen);

    await userEvent.click(await screen.findByTestId('import-jira'));
    // sprint dropdown gets populated; default = first future sprint (206)
    await waitFor(() => expect(screen.getByTestId('jira-sprint-select')).toHaveValue('Iteration 206'));

    // future sprint has no Jira dates -> fill them in
    await userEvent.type(screen.getByTestId('jira-import-start'), '2026-09-07');
    await userEvent.type(screen.getByTestId('jira-import-end'), '2026-09-25');
    await userEvent.click(screen.getByTestId('do-import'));

    await waitFor(() => expect(api.importSprint).toHaveBeenCalled());
    expect(onOpen).toHaveBeenCalledWith('it206');
  });

  it('previews issue counts', async () => {
    renderScreen();
    await userEvent.click(await screen.findByTestId('import-jira'));
    await screen.findByTestId('jira-sprint-select');
    await userEvent.click(screen.getByText('Preview'));
    await waitFor(() => expect(screen.getByTestId('jira-preview')).toHaveTextContent('2 issues'));
    expect(screen.getByTestId('jira-preview')).toHaveTextContent('1 have an estimate');
  });
});
